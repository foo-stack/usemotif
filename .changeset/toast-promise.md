---
'@usemotif/headless': minor
'@usemotif/ui': minor
---

`toast.promise(promise, { loading, success, error })` shows one toast that turns into the success toast, or an assertive error toast, when the promise settles, and returns the promise. `success` and `error` may be functions of the value or the error. It works on web and React Native, and through the kit's `useToast`. The web `Toaster` also takes `maxVisible`, dropping the oldest toasts past it as native already does; it defaults to no limit on web. New types: `ToastFn`, `ToastContent`, `ToastPromiseMessages`.
