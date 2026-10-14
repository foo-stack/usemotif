import type { ReactNode } from 'react';

/** What a toast shows; `toast()` takes this plus an optional `id`. */
export interface ToastContent {
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  /** ms before auto-dismiss. Pass `Infinity` to disable. */
  readonly duration?: number;
  /** `'foreground'` (assertive) for errors, `'background'` (polite) otherwise. */
  readonly type?: 'foreground' | 'background';
}

export interface ToastPromiseMessages<T> {
  /** Shown until the promise settles; persists unless it sets a `duration`. */
  readonly loading: ToastContent;
  readonly success: ToastContent | ((value: T) => ToastContent);
  /** Shown as an assertive (`'foreground'`) toast unless it sets `type`. */
  readonly error: ToastContent | ((error: unknown) => ToastContent);
}

/** `toast(input)` pushes a toast and returns its id; `toast.promise` tracks a promise. */
export type ToastFn = ((input: ToastContent & { id?: string }) => string) & {
  /**
   * Shows `messages.loading`, then turns that same toast into
   * `messages.success` or `messages.error` when `promise` settles. Returns
   * `promise`, so the caller still handles its result.
   */
  promise<T>(
    promise: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: { readonly id?: string },
  ): Promise<T>;
};

/** Adds `promise` to a Toaster's push function. Shared by the web and native Toasters. */
export function withPromise(push: (input: ToastContent & { id?: string }) => string): ToastFn {
  return Object.assign((input: ToastContent & { id?: string }) => push(input), {
    promise<T>(
      promise: Promise<T>,
      messages: ToastPromiseMessages<T>,
      options: { readonly id?: string } = {},
    ): Promise<T> {
      const id = push({
        duration: Infinity,
        ...messages.loading,
        ...(options.id !== undefined ? { id: options.id } : {}),
      });
      promise.then(
        (value) => {
          const m =
            typeof messages.success === 'function' ? messages.success(value) : messages.success;
          push({ ...m, id });
        },
        (error: unknown) => {
          const m = typeof messages.error === 'function' ? messages.error(error) : messages.error;
          push({ type: 'foreground', ...m, id });
        },
      );
      return promise;
    },
  });
}
