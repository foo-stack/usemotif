import { Box, Text } from '@usemotif/react';
import results from '../../../benchmarks/results.json';

const VARIANT_LABEL: Readonly<Record<string, string>> = {
  runtime: 'motif runtime',
  compiled: 'motif compiled',
};

const CELL = {
  borderBottom: '1px solid var(--colors-line-base)',
  padding: '8px 12px',
  textAlign: 'left',
} as const;

/** A ratio as a reader says it: "4.2x faster" or, below 1, "3.3x slower". */
export function describeRatio(ratio: number): string {
  return ratio >= 1 ? `${ratio.toFixed(1)}× faster` : `${(1 / ratio).toFixed(1)}× slower`;
}

/**
 * The benchmark ratios recorded in `benchmarks/results.json` by `yarn bench:report`, one table
 * per workload. Every figure here is a ledger entry in `.claims.json`.
 */
export function BenchmarkResults() {
  const ratios = results.ratios as Record<string, Record<string, Record<string, number>>>;
  return (
    <Box my="$5">
      {results.workloads.map((workload) => {
        const byVariant = ratios[workload.id] ?? {};
        const libraries = Object.keys(byVariant[workload.variants[0]!] ?? {});
        return (
          <Box key={workload.id} mb="$6">
            <Text as="h3" fontSize="$lg" fontWeight="$semibold" mb="$2">
              {workload.label}
            </Text>
            <Box as="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={CELL}>Compared with</th>
                  {workload.variants.map((v) => (
                    <th key={v} style={CELL}>
                      {VARIANT_LABEL[v] ?? v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {libraries.map((library) => (
                  <tr key={library}>
                    <td style={CELL}>{library}</td>
                    {workload.variants.map((v) => {
                      const ratio = byVariant[v]?.[library];
                      return (
                        <td key={v} style={CELL}>
                          {ratio === undefined ? 'not measured' : describeRatio(ratio)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        );
      })}
      <Text fontSize="$sm" color="$colors.fg.muted">
        Recorded {results.generatedAt} at commit <code>{results.commit}</code> on{' '}
        {results.environment}.
      </Text>
    </Box>
  );
}
