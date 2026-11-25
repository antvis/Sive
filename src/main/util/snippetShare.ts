import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { app, nativeImage, net } from 'electron';
import { snippetShareSchema } from '@shared/api';
import type { SnippetShareInput, SnippetShareLogin } from '@shared/api';

const VERSION = 'v2.7.5';
const RELEASE_URL = `https://github.com/xpzouying/xiaohongshu-mcp/releases/download/${VERSION}`;
const BINARIES: Record<string, { name: string; sha256: string }> = {
  'darwin-arm64': {
    name: 'xiaohongshu-mcp-darwin-arm64',
    sha256: '287f60d41a5984ea2225e2054c142cbde77011513bf669eea6a09351f02947af',
  },
  'win32-x64': {
    name: 'xiaohongshu-mcp-windows-amd64.exe',
    sha256: '7b61184cb00a1161a93465aad3c7d96efbd1ab0bbe3ed7bab4b4802c5885f267',
  },
  'linux-x64': {
    name: 'xiaohongshu-mcp-linux-amd64',
    sha256: 'fff7df5ab83926626ba3eb78817e77d7c7d0dba5dba3b3af5809ec6a93791e08',
  },
};

let serviceProcess: ChildProcess | undefined;
let connection: Promise<{ url: string; token: string }> | undefined;
let publishing = false;

async function prepareBinary(directory: string) {
  const binary = BINARIES[`${process.platform}-${process.arch}`];
  if (!binary) throw new Error('小红书分享暂不支持当前系统架构。');

  const filePath = path.join(directory, VERSION, binary.name);
  let bytes: Buffer;
  let downloaded = false;
  try {
    bytes = await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const response = await net.fetch(`${RELEASE_URL}/${binary.name}`, {
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok) throw new Error('下载小红书分享组件失败，请稍后重试。');
    bytes = Buffer.from(await response.arrayBuffer());
    downloaded = true;
  }
  if (createHash('sha256').update(bytes).digest('hex') !== binary.sha256) {
    throw new Error('小红书分享组件校验失败。');
  }
  if (downloaded) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(`${filePath}.download`, bytes, { mode: 0o700 });
    await rename(`${filePath}.download`, filePath);
  }
  await chmod(filePath, 0o700);
  return filePath;
}

async function startService() {
  // Keep the executable, login cookies, and browser temporary files in local user data.
  const directory = path.join(app.getPath('userData'), 'xiaohongshu');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const binaryPath = await prepareBinary(directory);
  const browserTempDirectory = path.join(directory, 'tmp');
  await mkdir(browserTempDirectory, { recursive: true });

  // Launch the service on an available loopback port with a per-process access token.
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address() as { port: number };
  await new Promise<void>((resolve) => listener.close(() => resolve()));

  const url = `http://127.0.0.1:${port}`;
  const token = randomBytes(32).toString('hex');
  const child = spawn(binaryPath, ['-headless=true', `-port=127.0.0.1:${port}`], {
    cwd: directory,
    env: {
      ...process.env,
      AUTH_TOKEN: token,
      COOKIES_PATH: path.join(directory, 'cookies.json'),
      TMPDIR: browserTempDirectory,
      TMP: browserTempDirectory,
      TEMP: browserTempDirectory,
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  serviceProcess = child;
  let startupError: Error | undefined;
  child.once('error', (error) => {
    startupError = error;
  });
  child.once('exit', () => {
    if (serviceProcess === child) {
      serviceProcess = undefined;
      connection = undefined;
    }
  });

  try {
    // The upstream process prepares its browser before opening the HTTP listener.
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      if (startupError || child.exitCode !== null || child.signalCode !== null) {
        throw new Error('小红书分享组件启动失败，请稍后重试。');
      }
      try {
        const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) return { url, token };
      } catch {
        // The listener is unavailable while the browser is being downloaded.
      }
      await setTimeout(500);
    }
    throw new Error('准备小红书分享组件超时，请检查网络后重试。');
  } catch (error) {
    child.kill();
    throw error;
  }
}

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  // Concurrent requests share the same startup promise; a failed startup can be retried.
  connection ??= startService().catch((error) => {
    connection = undefined;
    throw error;
  });
  const { url, token } = await connection;
  const isPublish = endpoint === 'publish';
  let response: Response;
  let result: { success?: boolean; data: T; error?: string; details?: string };
  try {
    response = await fetch(`${url}/api/v1/${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(isPublish ? 180000 : 60000),
    });
    result = await response.json();
  } catch {
    throw new Error(
      isPublish ? '发布结果尚未确认，请先到小红书检查，避免重复发布。' : '小红书暂时没有响应，请稍后重试。',
    );
  }
  if (!response.ok || !result.success) {
    throw new Error(result.details || result.error || '小红书操作失败，请稍后重试。');
  }
  return result.data;
}

export async function getSnippetShareStatus(): Promise<SnippetShareLogin> {
  const result = await request<{ is_logged_in: boolean; username?: string }>('login/status');
  return { loggedIn: result.is_logged_in, username: result.username };
}

export async function getSnippetShareProfile() {
  const { data } = await request<{
    data: { userBasicInfo: { nickname?: string; imageb?: string; images?: string } };
  }>('user/me');
  const { userBasicInfo } = data;
  return { username: userBasicInfo.nickname, avatarUrl: userBasicInfo.imageb || userBasicInfo.images };
}

export async function getSnippetShareLogin(): Promise<SnippetShareLogin> {
  const status = await getSnippetShareStatus();
  if (status.loggedIn) return status;

  const result = await request<{ is_logged_in: boolean; img?: string }>('login/qrcode');
  return {
    loggedIn: result.is_logged_in,
    qrcode: result.img,
    // The pinned upstream version keeps QR login sessions open for four minutes.
    expiresAt: result.is_logged_in ? undefined : Date.now() + 4 * 60 * 1000,
  };
}

export async function logoutSnippetShare() {
  if (publishing) throw new Error('正在发布，请稍后再退出登录。');
  await request('login/cookies', 'DELETE');
}

export async function shareSnippet(input: SnippetShareInput) {
  if (publishing) throw new Error('正在发布，请勿重复提交。');
  const { image, title, content } = snippetShareSchema.parse(input);
  const png = nativeImage.createFromBuffer(Buffer.from(image));
  if (png.isEmpty()) throw new Error('无法读取 Snippet 图片，请重新生成。');

  publishing = true;
  let temporaryDirectory: string | undefined;
  try {
    temporaryDirectory = await mkdtemp(path.join(app.getPath('temp'), 'sive-xiaohongshu-'));
    const imagePath = path.join(temporaryDirectory, 'snippet.png');
    await writeFile(imagePath, png.toPNG());
    await request('publish', 'POST', { title, content, images: [imagePath], visibility: '公开可见' });
  } finally {
    publishing = false;
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

app.on('will-quit', () => serviceProcess?.kill());
