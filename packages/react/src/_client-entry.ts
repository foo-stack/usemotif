// The RSC entry's way to the client primitives. The build rewrites this module to the package's
// own `'use client'` entry, so a fallback is a client reference rather than inlined client code.
export { Box, HStack, Stack, Text, VStack } from './index.js';
