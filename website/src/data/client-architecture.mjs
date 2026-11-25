export async function detectMacArchitecture(userAgentData = globalThis.navigator?.userAgentData) {
  if (userAgentData?.platform?.toLowerCase() !== 'macos' || typeof userAgentData.getHighEntropyValues !== 'function') return null;

  try {
    const hints = await userAgentData.getHighEntropyValues(['architecture', 'bitness']);
    if (hints.bitness !== '64') return null;
    if (hints.architecture === 'arm') return 'macos-arm64';
    if (hints.architecture === 'x86') return 'macos-x86_64';
  } catch {
    return null;
  }

  return null;
}
