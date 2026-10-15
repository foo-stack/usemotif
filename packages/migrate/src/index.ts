/**
 * @usemotif/migrate - codemod toolkit for motif-js.
 *
 * Programmatic API. The CLI in `./cli.ts` is the primary surface for
 * end users; this module is the importable shape for anyone running
 * the transforms from their own tooling.
 */

export const PACKAGE_NAME = '@usemotif/migrate';

export { applyRenameV2, needsRenameV2 } from './transforms/rename-v2.js';
export { applyRenameV3, needsRenameV3 } from './transforms/rename-v3.js';
export {
  applyFromStyledComponents,
  cssToStyle,
  needsFromStyledComponents,
} from './transforms/from-styled-components.js';
export { applyFromTamagui, needsFromTamagui } from './transforms/from-tamagui.js';
