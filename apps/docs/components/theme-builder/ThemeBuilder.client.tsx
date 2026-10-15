import { hashString } from '@usemotif/core';
import { Box, HStack, Text, ThemeProvider, VStack } from '@usemotif/react';
import { Alert, Badge, Button, Card, Switch, TextField } from '@usemotif/ui';
import { useMemo, useState, type ReactNode } from 'react';
import {
  AA_MINIMUM,
  DEFAULT_INPUT,
  buildThemes,
  contrastChecks,
  themeModule,
  toDesignTokens,
  type BuilderInput,
  type SchemeColors,
} from './theme-logic.js';

const COLOR_FIELDS: readonly { key: keyof SchemeColors; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryText', label: 'Text on primary' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
];

const LABEL_STYLE = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 } as const;

function SchemeControls({
  title,
  colors,
  onChange,
}: {
  title: string;
  colors: SchemeColors;
  onChange: (next: SchemeColors) => void;
}) {
  return (
    <VStack gap="$2" flex={1} minW={200}>
      <Text fontWeight={600} fontSize="13px">
        {title}
      </Text>
      {COLOR_FIELDS.map(({ key, label }) => (
        <label key={key} style={LABEL_STYLE}>
          <input
            type="color"
            value={colors[key]}
            aria-label={`${title} ${label}`}
            onChange={(e) => onChange({ ...colors, [key]: e.target.value })}
          />
          {label}
          <Text as="code" fontFamily="$fontFamilies.mono" fontSize="12px" color="$colors.fg.faint">
            {colors[key]}
          </Text>
        </label>
      ))}
    </VStack>
  );
}

function Preview({
  theme,
  title,
}: {
  theme: ReturnType<typeof buildThemes>['light'];
  title: string;
}) {
  const checks = contrastChecks(theme);
  return (
    <VStack gap="$2" flex={1} minW={260}>
      <Text fontWeight={600} fontSize="13px">
        {title}
      </Text>
      <ThemeProvider themes={[theme]} active={theme.name}>
        <Box bg="$colors.surface.base" color="$colors.text.default" p="$4" borderRadius="$lg">
          <VStack gap="$3">
            <Card>
              <Card.Header>
                <Text fontWeight="$semibold">Plan</Text>
              </Card.Header>
              <Card.Body>
                <Text color="$colors.text.muted">Billed monthly. Cancel any time.</Text>
              </Card.Body>
            </Card>
            <HStack gap="$2" flexWrap="wrap">
              <Button intent="primary">Upgrade</Button>
              <Button intent="neutral">Later</Button>
              <Badge intent="primary">New</Badge>
              <Badge intent="success">Active</Badge>
            </HStack>
            <TextField placeholder="you@example.com" aria-label="Email" />
            <Switch aria-label="Notifications" defaultChecked />
            <Alert intent="info" title="Heads up">
              Your trial ends in 3 days.
            </Alert>
          </VStack>
        </Box>
      </ThemeProvider>
      <VStack gap="$1" role="status" aria-label={`${title} contrast`}>
        {checks.map((c) => (
          <Text
            key={c.label}
            fontSize="12px"
            color={c.passes ? '$colors.fg.muted' : '$colors.status.error'}
          >
            {c.passes ? 'Pass' : 'Below AA'}: {c.label}{' '}
            {c.ratio === null ? '(not a hex colour)' : `${c.ratio.toFixed(2)}:1`}
          </Text>
        ))}
      </VStack>
    </VStack>
  );
}

function Output({ title, filename, text }: { title: string; filename: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <VStack gap="$2" flex={1} minW={280}>
      <HStack justifyContent="space-between" alignItems="center">
        <Text fontWeight={600} fontSize="13px">
          {title}{' '}
          <Text as="code" fontSize="12px">
            {filename}
          </Text>
        </Text>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => setCopied(true));
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </HStack>
      <Box
        as="pre"
        m={0}
        p="$3"
        maxH={320}
        overflow="auto"
        fontFamily="$fontFamilies.mono"
        fontSize="12px"
        bg="$colors.surface.paper2"
        borderRadius="8px"
      >
        {text}
      </Box>
    </VStack>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <HStack gap="$5" flexWrap="wrap" alignItems="flex-start">
      {children}
    </HStack>
  );
}

/** Pick a few colours, see the kit in light and dark, and take the theme away as code or tokens. */
export function ThemeBuilder() {
  const [input, setInput] = useState<BuilderInput>(DEFAULT_INPUT);
  // A theme's CSS is cached by name, so the previews take a name that changes with the input.
  const version = useMemo(() => hashString(JSON.stringify(input)), [input]);
  const themes = useMemo(() => buildThemes(input), [input]);
  const previews = useMemo(
    () => ({
      light: { ...themes.light, name: `${themes.light.name}-${version}` },
      dark: { ...themes.dark, name: `${themes.dark.name}-${version}` },
    }),
    [themes, version],
  );
  const tokens = useMemo(
    () =>
      JSON.stringify(
        { light: toDesignTokens(themes.light.tokens), dark: toDesignTokens(themes.dark.tokens) },
        null,
        2,
      ),
    [themes],
  );

  return (
    <VStack gap="$6" my="$5">
      <Section>
        <VStack gap="$2" minW={200}>
          <label style={LABEL_STYLE}>
            Name
            <input
              value={input.name}
              onChange={(e) =>
                setInput({ ...input, name: e.target.value.replace(/[^\w-]/g, '') || 'brand' })
              }
            />
          </label>
          <label style={LABEL_STYLE}>
            Radius
            <input
              type="range"
              min={0}
              max={24}
              value={input.radius}
              onChange={(e) => setInput({ ...input, radius: Number(e.target.value) })}
            />
            {input.radius}px
          </label>
        </VStack>
        <SchemeControls
          title="Light"
          colors={input.light}
          onChange={(light) => setInput({ ...input, light })}
        />
        <SchemeControls
          title="Dark"
          colors={input.dark}
          onChange={(dark) => setInput({ ...input, dark })}
        />
      </Section>
      <Section>
        <Preview theme={previews.light} title="Light" />
        <Preview theme={previews.dark} title="Dark" />
      </Section>
      <Text fontSize="12px" color="$colors.fg.muted">
        Contrast is checked against WCAG AA for body text ({AA_MINIMUM}:1).
      </Text>
      <Section>
        <Output title="createTheme" filename="theme.ts" text={themeModule(input)} />
        <Output title="W3C Design Tokens" filename="tokens.json" text={tokens} />
      </Section>
    </VStack>
  );
}

export default ThemeBuilder;
