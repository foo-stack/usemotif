import { Linking } from 'react-native';

/** React Native: open the link with `Linking`. */
export function navigate(href: string): void {
  void Linking.openURL(href);
}
