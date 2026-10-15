// Expo + Yarn workspaces Metro config.
//
// Three things differ from a standalone Expo app:
//
// 1. `watchFolders` is extended to include the monorepo root so Metro
//    picks up changes in workspace packages (`@usemotif/react-native`,
//    `@usemotif/tokens`, etc.) and not just files under
//    `apps/playground-native/`.
// 2. `nodeModulesPaths` lists both the app's `node_modules` and the
//    root's, since Yarn 4 with `nodeLinker: node-modules` hoists
//    most packages to the root.
// 3. `disableHierarchicalLookup` shuts off Metro's traditional walk-
//    up-the-tree resolution; the explicit `nodeModulesPaths` is
//    enough and the walk-up causes spurious `node_modules` lookups
//    in unrelated parents.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
