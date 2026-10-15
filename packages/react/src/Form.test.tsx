/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Field, FieldError, Form, Input, Label, type FormProps } from './forms.js';

let container: HTMLElement;
let root: Root;

async function render(node: ReactNode): Promise<void> {
  await act(async () => {
    root.render(node);
  });
}

const input = (name: string): HTMLInputElement =>
  container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
const alertText = (): string[] =>
  [...container.querySelectorAll('[role="alert"]')].map((el) => el.textContent ?? '');

async function submit(): Promise<void> {
  await act(async () => {
    container.querySelector('form')!.requestSubmit();
  });
}

async function type(el: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function SignUp(props: Omit<FormProps, 'children'>) {
  return (
    <Form {...props}>
      <Field>
        <Label>Name</Label>
        <Input name="name" required />
        <FieldError />
      </Field>
      <Field>
        <Label>Email</Label>
        <Input name="email" type="email" required />
        <FieldError />
      </Field>
      <button type="submit">Send</button>
    </Form>
  );
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Form', () => {
  it('blocks an invalid submit, shows each message on its field, and focuses the first', async () => {
    const onSubmit = vi.fn();
    const action = vi.fn();
    await render(<SignUp onSubmit={onSubmit} action={action} />);
    input('email').setCustomValidity('Enter an email');
    expect(alertText()).toEqual([]);
    await submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    expect(input('name').getAttribute('aria-invalid')).toBe('true');
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
    expect(alertText()).toContain('Enter an email');
    expect(input('email').getAttribute('aria-describedby')).toContain(`${input('email').id}-error`);
    expect(document.activeElement).toBe(input('name'));
    expect(container.querySelector('form')!.noValidate).toBe(true);
  });

  it('rechecks a field as it is edited', async () => {
    await render(<SignUp />);
    await submit();
    expect(input('name').getAttribute('aria-invalid')).toBe('true');
    await type(input('name'), 'Ada');
    expect(input('name').hasAttribute('aria-invalid')).toBe(false);
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
  });

  it('runs the action with the form data, and shows the errors it returns', async () => {
    const action = vi.fn(async (data: FormData) => {
      expect(data.get('email')).toBe('ada@example.com');
      return { errors: { email: 'Already registered' } };
    });
    const onSubmit = vi.fn();
    await render(<SignUp action={action} onSubmit={onSubmit} />);
    await type(input('name'), 'Ada');
    await type(input('email'), 'ada@example.com');
    await submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);
    expect(alertText()).toEqual(['Already registered']);
    expect(input('email').getAttribute('aria-invalid')).toBe('true');

    await type(input('email'), 'ada2@example.com');
    expect(alertText()).toEqual([]);
  });

  it('shows errors passed in by name from the first render', async () => {
    await render(<SignUp errors={{ name: 'Taken' }} />);
    expect(alertText()).toEqual(['Taken']);
  });

  it('lets the browser report a control that has no field to show its message', async () => {
    await render(
      <Form>
        <input name="code" required />
      </Form>,
    );
    const report = vi.spyOn(input('code'), 'reportValidity');
    await submit();
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('keeps an explicit FieldError message as it was', async () => {
    await render(
      <Field invalid>
        <Input name="x" />
        <FieldError>Custom</FieldError>
      </Field>,
    );
    expect(alertText()).toEqual(['Custom']);
  });
});
