import type { ESLint, Linter } from 'eslint';
import { noPlatformBranching, preferTokens, validTokenPaths } from './rules.js';

export type { MotifLintSettings } from './tokens.js';

const plugin = {
  meta: { name: '@usemotif/eslint-plugin', version: '0.0.0' },
  rules: {
    'prefer-tokens': preferTokens,
    'valid-token-paths': validTokenPaths,
    'no-platform-branching': noPlatformBranching,
  },
  configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin;

/** Every rule, with unknown paths as errors and the rest as warnings. */
plugin.configs.recommended = {
  plugins: { motif: plugin },
  rules: {
    'motif/prefer-tokens': 'warn',
    'motif/valid-token-paths': 'error',
    'motif/no-platform-branching': 'warn',
  },
};

export default plugin;
