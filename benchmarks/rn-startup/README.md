# @motif-js-bench/rn-startup

React Native startup-time bench scaffold. The fixture (`src/App.tsx`)
exercises a realistic motif tree (theme + Box / Stack / Text / Button)
so measurements reflect actual usage rather than empty-bundle floors.

## Why a scaffold and not an executable bench

Startup time is a runtime measurement on a real device or simulator. It
can't be measured in pure Node like the render bench under
`benchmarks/render` can. So this package is an opinionated fixture +
documentation, not a `yarn bench` target.

## How to measure

The motif team's standard methodology:

### Setup

1. Generate a fresh Expo SDK 55 project:
   ```sh
   bunx create-expo-app@latest motif-startup --template blank-typescript
   cd motif-startup
   ```
2. Add motif:
   ```sh
   bun add @motif-js/react-native
   ```
3. Replace `App.tsx` with the contents of
   `benchmarks/rn-startup/src/App.tsx`.
4. Build the **release** variant - debug-mode startup is dominated by
   Metro / DevTools instrumentation and isn't representative.
   ```sh
   eas build --profile production --platform ios   # or android
   ```

### Measure

Hermes prints engine-init timestamps when launched with
`HERMES_VM_LOG=1`. The two numbers that matter:

- **`runtimeInit` → `bundleLoaded`** - JS engine bootstrap + bundle
  parse. This is what the choice of styling library most affects
  (parse cost scales with bundle size; tree-shaking matters here).
- **`bundleLoaded` → first JS execution complete** - module-graph
  evaluation cost. Top-level work in motif's `<ThemeProvider>` /
  resolver setup lands here.

### Compare

Run two variants:

1. **motif** - the fixture as-is.
2. **baseline** - same fixture, but with `<ThemeProvider>` /
   `<Box>` / `<Stack>` / `<Button>` replaced by RN's `<View>` /
   `<Text>` / `<Pressable>`. Same React tree shape, no motif.

The delta is motif's true startup cost. Acceptable budget: motif
should add no more than ~50ms to `bundleLoaded` on a release build
on a 2022-era device. Anything bigger is worth investigating.

## Results JSON + the regression gate

The measurement emits a small JSON capturing the **median** phase
timings (ms) for each variant:

```json
{
  "device": "iPhone 14 (iOS 17, release)",
  "samples": 5,
  "variants": {
    "motif": { "bundleParseMs": 142.0, "moduleEvalMs": 23.5 },
    "baseline": { "bundleParseMs": 118.0, "moduleEvalMs": 12.0 }
  }
}
```

- `bundleParseMs` - `runtimeInit` → `bundleLoaded`.
- `moduleEvalMs` - `bundleLoaded` → first JS execution complete.

`scripts/check-device-bench.mjs --results <file>` consumes that JSON and
**fails if motif's added cost over the baseline (summed across both
phases) exceeds the budget** in `.device-budgets.json` (`maxAddedMs`,
the ~50ms above). A malformed emission fails the gate loudly rather than
passing silently.

The gate is **self-tested in CI** against
[`results/example.json`](./results/example.json) - a labelled fixture,
not a real measurement - via `yarn bench:device-gate`, so the regression
logic is exercised on every push without hardware. Drop a real measured
file under `results/` and point the gate at it.

## Why this is here

The measurement itself isn't yet automated - it's a methodology plus a
fixture the team runs during big refactors to confirm we haven't
regressed the motif-vs-plain-RN delta. The **regression gate over the
emitted numbers does exist** and is wired into `bench.yml` (the
`device-bench` lane), self-tested against the fixture; only the
on-device measurement step awaits a device cloud (Sauce / BrowserStack /
EAS) or a hosted simulator, queued for a v1.x patch.

## Theme resolution at startup

`yarn workspace @usemotif-bench/rn-startup theme-cost` measures, under `node --jitless` as a
stand-in for Hermes's interpreter, what resolving token props costs on a first screen of 300
boxes with six token props each, against the same props already resolved to literals, which is
the most a build-time theme snapshot could hand the renderer.

Measured on 2026-10-15 (Apple silicon, Node 24):

|                                             | First screen, cold | Saving a snapshot could add |
| ------------------------------------------- | ------------------ | --------------------------- |
| Before the per-theme memo in `resolveToken` | 2.3 to 2.5 ms      | about 2.2 ms                |
| With it                                     | 0.6 to 0.7 ms      | about 0.1 ms                |

Resolving every token in the light theme once takes about 0.3 ms. The cost was the same few refs
resolved again for every element, which the memo removes, so a compiler-metro snapshot is not
built: what is left for it to save is a tenth of a millisecond.
