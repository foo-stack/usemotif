import type { ReactElement } from 'react';
import { Linking } from 'react-native';
import { Pressable } from 'usemotif';
import type { PlatformLinkProps } from './_link.js';
import { nativeText } from './_native-text.js';

export type { PlatformLinkProps };

/**
 * React Native: a Pressable that opens `href` the way the web link would, with
 * its text in `Text` carrying the link's colour, size and weight.
 */
export function PlatformLink({ href, children, ...style }: PlatformLinkProps): ReactElement {
  const { color, fontSize, fontWeight } = style as Record<string, unknown>;
  return (
    <Pressable
      {...({ ...style, accessibilityRole: 'link' } as Record<string, unknown>)}
      {...(href !== undefined && { onPress: () => void Linking.openURL(href) })}
    >
      {nativeText(children, { color, fontSize, fontWeight })}
    </Pressable>
  );
}
