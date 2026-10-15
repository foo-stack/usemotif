import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noPlatformBranching, preferTokens, validTokenPaths } from './rules.js';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const TOKENS = {
  colors: { blue: { 600: '#2563eb' }, action: { primary: { bg: '$colors.blue.600' } } },
  space: { 2: 8, 4: 16 },
};
const dir = mkdtempSync(join(tmpdir(), 'motif-lint-'));
writeFileSync(join(dir, 'tokens.json'), JSON.stringify(TOKENS));

tester.run('prefer-tokens', preferTokens, {
  valid: [
    { code: '<Box bg="$colors.blue.600" />', settings: { motif: { tokens: TOKENS } } },
    { code: '<Box bg="#123456" />', settings: { motif: { tokens: TOKENS } } },
    { code: '<Box p={0} m="auto" />', settings: { motif: { tokens: TOKENS } } },
    { code: '<Box title="#2563eb" />', settings: { motif: { tokens: TOKENS } } },
  ],
  invalid: [
    {
      code: '<Box bg="#2563EB" />',
      settings: { motif: { tokens: TOKENS } },
      errors: [
        {
          messageId: 'useToken',
          data: { value: '#2563EB', token: '$colors.blue.600' },
          suggestions: [
            {
              messageId: 'replace',
              data: { token: '$colors.blue.600' },
              output: '<Box bg="$colors.blue.600" />',
            },
          ],
        },
      ],
    },
    {
      code: '<Box p={16} gap="8px" />',
      settings: { motif: { tokensFile: join(dir, 'tokens.json') } },
      errors: [
        {
          messageId: 'useToken',
          suggestions: [{ messageId: 'replace', output: '<Box p="$space.4" gap="8px" />' }],
        },
        {
          messageId: 'useToken',
          suggestions: [{ messageId: 'replace', output: '<Box p={16} gap="$space.2" />' }],
        },
      ],
    },
  ],
});

tester.run('valid-token-paths', validTokenPaths, {
  valid: [
    {
      code: '<Box bg="$colors.action.primary.bg" p="$4" />',
      settings: { motif: { tokens: TOKENS } },
    },
    { code: '<Box bg="$blue.600" />', settings: { motif: { tokens: TOKENS } } },
    { code: '<Box aria-label="$5 off" />', settings: { motif: { tokens: TOKENS } } },
  ],
  invalid: [
    {
      code: '<Box bg="$colors.action.primry.bg" />',
      settings: { motif: { tokens: TOKENS } },
      errors: [
        {
          message:
            '$colors.action.primry.bg is not a token in this theme. Did you mean $colors.action.primary.bg?',
        },
      ],
    },
    {
      code: '<Box p="$5" />',
      settings: { motif: { tokens: TOKENS } },
      errors: [{ messageId: 'unknown' }],
    },
  ],
});

tester.run('no-platform-branching', noPlatformBranching, {
  valid: [
    { code: "const x = Platform.OS === 'ios';", filename: 'Button.native.tsx' },
    { code: 'const ok = props.os;', filename: 'Button.tsx' },
  ],
  invalid: [
    {
      code: "const x = Platform.OS === 'ios' ? 1 : 2;",
      filename: '/src/Button.tsx',
      errors: [
        {
          message:
            "Platform.OS branches on the platform in a shared file. Split the difference into Button.native.tsx instead, so each platform's bundle carries only its own code.",
        },
      ],
    },
    { code: 'const s = Platform.select({ ios: 1 });', filename: 'Card.tsx', errors: 1 },
    { code: "if (typeof window !== 'undefined') {}", filename: 'Card.tsx', errors: 1 },
  ],
});
