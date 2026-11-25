import {
  BatteryFullIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleUserRoundIcon,
  HeartIcon,
  LoaderCircleIcon,
  LogOutIcon,
  MessageCircleIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  ShareIcon,
  SignalIcon,
  StarIcon,
  WifiIcon,
} from 'lucide-react';
import { Avatar } from 'radix-ui';
import { useEffect, useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SnippetShareInput, SnippetShareLogin } from '@shared/api';
import { cn } from '../../lib/utils';
import { errorMessage } from '../../utils';
import { Button } from '../Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

// Match xiaohongshu-mcp: ASCII counts as half; other UTF-16 units count as one.
function getTitleLength(title: string) {
  let length = 0;
  for (let index = 0; index < title.length; index++) {
    length += title.charCodeAt(index) > 127 ? 2 : 1;
  }
  return Math.ceil(length / 2);
}

export function XiaohongshuPreview({
  post,
  onChange,
  onPublishingChange,
  onClose,
}: {
  post: SnippetShareInput;
  onChange: (post: SnippetShareInput) => void;
  onPublishingChange: (publishing: boolean) => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState('');
  const [login, setLogin] = useState<SnippetShareLogin | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState<'login' | 'logout' | 'publish' | null>('login');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const publishing = busy === 'publish';
  const titleLength = getTitleLength(post.title.trim());
  const invalidTitle = titleLength > 20;

  useLayoutEffect(() => {
    if (!viewport) return;

    const resize = () => setScale(Math.min(1, viewport.clientWidth / 387, viewport.clientHeight / 824));
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    return () => observer.disconnect();
  }, [viewport]);

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([post.image], { type: 'image/png' }));
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [post.image]);

  useEffect(() => {
    let active = true;
    setBusy('login');
    setLogin(null);
    setExpired(false);
    setError('');
    void window.workbench
      .snippetShareLogin()
      .then((result) => {
        if (active) setLogin(result);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setBusy(null);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (!login?.qrcode || login.loggedIn) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (!active) return;
      if (login.expiresAt && Date.now() >= login.expiresAt) {
        setExpired(true);
        return;
      }
      try {
        const status = await window.workbench.snippetShareStatus();
        if (!active) return;
        setError('');
        if (status.loggedIn) setLogin(status);
        else timer = setTimeout(() => void check(), 5000);
      } catch (cause) {
        if (active) {
          setError(errorMessage(cause));
          timer = setTimeout(() => void check(), 5000);
        }
      }
    };
    timer = setTimeout(() => void check(), 5000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [login]);

  useEffect(() => {
    if (!login?.loggedIn) return;
    let active = true;
    void window.workbench
      .snippetShareProfile()
      .then((profile) => {
        if (active) {
          setLogin((current) =>
            current?.loggedIn
              ? { ...current, ...profile, username: profile.username || current.username }
              : current,
          );
        }
      })
      .catch(() => {
        // Optional profile details must not prevent sharing with a logged-in account.
      });
    return () => {
      active = false;
    };
  }, [login?.loggedIn]);

  const logout = async (switchAccount: boolean) => {
    if (busy) return;
    setBusy('logout');
    setError('');
    try {
      await window.workbench.snippetShareLogout();
      setLogin({ loggedIn: false });
      if (switchAccount) setAttempt((current) => current + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (busy || !login?.loggedIn) return;
    setBusy('publish');
    onPublishingChange(true);
    setError('');
    try {
      await window.workbench.snippetShare(post);
      toast.success('已发布到小红书');
      onClose();
    } catch (cause) {
      setConfirming(false);
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
      onPublishingChange(false);
    }
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-6">
        <div ref={setViewport} className="relative min-h-0 overflow-hidden rounded-xl bg-page">
          <div
            role="region"
            aria-label="小红书笔记预览"
            className="absolute top-1/2 left-1/2 flex h-[824px] w-[387px] flex-col overflow-hidden rounded-[44px] border-[6px] border-neutral-800! bg-white text-neutral-800 shadow-lg"
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
              fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
            }}
          >
            <div
              aria-hidden
              className="flex h-[44px] shrink-0 items-center justify-between px-7 text-[15px] font-semibold"
            >
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <SignalIcon size={17} />
                <WifiIcon size={18} />
                <BatteryFullIcon size={24} />
              </span>
            </div>
            <div className="flex h-[52px] shrink-0 items-center gap-2 px-3">
              <ChevronLeftIcon size={26} aria-hidden />
              <Avatar.Root className="flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full">
                <Avatar.Image
                  src={login?.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
                <Avatar.Fallback>
                  <CircleUserRoundIcon size={34} className="text-neutral-400" aria-hidden />
                </Avatar.Fallback>
              </Avatar.Root>
              <span className="min-w-0 flex-1 truncate text-[14px]">{login?.username || '小红书账号'}</span>
              <span
                aria-hidden
                className="rounded-full border border-[#ff2442]! px-4 py-1 text-[13px] text-[#ff2442]"
              >
                关注
              </span>
              <ShareIcon size={26} className="ml-1" aria-hidden />
            </div>
            <div
              tabIndex={0}
              aria-label="笔记内容"
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-300"
            >
              <div className="bg-neutral-100">
                {preview && (
                  <img
                    src={preview}
                    alt="将发布到小红书的 Snippet 卡片"
                    className="block max-h-[500px] w-full object-contain"
                  />
                )}
              </div>
              <div className="px-4 pt-4 pb-5">
                <p className="m-0 text-[17px] leading-[26px] font-semibold whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {post.title}
                </p>
                <p className="mt-2.5 mb-4 text-[15px] leading-[25px] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {post.content}
                </p>
                <div
                  aria-hidden
                  className="flex items-center justify-between border-b border-neutral-100! pb-4 text-[11px] text-neutral-400"
                >
                  <span>刚刚</span>
                  <SearchIcon size={15} />
                </div>
                <p aria-hidden className="mt-5 mb-0 text-center text-[12px] text-neutral-400">
                  还没有评论，来说两句吧
                </p>
              </div>
            </div>
            <div aria-hidden className="shrink-0 border-t border-neutral-100! px-3 pt-3">
              <div className="flex items-center gap-4">
                <span className="flex flex-1 items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-2 text-[12px] text-neutral-500">
                  <PencilIcon size={16} />
                  说点什么…
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <HeartIcon size={24} />
                  点赞
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <StarIcon size={24} />
                  收藏
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <MessageCircleIcon size={24} />
                  评论
                </span>
              </div>
              <div className="flex h-[30px] items-end justify-center pb-2">
                <span className="h-1 w-32 rounded-full bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm">
            <div className={cn('shrink-0 border-b p-3', invalidTitle && 'border-danger/40! bg-danger/5')}>
              <label
                htmlFor="xiaohongshu-title"
                className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground"
              >
                笔记标题
                <span
                  id="xiaohongshu-title-length"
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-normal tabular-nums',
                    invalidTitle && 'bg-danger/10 font-medium text-danger',
                  )}
                >
                  {titleLength} / 20
                </span>
              </label>
              <textarea
                id="xiaohongshu-title"
                aria-label="小红书标题"
                value={post.title}
                rows={2}
                disabled={publishing || confirming}
                aria-invalid={invalidTitle}
                aria-describedby={
                  invalidTitle
                    ? 'xiaohongshu-title-length xiaohongshu-title-error'
                    : 'xiaohongshu-title-length'
                }
                onChange={(event) => onChange({ ...post, title: event.target.value })}
                placeholder="给这份发现起个标题"
                className="mt-1 block h-14 w-full resize-none rounded-md border border-transparent! bg-transparent px-1 py-1 text-base leading-6 font-medium text-ink outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
              />
              {invalidTitle && (
                <p
                  id="xiaohongshu-title-error"
                  role="alert"
                  className="mt-1 mb-0 flex items-center gap-1 text-xs text-danger"
                >
                  <CircleAlertIcon size={14} className="shrink-0" aria-hidden />
                  超出 {titleLength - 20} 个字，请精简后发布
                </p>
              )}
            </div>
            <label className="flex min-h-0 flex-1 flex-col gap-2 p-3 text-xs font-medium text-muted-foreground">
              <span className="flex items-center justify-between gap-2">
                正文
                <span className="font-normal tabular-nums">{Array.from(post.content).length} 字</span>
              </span>
              <textarea
                aria-label="小红书正文"
                value={post.content}
                rows={6}
                disabled={publishing || confirming}
                placeholder="写下你的数据发现…"
                onChange={(event) => onChange({ ...post, content: event.target.value })}
                className="min-h-10 w-full flex-1 resize-none rounded-md border border-transparent! bg-transparent px-1 py-1 text-sm leading-6 font-normal text-ink outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
              />
            </label>
          </div>
          <div className="shrink-0 rounded-xl border bg-page p-3">
            {busy === 'login' || busy === 'logout' ? (
              <div role="status" className="flex items-center gap-3 text-muted-foreground">
                <LoaderCircleIcon size={24} className="shrink-0 motion-safe:animate-spin" aria-hidden />
                <div className="min-w-0">
                  <p className="m-0 text-xs font-medium text-ink">
                    {busy === 'logout' ? '正在退出登录…' : '正在连接小红书…'}
                  </p>
                  {busy === 'login' && (
                    <p className="mt-1 mb-0 text-xs text-pretty">首次连接可能需要一些时间</p>
                  )}
                </div>
              </div>
            ) : login?.loggedIn ? (
              <div className="flex items-center gap-2.5">
                <Avatar.Root className="flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <Avatar.Image
                    src={login.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                  <Avatar.Fallback>
                    <CircleUserRoundIcon size={34} className="text-muted-foreground" aria-hidden />
                  </Avatar.Fallback>
                </Avatar.Root>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-medium">{login.username || '小红书账号'}</p>
                  <p
                    role="status"
                    className="mt-1 mb-0 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
                  >
                    <CircleCheckIcon size={12} aria-hidden />
                    已登录
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      aria-label="管理小红书账号"
                      disabled={publishing || confirming}
                      className="px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      管理
                      <ChevronDownIcon size={12} aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 min-w-40 border bg-surface text-ink shadow-lg"
                  >
                    <DropdownMenuItem onSelect={() => void logout(true)} className="cursor-pointer">
                      <RefreshCwIcon size={16} aria-hidden />
                      切换账号
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-line" />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => void logout(false)}
                      className="cursor-pointer text-danger focus:text-danger"
                    >
                      <LogOutIcon size={16} aria-hidden />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {login?.qrcode && !expired ? (
                  <img
                    src={login.qrcode}
                    alt="小红书登录二维码"
                    className="size-24 shrink-0 rounded-lg bg-white p-1"
                  />
                ) : (
                  <CircleUserRoundIcon size={32} className="shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <p role="status" className="m-0 text-xs font-medium">
                    {expired ? '二维码已过期' : login?.qrcode ? '小红书 App 扫码登录' : '未登录小红书'}
                  </p>
                  <Button
                    variant="ghost"
                    className="min-h-7 px-0 text-xs hover:bg-transparent hover:text-accent"
                    onClick={() => setAttempt((current) => current + 1)}
                  >
                    {login?.qrcode ? '刷新二维码' : '扫码登录'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 mb-0 text-sm text-pretty text-danger">
          {error}
        </p>
      )}
      <div
        aria-busy={publishing}
        className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t pt-4"
      >
        {publishing ? (
          <div role="status" className="mr-auto flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-page text-ink">
              <LoaderCircleIcon size={26} className="motion-safe:animate-spin" aria-hidden />
            </span>
            <div>
              <p className="m-0 text-sm font-medium">正在发布到小红书</p>
              <p className="mt-1 mb-0 text-xs text-pretty text-muted-foreground">
                通常需要几十秒，请保持窗口打开
              </p>
            </div>
          </div>
        ) : (
          confirming && (
            <p role="status" className="m-0 mr-auto text-xs text-pretty text-muted-foreground">
              {`确认发布到${login?.username ? `「${login.username}」` : '当前小红书账号'}？笔记将公开可见。`}
            </p>
          )
        )}
        {confirming && !publishing && <Button onClick={() => setConfirming(false)}>返回编辑</Button>}
        <Button
          variant="primary"
          className="h-10 bg-ink! px-4 text-surface! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled={!!busy || !login?.loggedIn || !post.title.trim() || invalidTitle || !post.content.trim()}
          onClick={() => (confirming ? void publish() : setConfirming(true))}
        >
          {publishing && <LoaderCircleIcon size={16} className="motion-safe:animate-spin" aria-hidden />}
          {publishing ? '发布中…' : confirming ? '确认发布' : '发布到小红书'}
        </Button>
      </div>
    </>
  );
}
