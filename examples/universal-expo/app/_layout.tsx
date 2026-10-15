import { Link, Stack } from 'expo-router';
import { ThemeProvider } from 'usemotif';
import {
  NavProvider,
  darkTheme,
  lightTheme,
  type ScreenLinkProps,
} from '@usemotif/example-universal-shared';

function RouterLink({ href, children }: ScreenLinkProps) {
  return <Link href={href}>{children}</Link>;
}

export default function RootLayout() {
  return (
    <ThemeProvider themes={[lightTheme, darkTheme]} active="light">
      <NavProvider link={RouterLink}>
        <Stack screenOptions={{ headerShown: false }} />
      </NavProvider>
    </ThemeProvider>
  );
}
