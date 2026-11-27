type Release = {
  tag_name: string;
  assets: { name: string; state: string; browser_download_url: string }[];
};

const repository = 'antvis/Sive';
const installerNames = {
  mac: (version: string) => [
    `Sive-${version}-macOS-arm64.dmg`,
    `Sive-${version}-macOS-arm64.zip`,
    'Sive-macOS-arm64.zip',
  ],
  windows: (version: string) => [`Sive-${version}-Windows-x64-Setup.exe`, 'Sive-Windows-x64.zip'],
};

async function getInstallerUrl(platform: keyof typeof installerNames) {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    cache: 'no-store',
  });
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

  const release: Release = await response.json();
  const names = installerNames[platform](release.tag_name.slice(1));
  const downloadBase = `https://github.com/${repository}/releases/download/${encodeURIComponent(release.tag_name)}/`;
  for (const name of names) {
    const url = downloadBase + name;
    if (
      release.assets.some(
        (asset) => asset.name === name && asset.state === 'uploaded' && asset.browser_download_url === url,
      )
    ) {
      return url;
    }
  }
}

export function initInstallerDownloads() {
  const feedback = document.querySelector<HTMLElement>('#installer-feedback')!;
  for (const platform of ['mac', 'windows'] as const) {
    for (const button of document.querySelectorAll<HTMLButtonElement>(`[data-installer="${platform}"]`)) {
      const status = button.querySelector<HTMLElement>('.installer-status')!;
      button.addEventListener('click', async () => {
        if (button.getAttribute('aria-disabled') === 'true') return;
        button.setAttribute('aria-disabled', 'true');
        status.textContent = feedback.textContent = '正在获取';
        status.hidden = false;

        let message = '';
        try {
          const url = await getInstallerUrl(platform);
          if (url) window.location.assign(url);
          else message = '待上线';
        } catch (error) {
          console.warn('Download link unavailable', error);
          message = '暂不可下载';
        } finally {
          button.removeAttribute('aria-disabled');
          status.textContent = feedback.textContent = message;
          status.hidden = !message;
        }
      });
    }
  }
}
