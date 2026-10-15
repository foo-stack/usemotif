// What a build-time theme snapshot could save at native startup: resolving the token props of a
// first screen against the theme, against the same props already resolved to literals, which is
// what a snapshot would hand the renderer. Run with `node --jitless` to approximate Hermes's
// interpreter. Prints the cost per first screen of BOXES boxes.
import { resolveStyles, resolveToken } from '@usemotif/core';
import { lightTheme } from '@usemotif/tokens';

const BOXES = 300;
const TOKEN_PROPS = {
  bg: '$colors.surface.raised',
  color: '$colors.text.default',
  p: '$space.4',
  borderRadius: '$radii.md',
  borderColor: '$colors.border.default',
  fontSize: '$fontSizes.md',
};
const LITERAL_PROPS = Object.fromEntries(
  Object.entries(TOKEN_PROPS).map(([key, ref]) => {
    const { style } = resolveStyles({ [key]: ref }, lightTheme);
    return [key, Object.values(style)[0]];
  }),
);

function screen(props) {
  const start = performance.now();
  for (let i = 0; i < BOXES; i++) resolveStyles(props, lightTheme);
  return performance.now() - start;
}

// The first screen is the startup cost, so the first, cold run is the number that matters.
const coldTokens = screen(TOKEN_PROPS);
const coldLiterals = screen(LITERAL_PROPS);
const runs = 50;
let warmTokens = 0;
let warmLiterals = 0;
for (let i = 0; i < runs; i++) {
  warmTokens += screen(TOKEN_PROPS);
  warmLiterals += screen(LITERAL_PROPS);
}
const paths = [];
const walk = (node, path) => {
  if (typeof node === 'object' && node !== null)
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  else paths.push(path);
};
for (const [scale, node] of Object.entries(lightTheme.tokens))
  if (scale !== 'animations') walk(node, `$${scale}`);
const allStart = performance.now();
for (const path of paths) resolveToken(path, lightTheme);
const all = performance.now() - allStart;

const ms = (n) => `${n.toFixed(2)} ms`;
console.log(`first screen, ${BOXES} boxes x ${Object.keys(TOKEN_PROPS).length} token props`);
console.log(
  `  cold: tokens ${ms(coldTokens)}, literals ${ms(coldLiterals)}, saving ${ms(coldTokens - coldLiterals)}`,
);
console.log(
  `  warm: tokens ${ms(warmTokens / runs)}, literals ${ms(warmLiterals / runs)}, saving ${ms((warmTokens - warmLiterals) / runs)}`,
);
console.log(`resolving every token in the light theme once (${paths.length} paths): ${ms(all)}`);
