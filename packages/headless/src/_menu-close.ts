import { createContext } from 'react';

/**
 * Closes the native menu an item sits in. Menu and ContextMenu each provide
 * it, so items shared by both close whichever one they are in.
 */
export const MenuCloseContext = createContext<(() => void) | null>(null);
