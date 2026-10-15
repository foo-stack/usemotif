// Shipped-bytes comparison for motif's compiled output, default and atomic, against StyleX and
// Panda: one generated set of components, compiled by each, rendered once per instance, and the
// stylesheet and the markup gzipped separately. Run with `yarn workspace @usemotif-bench/render css-size`.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { transformSync } from '@babel/core';
import stylexBabel from '@stylexjs/babel-plugin';
import motifBabel from '@usemotif/compiler-babel';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const COMPONENTS = 300;
const DIR = join(import.meta.dirname, 'node_modules', '.cache', 'css-size');

// [motif prop, CSS property, values]. Values carry units so every library reads them the same way.
const VOCABULARY = [
  ['p', 'padding', ['4px', '8px', '12px', '16px', '24px']],
  ['m', 'margin', ['0', '4px', '8px', '16px']],
  ['gap', 'gap', ['4px', '8px', '16px']],
  ['bg', 'backgroundColor', ['#ffffff', '#f4f4f5', '#3b82f6', '#ef4444', '#16a34a']],
  ['color', 'color', ['#18181b', '#52525b', '#ffffff', '#1d4ed8']],
  ['borderRadius', 'borderRadius', ['4px', '8px', '12px', '9999px']],
  ['display', 'display', ['flex', 'block', 'grid', 'inline-flex']],
  ['flexDirection', 'flexDirection', ['row', 'column']],
  ['alignItems', 'alignItems', ['center', 'flex-start', 'stretch']],
  ['fontSize', 'fontSize', ['12px', '14px', '16px', '20px']],
  ['fontWeight', 'fontWeight', ['400', '600', '700']],
  ['width', 'width', ['100%', 'auto', '240px']],
];
const HOVERS = [
  ['opacity', '0.9'],
  ['backgroundColor', '#e4e4e7'],
];

let seed = 42;
const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
// Skewed toward the first entries, as real code reuses a few values far more than the rest.
const pick = (list) => list[Math.floor(random() ** 2 * list.length)];

const corpus = Array.from({ length: COMPONENTS }, () => {
  const props = [...VOCABULARY].sort(() => random() - 0.5).slice(0, 3 + Math.floor(random() * 5));
  return {
    base: props.map(([prop, css, values]) => [prop, css, pick(values)]),
    hover: random() < 0.3 ? pick(HOVERS) : undefined,
    instances: 1 + Math.floor(random() * 4),
  };
});

const motifSource = () =>
  `import { Box } from '@usemotif/react';\n${corpus
    .map(({ base, hover }, i) => {
      const attrs = base.map(([prop, , value]) => `${prop}="${value}"`);
      if (hover) attrs.push(`_hover={{ ${hover[0]}: '${hover[1]}' }}`);
      return `export const C${i} = () => <Box ${attrs.join(' ')} />;`;
    })
    .join('\n')}\n`;

const objectOf = ({ base, hover }, nest) => {
  const entries = base.map(([, css, value]) => [css, value]);
  if (hover) {
    const plain = entries.find(([css]) => css === hover[0])?.[1] ?? null;
    const rest = entries.filter(([css]) => css !== hover[0]);
    return JSON.stringify(Object.fromEntries([...rest, [hover[0], nest(plain, hover[1])]]));
  }
  return JSON.stringify(Object.fromEntries(entries));
};

const stylexSource = () =>
  `import * as stylex from '@stylexjs/stylex';\nconst s = stylex.create({\n${corpus
    .map(
      (c, i) => `  c${i}: ${objectOf(c, (plain, hover) => ({ default: plain, ':hover': hover }))},`,
    )
    .join('\n')}\n});\n${corpus
    .map((_, i) => `export const C${i} = () => <div {...stylex.props(s.c${i})} />;`)
    .join('\n')}\n`;

const pandaSource = () =>
  `import { css } from './styled-system/css/index.mjs';\n${corpus
    .map((c, i) => {
      const style = JSON.parse(objectOf(c, (plain, hover) => ({ base: plain, _hover: hover })));
      return `export const C${i} = () => <div className={css(${JSON.stringify(style)})} />;`;
    })
    .join('\n')}\n`;

function compile(name, source, plugins) {
  const result = transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: join(DIR, `${name}.tsx`),
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [...plugins, ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]],
  });
  const file = join(DIR, `${name}.mjs`);
  writeFileSync(file, result.code);
  return { file, metadata: result.metadata };
}

async function markup(file) {
  const mod = await import(pathToFileURL(file).href);
  const page = corpus.flatMap(({ instances }, i) =>
    Array.from({ length: instances }, (_, n) => createElement(mod[`C${i}`], { key: `${i}-${n}` })),
  );
  return renderToStaticMarkup(createElement(Fragment, null, page));
}

const lines = (css) => [...new Set(css.split('\n').filter(Boolean))].join('\n');
const gz = (text) => gzipSync(text).length;

rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const rows = [];

for (const atomic of [false, true]) {
  const css = [];
  const name = atomic ? 'motif-atomic' : 'motif';
  const { file } = compile(name, motifSource(), [
    [motifBabel, { atomic, onCss: (chunk) => css.push(chunk) }],
  ]);
  rows.push([
    atomic ? 'motif, atomic' : 'motif, default',
    lines(css.join('\n')),
    await markup(file),
  ]);
}

{
  const opts = { dev: false, runtimeInjection: false, treeshakeCompensation: true };
  const { file, metadata } = compile('stylex', stylexSource(), [[stylexBabel, opts]]);
  const css = stylexBabel.processStylexRules(metadata.stylex, { useLayers: false });
  rows.push(['StyleX', css, await markup(file)]);
}

{
  writeFileSync(join(DIR, 'panda.tsx'), pandaSource());
  writeFileSync(
    join(DIR, 'panda.config.mjs'),
    `export default { preflight: false, presets: [], include: ['./panda.tsx'], outdir: 'styled-system' };\n`,
  );
  const panda = (...args) =>
    execFileSync('panda', [...args, '--config', 'panda.config.mjs', '--silent'], { cwd: DIR });
  panda('codegen');
  panda('cssgen', '--outfile', 'panda.css');
  const { file } = compile('panda', pandaSource(), []);
  const { readFileSync } = await import('node:fs');
  rows.push(['Panda', readFileSync(join(DIR, 'panda.css'), 'utf8'), await markup(file)]);
}

const elements = corpus.reduce((sum, c) => sum + c.instances, 0);
console.log(`${COMPONENTS} components, ${elements} rendered elements, gzipped bytes\n`);
console.log('| Output | CSS | Markup | Total |\n| --- | --- | --- | --- |');
for (const [label, css, html] of rows) {
  console.log(`| ${label} | ${gz(css)} | ${gz(html)} | ${gz(css) + gz(html)} |`);
}
