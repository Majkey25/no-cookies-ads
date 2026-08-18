import BraveRules from '../lib/brave-rules.js';

export const BRAVE_SOURCE_COMMIT = 'bfb339cbc456ea471e58c8c392d571bc326133fb';

const SOURCE_PATHS = Object.freeze([
  'brave-lists/brave-specific.txt',
  'brave-lists/brave-firstparty.txt',
  'brave-lists/brave-firstparty-regional.txt',
  'brave-lists/brave-cookie-specific.txt'
]);

export async function downloadBraveAdditions(fetchSource = fetch) {
  const sourceTexts = await Promise.all(SOURCE_PATHS.map(async (sourcePath) => {
    const url = `https://raw.githubusercontent.com/brave/adblock-lists/${BRAVE_SOURCE_COMMIT}/${sourcePath}`;
    const response = await fetchSource(url);
    if (!response.ok) {
      throw new Error(`Brave source ${sourcePath} returned HTTP ${response.status}`);
    }
    return response.text();
  }));

  const rules = BraveRules.validateRules(BraveRules.parseRules(sourceTexts.join('\n')));
  return [
    `! Brave list additions pinned to ${BRAVE_SOURCE_COMMIT}`,
    '! Auto-consent scriptlets and exception rules are excluded.',
    ...rules,
    ''
  ].join('\n');
}
