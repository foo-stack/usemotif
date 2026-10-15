'use client';

import { DEFAULT_MESSAGES, mergeMessages, type MotifMessages } from '@usemotif/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

// `null` rather than the English catalogue, so the catalogue is only referenced inside the hooks
// and a bundle that never asks for a label can drop it.
const MessagesContext = createContext<MotifMessages | null>(null);

export interface MessagesProviderProps {
  /** Translations for any of motif's built-in labels. Anything left out keeps the outer value. */
  readonly messages: Partial<MotifMessages>;
  readonly children?: ReactNode;
}

/**
 * Translate the labels motif writes itself: the names of pagination and breadcrumb landmarks, the
 * dismiss and remove buttons, list and picker placeholders, and the rest of `MotifMessages`.
 * Nested providers layer over the outer one, and a component's own prop for a string still wins.
 *
 * @example
 * ```tsx
 * <MessagesProvider messages={{ dismiss: 'Fermer', removeItem: (item) => `Retirer ${item}` }}>
 *   <App />
 * </MessagesProvider>
 * ```
 */
export function MessagesProvider({ messages, children }: MessagesProviderProps) {
  const parent = useContext(MessagesContext) ?? DEFAULT_MESSAGES;
  const value = useMemo(() => mergeMessages(parent, messages), [parent, messages]);
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/** The active catalogue of motif's built-in labels. */
export function useMessages(): MotifMessages {
  return useContext(MessagesContext) ?? DEFAULT_MESSAGES;
}
