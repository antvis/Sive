export function detectDevice({
  userAgent = '',
  platform = '',
  architecture = '',
  bitness = '',
  maxTouchPoints = 0,
} = {}) {
  const identity = `${platform} ${userAgent}`;
  let system = 'unknown';

  if (/HarmonyOS|OpenHarmony/i.test(identity)) {
    system = /Mobile|Android/i.test(identity) ? 'harmony-mobile' : 'harmony-desktop';
  } else if (/iPhone|iPad|iPod/i.test(identity) || (/Mac/i.test(platform) && maxTouchPoints > 1)) {
    system = 'ios';
  } else if (/Android/i.test(identity)) {
    system = 'android';
  } else if (/Mac/i.test(identity)) {
    system = 'mac';
  } else if (/Win/i.test(identity)) {
    system = 'windows';
  } else if (/Linux/i.test(identity)) {
    system = 'linux';
  }

  // MacIntel is also reported by Apple silicon browsers; trust CPU hints only.
  const arch =
    /arm/i.test(architecture) && bitness === '64'
      ? 'arm64'
      : /x86/i.test(architecture) && bitness === '64'
        ? 'x64'
        : 'unknown';

  return { platform: system, architecture: arch };
}
