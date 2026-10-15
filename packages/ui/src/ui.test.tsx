/** @vitest-environment jsdom */
import { act, useCallback } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  Alert,
  AlertDialog,
  AvatarGroup,
  type AvatarGroupItem,
  Badge,
  Banner,
  Button,
  Breadcrumb,
  Calendar,
  Chip,
  type Command,
  CommandPalette,
  Card,
  DataTable,
  Checkbox,
  Collapsible,
  ColorPicker,
  Combobox,
  ContextMenu,
  DatePicker,
  Drawer,
  EmptyState,
  FileUpload,
  FormField,
  HoverCard,
  Menu,
  Modal,
  MultiSelect,
  NavigationMenu,
  Pagination,
  Popover,
  Progress,
  ProgressCircle,
  Radio,
  RadioGroup,
  RangeSlider,
  RatingInput,
  Search,
  SegmentedControl,
  type SegmentedControlOption,
  Select,
  type SelectOption,
  Separator,
  Sheet,
  Skeleton,
  Slider,
  Spinner,
  Stat,
  Stepper,
  type StepperStep,
  Switch,
  TagsInput,
  Tabs,
  TextField,
  TimeInput,
  Timeline,
  type TimelineItem,
  Toaster,
  Toolbar,
  Tooltip,
  type TreeNode,
  TreeView,
  useToast,
} from './index.js';

let container: HTMLElement;
let root: Root;

function render(node: React.ReactNode): void {
  act(() => root.render(node));
}

function click(el: Element): void {
  act(() => (el as HTMLElement).click());
}

/** Class + inline style - what visually distinguishes a rendered element. */
function look(el: Element): string {
  return `${el.getAttribute('class') ?? ''}|${el.getAttribute('style') ?? ''}`;
}

// Module-scope stable reference: an inline `defaultValue={['a']}` would trip
// react-perf's jsx-no-new-array-as-prop.
const ACCORDION_DEFAULT_OPEN = ['a'];

// Likewise hoisted: an inline `options={[...]}` array prop would trip the lint.
const SELECT_OPTIONS: ReadonlyArray<SelectOption> = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true },
];

// Module-scope handler + flag: an inline `onSelect={() => ...}` would trip
// react-perf's jsx-no-new-function-as-prop.
let menuPicked = '';
function pickRename(): void {
  menuPicked = 'rename';
}
let ctxPicked = '';
function pickCut(): void {
  ctxPicked = 'cut';
}
let paginationPage = 0;
function onPaginationChange(n: number): void {
  paginationPage = n;
}
const STEPPER_STEPS: ReadonlyArray<StepperStep> = [
  { id: 'cart', label: 'Cart', status: 'complete' },
  { id: 'ship', label: 'Shipping' },
  { id: 'pay', label: 'Payment' },
];
// Hoisted: an inline `defaultValue={[20, 80]}` array prop would trip the lint.
const RANGE_DEFAULT: [number, number] = [20, 80];
const COMBO_OPTIONS: ReadonlyArray<SelectOption> = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
];
const MS_DEFAULT: ReadonlyArray<string> = ['react'];
let msValue: ReadonlyArray<string> = [];
function onMultiChange(next: ReadonlyArray<string>): void {
  msValue = next;
}
// Hoisted: an inline `defaultValue={new Date(...)}` object prop would trip the
// lint. A fixed date keeps the selected-cell assertion deterministic.
const NO_OPTIONS: ReadonlyArray<SelectOption> = [];
const SLIDER_MARKS = [{ value: 0, label: 'Low' }, { value: 50 }, { value: 100, label: 'High' }];
const LAZY_TREE: ReadonlyArray<TreeNode> = [{ id: 'docs', label: 'docs', hasChildren: true }];
function neverLoads(): Promise<void> {
  return new Promise(() => {});
}
const TAGS: ReadonlyArray<string> = ['react', 'vue'];
const CAL_DEFAULT = new Date(2024, 0, 15);
const CAL_RANGE = { start: new Date(2024, 0, 10), end: new Date(2024, 0, 12) };

// Hoisted command list + tree data (inline array/object props would trip lint).
function cmdNoop(): void {}
const CMD_NESTED: ReadonlyArray<Command> = [
  { id: 'theme', label: 'Theme', children: [{ id: 'dark', label: 'Dark', onSelect: () => {} }] },
];
const CMD_COMMANDS: ReadonlyArray<Command> = [
  { id: 'new', label: 'New File', shortcut: ['Mod', 'N'], onSelect: cmdNoop },
  { id: 'open', label: 'Open...', onSelect: cmdNoop },
  { id: 'save', label: 'Save', section: 'File', onSelect: cmdNoop },
];
const TREE_DATA: ReadonlyArray<TreeNode> = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'index', label: 'index.ts' },
      { id: 'app', label: 'App.tsx' },
    ],
  },
  { id: 'readme', label: 'README.md' },
];
const TREE_EXPANDED: ReadonlyArray<string> = ['src'];
const TIMELINE_ITEMS: ReadonlyArray<TimelineItem> = [
  { id: 'a', title: 'Order placed', time: '09:30', status: 'success' },
  { id: 'b', title: 'Packed', time: '11:00' },
  { id: 'c', title: 'Out for delivery', time: '14:10' },
];
// Hoisted: an inline JSX `action={<button/>}` prop would trip react-perf.
const EMPTY_ACTION = (
  <button type="button" data-testid="cta">
    Compose
  </button>
);
const AVATARS: ReadonlyArray<AvatarGroupItem> = [
  { name: 'Jane Doe' },
  { name: 'Sam Lee' },
  { name: 'Al Park' },
  { name: 'Bo Kim' },
  { name: 'Cy Ng' },
];
let chipRemoved = false;
function onChipRemove(): void {
  chipRemoved = true;
}
let bannerDismissed = false;
function onBannerDismiss(): void {
  bannerDismissed = true;
}
const SEG_OPTIONS: ReadonlyArray<SegmentedControlOption> = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
];
let segValue = '';
function onSegChange(v: string): void {
  segValue = v;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

describe('display components', () => {
  it('Card composes Header, Body, Footer and Media parts', () => {
    render(
      <Card padding="none" data-testid="card">
        <Card.Media data-testid="media">
          <img alt="" src="data:," />
        </Card.Media>
        <Card.Header data-testid="header">Pro plan</Card.Header>
        <Card.Body data-testid="body">Everything in Team.</Card.Body>
        <Card.Footer data-testid="footer">
          <button type="button">Choose</button>
        </Card.Footer>
      </Card>,
    );
    const card = container.querySelector('[data-testid="card"]')!;
    const order = Array.from(card.children, (el) => el.getAttribute('data-testid'));
    expect(order).toEqual(['media', 'header', 'body', 'footer']);
    for (const id of ['header', 'body', 'footer']) {
      expect(look(container.querySelector(`[data-testid="${id}"]`)!), id).not.toBe('|');
    }
    expect(container.querySelector('[data-testid="footer"]')!.getAttribute('style')).toContain(
      'justify-content: flex-end',
    );
  });

  it('an interactive Card is a link with hover and focus-visible states', () => {
    render(
      <Card as="a" interactive data-testid="card" {...({ href: '/plans/pro' } as object)}>
        Pro
      </Card>,
    );
    const card = container.querySelector('[data-testid="card"]')!;
    expect(card.tagName).toBe('A');
    expect(card.getAttribute('href')).toBe('/plans/pro');
    expect(card.getAttribute('style') ?? '').toContain('cursor: pointer');
    const css = Array.from(document.querySelectorAll('style'), (el) => el.textContent ?? '').join(
      '\n',
    );
    const cls = (card.getAttribute('class') ?? '')
      .split(' ')
      .find((c) => css.includes(`.${c}:hover`));
    expect(cls, 'a hover rule for the card').toBeDefined();
    expect(css).toContain(`.${cls}:focus-visible`);
  });

  it('Badge shows a count, capped at max with a plus', () => {
    render(
      <>
        <Badge data-testid="a" count={7} />
        <Badge data-testid="b" count={120} />
        <Badge data-testid="c" count={12} max={9} label="12 unread" />
      </>,
    );
    const text = (id: string): string | null =>
      container.querySelector(`[data-testid="${id}"]`)!.textContent;
    expect(text('a')).toBe('7');
    expect(text('b')).toBe('99+');
    expect(text('c')).toBe('9+');
    const labelled = container.querySelector('[data-testid="c"]')!;
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('12 unread');
    expect(container.querySelector('[data-testid="a"]')!.hasAttribute('role')).toBe(false);
  });

  it('a dot Badge is an empty 8px circle with its label', () => {
    render(<Badge data-testid="dot" intent="success" size="md" dot label="Online" />);
    const dot = container.querySelector('[data-testid="dot"]')!;
    expect(dot.textContent).toBe('');
    expect(dot.getAttribute('aria-label')).toBe('Online');
    const style = dot.getAttribute('style') ?? '';
    expect(style).toContain('width: 8px');
    expect(style).toContain('height: 8px');
    // The dot's zero padding wins over the md size's.
    expect(style).toContain('padding-inline: 0');
  });

  it('Card and Badge render themed (recipe applied)', () => {
    render(
      <>
        <Card data-testid="card" />
        <Badge data-testid="badge">New</Badge>
      </>,
    );
    expect(look(container.querySelector('[data-testid="card"]')!)).not.toBe('|');
    expect(look(container.querySelector('[data-testid="badge"]')!)).not.toBe('|');
  });

  it('Button applies the button recipe to a real button', () => {
    let pressed = 0;
    render(
      <Button intent="danger" size="sm" onPress={() => (pressed += 1)}>
        Delete
      </Button>,
    );
    const button = container.querySelector('button')!;
    expect(button.getAttribute('type')).toBe('button');
    const style = button.getAttribute('style') ?? '';
    expect(style).toContain(
      'background-color: var(--components-button-danger-bg, var(--colors-action-danger-bg))',
    );
    expect(style).toContain('height: 32px');
    click(button);
    expect(pressed).toBe(1);
  });

  it('TextField applies the input recipe to an input and marks it invalid', () => {
    render(
      <FormField label="Email" error="Required">
        <TextField size="lg" invalid placeholder="you@example.com" />
      </FormField>,
    );
    const input = container.querySelector('input')!;
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('placeholder')).toBe('you@example.com');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).not.toBeNull();
    // The recipe resolves to real styles, not stray attributes on the input.
    const style = input.getAttribute('style') ?? '';
    expect(style).toContain('height: 48px');
    expect(style).toContain(
      'border-color: var(--components-input-invalid-borderColor, var(--colors-action-danger-bg))',
    );
    expect(input.hasAttribute('bg')).toBe(false);
    expect(container.querySelector('label')!.getAttribute('for')).toBe(input.id);
  });

  it('Spinner announces itself and animates', () => {
    render(<Spinner size={24} />);
    const el = container.querySelector('[role="status"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Loading');
    // The spin animation resolved onto the element.
    expect(look(el)).not.toBe('|');
  });

  it('Alert renders role=alert with an intent-tinted surface', () => {
    render(
      <Alert intent="danger" title="Payment failed">
        Update your card.
      </Alert>,
    );
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('Payment failed');
    expect(el.textContent).toContain('Update your card.');
    // The danger intent drives the soft-tint background from the `status`
    // tokens - the surface is the filled tint, not a bare border accent.
    expect(el.getAttribute('style') ?? '').toContain('status-danger-tint');
  });

  it('Alert renders an action and a dismiss button in the intent colour', () => {
    const onDismiss = vi.fn();
    render(
      <Alert
        intent="danger"
        title="Payment failed"
        action={<a href="#billing">Update card</a>}
        onDismiss={onDismiss}
      >
        Update your card.
      </Alert>,
    );
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.querySelector('a[href="#billing"]')?.textContent).toBe('Update card');
    const dismiss = el.querySelector('button[aria-label="Dismiss"]') as HTMLElement;
    expect(dismiss.getAttribute('type')).toBe('button');
    expect(dismiss.getAttribute('style') ?? '').toContain('status-danger-fg');
    click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Alert and Banner show an intent icon by default, replaceable or removable', () => {
    render(
      <>
        <Alert intent="danger" title="Failed" />
        <Alert intent="neutral" title="Note" />
        <Alert intent="success" title="Custom" icon={<i data-testid="custom" />} />
        <Alert intent="info" title="None" icon={null} />
        <Banner intent="warning" title="Maintenance" />
      </>,
    );
    const alerts = container.querySelectorAll('[role="alert"], [role="status"]');
    const svgs = Array.from(alerts, (el) => el.querySelectorAll('svg').length);
    // danger and the warning Banner get an icon; neutral, the custom one and null do not draw one.
    expect(svgs).toEqual([1, 0, 0, 0, 1]);
    expect(alerts[0]!.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(alerts[0]!.querySelector('svg')!.parentElement!.getAttribute('style') ?? '').toContain(
      'status-danger-fg',
    );
    expect(alerts[2]!.querySelector('[data-testid="custom"]')).not.toBeNull();
  });

  it('Alert renders no dismiss button without onDismiss', () => {
    render(<Alert title="Saved" />);
    expect(container.querySelector('[aria-label="Dismiss"]')).toBeNull();
  });

  it('Alert supports the warning intent and tints per intent', () => {
    render(
      <>
        <Alert intent="warning" title="Heads up" />
        <Alert intent="info" title="FYI" />
      </>,
    );
    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(2);
    const warnStyle = alerts[0]!.getAttribute('style') ?? '';
    const infoStyle = alerts[1]!.getAttribute('style') ?? '';
    expect(warnStyle).toContain('status-warning-tint');
    expect(infoStyle).toContain('status-info-tint');
    // Distinct intents must produce distinct tints.
    expect(warnStyle).not.toBe(infoStyle);
  });
});

describe('Modal - themed + adaptive + animated', () => {
  it('opens from a trigger and renders the accessible dialog with a themed surface', () => {
    render(
      <Modal.Root>
        <Modal.Trigger>
          <button data-testid="open">Open</button>
        </Modal.Trigger>
        <Modal.Content>
          <Modal.Title>Delete project?</Modal.Title>
          <Modal.Description>This cannot be undone.</Modal.Description>
        </Modal.Content>
      </Modal.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    click(container.querySelector('[data-testid="open"]')!);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Delete project?');
    // The themed surface Box (a child of the role=dialog boundary) carries styling.
    const surface = dialog.querySelector('div');
    expect(surface).not.toBeNull();
    expect(look(surface!)).not.toBe('|');
    // aria-labelledby is wired to the title.
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('closes on Escape', () => {
    render(
      <Modal.Root defaultOpen>
        {/* exitDurationMs=0 → instant unmount, so we test the Escape wiring,
            not the exit animation (which would keep it mounted ~200ms). */}
        <Modal.Content exitDurationMs={0}>
          <Modal.Title>Title</Modal.Title>
        </Modal.Content>
      </Modal.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    act(() => {
      dialog!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('Tooltip - themed bubble over the headless behaviour', () => {
  it('renders the trigger and stays closed until interaction', () => {
    render(
      <Tooltip.Root>
        <Tooltip.Trigger>
          <button data-testid="tt-trigger">Hover me</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Saved automatically</Tooltip.Content>
      </Tooltip.Root>,
    );
    // Trigger renders (the headless Trigger clones the child + wires handlers).
    const trigger = container.querySelector('[data-testid="tt-trigger"]');
    expect(trigger).not.toBeNull();
    // Closed by default - no tooltip content in the document yet.
    expect(document.body.textContent).not.toContain('Saved automatically');
  });
});

describe('Toast - themed cards over the headless toaster', () => {
  function ToastDemo() {
    const { toast } = useToast();
    const push = useCallback(
      () => toast({ title: 'Saved', description: 'Your changes are stored.' }),
      [toast],
    );
    return (
      <button data-testid="push" onClick={push}>
        push
      </button>
    );
  }

  it('pushes a themed toast that announces itself politely', () => {
    render(
      <Toaster>
        <ToastDemo />
      </Toaster>,
    );
    click(container.querySelector('[data-testid="push"]')!);
    // Toasts render through a portal (document, not the container).
    const toast = document.querySelector('[role="status"]') as HTMLElement;
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Saved');
    expect(toast.textContent).toContain('Your changes are stored.');
    // The visible card is a themed Box (class + inline style applied).
    const card = toast.querySelector('div');
    expect(card).not.toBeNull();
    expect(look(card!)).not.toBe('|');
  });
});

describe('Switch - themed via the _checked pseudo', () => {
  it('renders a role=switch input with a checked-state rule (pure CSS)', () => {
    render(<Switch defaultChecked data-testid="sw" />);
    const el = container.querySelector('[role="switch"]') as HTMLInputElement;
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('INPUT');
    expect(el.checked).toBe(true);
    // The on-state (track colour + thumb slide) resolves to a hashed
    // :checked rule, not inline - proof it's the _checked pseudo at work.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain(':checked');
  });

  it('forwards aria-invalid when invalid', () => {
    render(<Switch invalid data-testid="sw" />);
    const el = container.querySelector('[role="switch"]') as HTMLElement;
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Tabs - themed via _selected over the headless asChild', () => {
  it('renders accessible tabs and colours the active one via [aria-selected]', () => {
    render(
      <Tabs.Root defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">Account</Tabs.Tab>
          <Tabs.Tab value="b">Billing</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Account panel</Tabs.Panel>
        <Tabs.Panel value="b">Billing panel</Tabs.Panel>
      </Tabs.Root>,
    );
    // The tab semantics + theming land on a single styled element (a button Box).
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(look(tabs[0]!)).not.toBe('|'); // themed (class + inline style)
    // The active-tab styling is a hashed [aria-selected] rule (the _selected
    // pseudo), not inline - proof it's pure CSS, not JS state.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain('[aria-selected="true"]');
    // Only the active panel renders.
    expect(container.textContent).toContain('Account panel');
    expect(container.textContent).not.toContain('Billing panel');
  });

  it('switches the active tab on click', () => {
    render(
      <Tabs.Root defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
      </Tabs.Root>,
    );
    click(container.querySelectorAll('[role="tab"]')[1]!);
    expect(container.querySelectorAll('[role="tab"]')[1]!.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(container.textContent).toContain('Panel B');
  });
});

describe('Checkbox - themed via the _checked pseudo', () => {
  it('renders a native checkbox with a checked-state rule (pure CSS)', () => {
    render(<Checkbox defaultChecked data-testid="cb" />);
    const el = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(el).not.toBeNull();
    expect(el.checked).toBe(true);
    expect(look(el)).not.toBe('|'); // themed (class + reset style)
    // The on-state (fill + tick) resolves to a hashed :checked rule, not inline -
    // proof it's the _checked pseudo at work, no controlled state.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain(':checked');
  });

  it('forwards aria-invalid when invalid', () => {
    render(<Checkbox invalid data-testid="cb" />);
    const el = container.querySelector('input[type="checkbox"]') as HTMLElement;
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('Radio / RadioGroup - themed via _checked, grouped by a shared name', () => {
  it('shares the group name, checks the default option, and allows single selection', () => {
    render(
      <RadioGroup name="plan" defaultValue="pro">
        <Radio value="free" data-testid="free" />
        <Radio value="pro" data-testid="pro" />
      </RadioGroup>,
    );
    // role=radiogroup wraps the options.
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
    const free = container.querySelector('[data-testid="free"]') as HTMLInputElement;
    const pro = container.querySelector('[data-testid="pro"]') as HTMLInputElement;
    // Both radios inherit the group's shared name (→ native single-selection).
    expect(free.getAttribute('name')).toBe('plan');
    expect(pro.getAttribute('name')).toBe('plan');
    expect(free.type).toBe('radio');
    // The default option is checked; the other isn't.
    expect(pro.checked).toBe(true);
    expect(free.checked).toBe(false);
    // Picking the other option moves the single selection (native group behaviour).
    click(free);
    expect(free.checked).toBe(true);
    expect(pro.checked).toBe(false);
    // The checked styling is a hashed :checked rule, not inline.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain(':checked');
  });

  it('auto-generates a shared name when none is given', () => {
    render(
      <RadioGroup>
        <Radio value="a" data-testid="a" />
        <Radio value="b" data-testid="b" />
      </RadioGroup>,
    );
    const a = container.querySelector('[data-testid="a"]') as HTMLInputElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLInputElement;
    expect(a.getAttribute('name')).toBeTruthy();
    expect(a.getAttribute('name')).toBe(b.getAttribute('name'));
  });
});

describe('Popover - themed surface over the headless behaviour', () => {
  it('opens from its trigger and renders a themed dialog surface', () => {
    render(
      <Popover.Root>
        <Popover.Trigger>
          <button data-testid="pop-trigger">Filters</button>
        </Popover.Trigger>
        <Popover.Content>
          <div data-testid="pop-body">Pick a range</div>
        </Popover.Content>
      </Popover.Root>,
    );
    const trigger = container.querySelector('[data-testid="pop-trigger"]') as HTMLElement;
    expect(trigger).not.toBeNull();
    // Closed initially - no content, trigger not expanded.
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-testid="pop-body"]')).toBeNull();

    click(trigger);
    // Open: a role=dialog surface renders through a portal (document, not container).
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.textContent).toContain('Pick a range');
    // The visible card is a themed Box (class + inline style applied).
    const card = dialog.querySelector('div');
    expect(card).not.toBeNull();
    expect(look(card!)).not.toBe('|');
  });
});

describe('Accordion - themed via _expanded over the headless disclosure', () => {
  it('passes collapsible={false} through: the open trigger is disabled and stays open', () => {
    render(
      <Accordion.Root collapsible={false} defaultValue={ACCORDION_DEFAULT_OPEN}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Shipping</Accordion.Trigger>
          <Accordion.Content>Ships in 2-3 days.</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );
    const trigger = container.querySelector('button')!;
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders triggers that expose aria-expanded and toggle their panels', () => {
    render(
      <Accordion.Root type="single" defaultValue={ACCORDION_DEFAULT_OPEN}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Shipping</Accordion.Trigger>
          <Accordion.Content>Ships in 2-3 days.</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Returns</Accordion.Trigger>
          <Accordion.Content>30-day returns.</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>,
    );
    const triggers = container.querySelectorAll('button');
    expect(triggers.length).toBe(2);
    // The themed trigger is a styled button Box (class + inline style applied).
    expect(look(triggers[0]!)).not.toBe('|');
    // The default-open item is expanded; the other isn't.
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toContain('Ships in 2-3 days.');

    // The open-state styling is a hashed [aria-expanded] rule (the _expanded
    // pseudo), not inline - proof the open affordance is pure CSS.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain('[aria-expanded="true"]');

    // Single-type: opening the second collapses the first.
    click(triggers[1]!);
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('true');
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).toContain('30-day returns.');
  });
});

describe('Select - themed single-select over the headless listbox', () => {
  it('shows the selected label, opens a themed listbox, and changes selection', () => {
    render(<Select options={SELECT_OPTIONS} defaultValue="b" width={200} />);
    const trigger = container.querySelector('button') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Beta'); // label for the default value
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox).not.toBeNull();
    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    // The default option is marked selected, and the rows are themed.
    expect(options[1]!.getAttribute('aria-selected')).toBe('true');
    expect(look(options[0]!.querySelector('div')!)).not.toBe('|');

    // The headless list commits selection on mousedown (not click).
    act(() => {
      options[0]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    // Selection moved → trigger relabels and the listbox closes.
    expect(trigger.textContent).toContain('Alpha');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });
});

describe('Menu - themed dropdown with asChild items', () => {
  it('opens a menu whose themed items carry the menuitem role and activate', () => {
    menuPicked = '';
    render(
      <Menu.Root>
        <Menu.Trigger>
          <button data-testid="menu-trigger">Actions</button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Item onSelect={pickRename}>Rename</Menu.Item>
          <Menu.Separator />
          <Menu.Item disabled>Archive</Menu.Item>
        </Menu.Content>
      </Menu.Root>,
    );
    click(container.querySelector('[data-testid="menu-trigger"]')!);
    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    expect(menu).not.toBeNull();
    const items = menu.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    // asChild → the menuitem IS the themed Box (class + inline style applied),
    // not a bare wrapper div.
    expect(look(items[0]!)).not.toBe('|');
    expect(menu.querySelector('[role="separator"]')).not.toBeNull();

    // Activating an item runs onSelect and closes the menu.
    click(items[0]!);
    expect(menuPicked).toBe('rename');
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it('opens a themed submenu from a themed trigger, under Menu and ContextMenu alike', () => {
    expect(ContextMenu.Sub).toBe(Menu.Sub);
    expect(ContextMenu.SubTrigger).toBe(Menu.SubTrigger);
    expect(ContextMenu.SubContent).toBe(Menu.SubContent);
    menuPicked = '';
    render(
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <button data-testid="menu-trigger">Actions</button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.Sub>
            <Menu.SubTrigger>Share</Menu.SubTrigger>
            <Menu.SubContent>
              <Menu.Item onSelect={pickRename}>Email</Menu.Item>
            </Menu.SubContent>
          </Menu.Sub>
        </Menu.Content>
      </Menu.Root>,
    );
    const trigger = document.querySelector('[aria-haspopup="menu"][role="menuitem"]')!;
    expect(look(trigger)).not.toBe('|');
    expect(trigger.textContent).toBe('Share›');
    click(trigger);
    const panels = document.querySelectorAll('[role="menu"]');
    expect(panels.length).toBe(2);
    expect(look(panels[1]!.firstElementChild!)).not.toBe('|');
    click(panels[1]!.querySelector('[role="menuitem"]')!);
    expect(menuPicked).toBe('rename');
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('Menu checkbox, radio and label items', () => {
  it('draws a check and a dot, follows clicks, and shares the parts with ContextMenu', () => {
    expect(ContextMenu.CheckboxItem).toBe(Menu.CheckboxItem);
    expect(ContextMenu.RadioItem).toBe(Menu.RadioItem);
    render(
      <Menu.Root defaultOpen>
        <Menu.Trigger>
          <button>View</button>
        </Menu.Trigger>
        <Menu.Content>
          <Menu.CheckboxItem defaultChecked closeOnSelect={false}>
            Wrap
          </Menu.CheckboxItem>
          <Menu.Label>Sort by</Menu.Label>
          <Menu.RadioGroup defaultValue="name">
            <Menu.RadioItem value="name" closeOnSelect={false}>
              Name
            </Menu.RadioItem>
            <Menu.RadioItem value="date" closeOnSelect={false}>
              Date
            </Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Root>,
    );
    const item = (role: string, name: string): Element =>
      Array.from(document.querySelectorAll(`[role="${role}"]`)).find((e) =>
        e.textContent?.endsWith(name),
      )!;
    expect(item('menuitemcheckbox', 'Wrap').textContent).toBe('✓Wrap');
    expect(look(item('menuitemcheckbox', 'Wrap'))).not.toBe('|');
    expect(item('menuitemradio', 'Name').textContent).toBe('●Name');
    expect(item('menuitemradio', 'Date').textContent).toBe('Date');
    click(item('menuitemcheckbox', 'Wrap'));
    expect(item('menuitemcheckbox', 'Wrap').textContent).toBe('Wrap');
    click(item('menuitemradio', 'Date'));
    expect(item('menuitemradio', 'Date').textContent).toBe('●Date');
    expect(item('menuitemradio', 'Name').textContent).toBe('Name');
    expect(document.body.textContent).toContain('Sort by');
  });
});

describe('Slider - themed range input over the headless slider', () => {
  it('exposes the slider role + value and responds to arrow keys', () => {
    render(<Slider defaultValue={40} aria-label="Volume" />);
    const slider = container.querySelector('[role="slider"]') as HTMLElement;
    expect(slider).not.toBeNull();
    expect(slider.getAttribute('aria-valuenow')).toBe('40');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-label')).toBe('Volume');
    // Themed track (inline token-var style applied).
    expect(look(slider)).not.toBe('|');
    // Keyboard nudges the value (default step 1).
    act(() => {
      slider.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(slider.getAttribute('aria-valuenow')).toBe('41');
  });
});

describe('Progress - themed bar over the headless progressbar', () => {
  it('renders a determinate bar with aria-valuenow', () => {
    render(<Progress value={70} aria-label="Uploading" />);
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-valuenow')).toBe('70');
    expect(bar.getAttribute('aria-label')).toBe('Uploading');
    // Themed track + fill (inline token-var style applied).
    expect(look(bar)).not.toBe('|');
    expect(look(bar.querySelector('div')!)).not.toBe('|');
  });

  it('omits aria-valuenow when indeterminate (value=null)', () => {
    render(<Progress value={null} aria-label="Loading" />);
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
  });
});

describe('ProgressCircle - themed ring with Progress semantics', () => {
  const ring = (): SVGCircleElement => container.querySelectorAll('circle')[1] as SVGCircleElement;

  it('fills the arc to the value and reports it', () => {
    render(<ProgressCircle value={25} size={40} thickness={4} aria-label="Uploading" />);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('25');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBe('Uploading');
    const circumference = 2 * Math.PI * 18;
    expect(Number(ring().getAttribute('stroke-dasharray'))).toBeCloseTo(circumference, 5);
    expect(Number(ring().getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75, 5);
    expect(
      container.querySelector('svg')!.parentElement!.getAttribute('style') ?? '',
    ).not.toContain('animation');
  });

  it('spins a quarter arc when indeterminate, without a value', () => {
    render(<ProgressCircle value={null} aria-label="Loading" />);
    const bar = container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    const spinner = container.querySelector('svg')!.parentElement!;
    const css = Array.from(document.querySelectorAll('style'), (el) => el.textContent ?? '').join(
      '\n',
    );
    const animated = `${spinner.getAttribute('style') ?? ''} ${css}`;
    expect(animated).toMatch(/infinite/);
    expect(css).toMatch(/@keyframes/);
  });

  it('holds still under reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      render(<ProgressCircle value={null} aria-label="Loading" />);
      const spinner = container.querySelector('svg')!.parentElement!;
      expect(spinner.getAttribute('style') ?? '').not.toMatch(/animation-name|infinite/);
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('Drawer / Sheet - themed sliding panels over the headless Dialog', () => {
  it('opens a themed side drawer from its trigger and closes on Escape', () => {
    render(
      <Drawer.Root>
        <Drawer.Trigger>
          <button data-testid="open">Menu</button>
        </Drawer.Trigger>
        {/* exitDurationMs=0 → instant unmount, so we test the Escape wiring, not
            the slide-out (which would keep it mounted during the transition). */}
        <Drawer.Content side="left" exitDurationMs={0}>
          <Drawer.Title>Navigation</Drawer.Title>
          <Drawer.Description>Jump to a section.</Drawer.Description>
        </Drawer.Content>
      </Drawer.Root>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    click(container.querySelector('[data-testid="open"]')!);
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Navigation');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    // The themed sliding surface inside carries class + inline style.
    const surface = dialog.querySelector('div');
    expect(surface).not.toBeNull();
    expect(look(surface!)).not.toBe('|');

    act(() => {
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Sheet opens a themed bottom panel', () => {
    render(
      <Sheet.Root defaultOpen>
        <Sheet.Content exitDurationMs={0}>
          <Sheet.Title>Share</Sheet.Title>
        </Sheet.Content>
      </Sheet.Root>,
    );
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Share');
    expect(look(dialog.querySelector('div')!)).not.toBe('|');
  });
});

describe('AlertDialog - themed confirm dialog over the headless alertdialog', () => {
  it('renders role=alertdialog with a themed surface and does not dismiss on scrim click', () => {
    render(
      <AlertDialog.Root defaultOpen>
        <AlertDialog.Content exitDurationMs={0}>
          <AlertDialog.Title>Delete account?</AlertDialog.Title>
          <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog.Root>,
    );
    const dialog = document.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Delete account?');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    // The themed surface inside carries class + inline style.
    expect(look(dialog.querySelector('div')!)).not.toBe('|');
  });
});

describe('ContextMenu - themed right-click menu with asChild items', () => {
  it('opens at the cursor and activates an item', () => {
    ctxPicked = '';
    render(
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div data-testid="region">Right-click</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={pickCut}>Cut</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item disabled>Paste</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>,
    );
    expect(document.querySelector('[role="menu"]')).toBeNull();
    act(() => {
      container.querySelector('[data-testid="region"]')!.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 10,
        }),
      );
    });
    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    expect(menu).not.toBeNull();
    const items = menu.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    // asChild → the menuitem IS the themed Box (class + inline style applied).
    expect(look(items[0]!)).not.toBe('|');
    act(() => (items[0] as HTMLElement).click());
    expect(ctxPicked).toBe('cut');
  });
});

describe('Separator and Skeleton - display-floor primitives', () => {
  it('Separator renders a themed role=separator with an orientation', () => {
    render(<Separator orientation="vertical" />);
    const sep = container.querySelector('[role="separator"]') as HTMLElement;
    expect(sep).not.toBeNull();
    expect(sep.getAttribute('aria-orientation')).toBe('vertical');
    expect(look(sep)).not.toBe('|'); // themed (token background)
  });

  it('Skeleton renders a decorative, animated placeholder', () => {
    render(<Skeleton width={200} height={20} />);
    // Decorative → aria-hidden, and themed/animated (class + style applied).
    const el = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(look(el)).not.toBe('|');
  });

  it('Skeleton lines stacks text-height bars with a shorter last line', () => {
    render(<Skeleton lines={3} width={320} />);
    const stack = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    const style = stack.getAttribute('style') ?? '';
    expect(style).toContain('width: 320px');
    expect(style).toContain('font-size: var(--fontSizes-md)');
    const bars = Array.from(stack.children) as HTMLElement[];
    expect(bars.length).toBe(3);
    const widths = bars.map(
      (bar) => /(?:^|; )width: ([^;]+)/.exec(bar.getAttribute('style') ?? '')?.[1],
    );
    expect(widths).toEqual(['100%', '100%', '60%']);
    for (const bar of bars) expect(bar.getAttribute('style') ?? '').toContain('height: 1em');
  });

  it('a single Skeleton line is full width', () => {
    render(<Skeleton lines={1} />);
    const bar = container.querySelector('[aria-hidden="true"]')!.firstElementChild!;
    expect(bar.getAttribute('style') ?? '').toMatch(/(?:^|; )width: 100%/);
  });
});

describe('Pagination - themed page controls over the headless navigation', () => {
  it('renders a nav with page buttons, marks the current page, and reports clicks', () => {
    paginationPage = 0;
    render(<Pagination page={2} total={5} onPageChange={onPaginationChange} />);
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
    // The current page is marked aria-current=page and themed.
    const current = nav.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current).not.toBeNull();
    expect(current.textContent).toBe('2');
    expect(look(current)).not.toBe('|');
    // Clicking another page button reports it through onPageChange.
    const buttons = Array.from(nav.querySelectorAll('button'));
    const pageThree = buttons.find((b) => b.textContent === '3')!;
    click(pageThree);
    expect(paginationPage).toBe(3);
  });

  it('offers themed page sizes and reports the page that keeps the first item in view', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={5}
        total={10}
        boundaries={2}
        pageSize={10}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select.getAttribute('aria-label')).toBe('Items per page');
    expect(Array.from(select.options, (o) => o.value)).toEqual(['10', '20', '50']);
    expect(look(select)).not.toBe('|');
    act(() => {
      select.value = '50';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Page 5 at 10 per page starts at item 41, which is on page 1 at 50 per page.
    expect(onPageSizeChange).toHaveBeenCalledWith(50, 1);
  });

  it('shows no page-size select without onPageSizeChange', () => {
    render(<Pagination page={1} total={5} pageSize={10} />);
    expect(container.querySelector('select')).toBeNull();
  });
});

describe('Stepper - themed step indicator over the headless stepper', () => {
  it('renders status-coloured steps and marks the active one', () => {
    render(<Stepper current="ship" steps={STEPPER_STEPS} />);
    const list = container.querySelector('ol') as HTMLElement;
    expect(list).not.toBeNull();
    expect(list.textContent).toContain('Cart');
    expect(list.textContent).toContain('Shipping');
    expect(list.textContent).toContain('Payment');
    // The complete step shows a check; the active step is aria-current=step.
    expect(list.textContent).toContain('✓');
    const active = list.querySelector('[aria-current="step"]') as HTMLElement;
    expect(active).not.toBeNull();
    expect(active.textContent).toContain('Shipping');
  });
});

describe('Breadcrumb - themed trail over the headless landmark', () => {
  it('renders crumbs with a separator and marks the last as current', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="/library">Library</Breadcrumb.Item>
        <Breadcrumb.Item>Data</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    // Links are themed anchors; the current crumb is the last <li>.
    const links = nav.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect((links[0] as HTMLAnchorElement).getAttribute('href')).toBe('/');
    expect(nav.querySelector('[aria-current="page"]')).not.toBeNull();
    expect(nav.textContent).toContain('Home');
    expect(nav.textContent).toContain('Data');
  });

  it('folds the middle crumbs past maxItems into a menu that navigates', () => {
    const onNavigate = vi.fn();
    render(
      <Breadcrumb maxItems={3} onNavigate={onNavigate}>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="/a">Alpha</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">Beta</Breadcrumb.Item>
        <Breadcrumb.Item href="/c">Gamma</Breadcrumb.Item>
        <Breadcrumb.Item>Delta</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    const crumbs = Array.from(nav.querySelectorAll('li'), (li) => li.textContent?.replace('›', ''));
    expect(crumbs).toEqual(['Home', '...', 'Gamma', 'Delta']);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Delta');
    const more = nav.querySelector('button[aria-label="Show hidden breadcrumbs"]') as HTMLElement;
    expect(more.getAttribute('aria-haspopup')).toBe('menu');
    click(more);
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
    expect(items.map((el) => el.textContent)).toEqual(['Alpha', 'Beta']);
    click(items[1]!);
    expect(onNavigate).toHaveBeenCalledWith('/b');
  });

  it('shows every crumb while they fit in maxItems', () => {
    render(
      <Breadcrumb maxItems={3}>
        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
        <Breadcrumb.Item>Data</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(container.querySelector('button[aria-label="Show hidden breadcrumbs"]')).toBeNull();
  });
});

describe('Toolbar - themed roving-focus container over the headless toolbar', () => {
  it('renders role=toolbar and moves focus with arrow keys', () => {
    render(
      <Toolbar aria-label="Formatting">
        <button data-testid="b1">B</button>
        <button data-testid="b2">I</button>
      </Toolbar>,
    );
    const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
    expect(toolbar).not.toBeNull();
    expect(toolbar.getAttribute('aria-label')).toBe('Formatting');
    expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal');
    expect(look(toolbar)).not.toBe('|'); // themed (inline token-var style)
    const b1 = container.querySelector('[data-testid="b1"]') as HTMLElement;
    const b2 = container.querySelector('[data-testid="b2"]') as HTMLElement;
    act(() => b1.focus());
    act(() => {
      toolbar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(document.activeElement).toBe(b2);
  });
});

describe('NavigationMenu - themed nav bar over the headless landmark', () => {
  it('renders links and emphasizes + marks the current item', () => {
    render(
      <NavigationMenu current="docs" aria-label="Primary">
        <NavigationMenu.Item id="home" href="/">
          Home
        </NavigationMenu.Item>
        <NavigationMenu.Item id="docs" href="/docs">
          Docs
        </NavigationMenu.Item>
      </NavigationMenu>,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Primary');
    const links = nav.querySelectorAll('a');
    expect(links.length).toBe(2);
    // The headless marks the current item's <li> with aria-current=page.
    expect(nav.querySelector('[aria-current="page"]')).not.toBeNull();
    // The active link is themed distinctly from the inactive one.
    expect(look(links[0]!)).not.toBe(look(links[1]!));
  });
});

describe('Slider marks and a vertical RangeSlider', () => {
  it('themes the ticks and labels, and leaves room for the labels', () => {
    render(<Slider defaultValue={50} marks={SLIDER_MARKS} aria-label="Volume" />);
    const ticks = Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"]'));
    expect(ticks.length).toBe(3);
    expect(ticks[0]!.style.borderRadius).not.toBe('');
    expect(ticks[0]!.textContent).toBe('Low');
    expect(container.querySelector<HTMLElement>('[role="slider"]')!.style.marginBottom).toBe(
      '22px',
    );
  });

  it('turns the track upright for orientation="vertical"', () => {
    render(
      <RangeSlider orientation="vertical" width={160} defaultValue={[20, 80]} aria-label="Range" />,
    );
    const track = container.querySelector<HTMLElement>('[data-orientation="vertical"]')!;
    expect(track.style.width).toBe('6px');
    expect(track.style.height).toBe('160px');
    const thumbs = container.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(thumbs[0]!.style.bottom).toBe('20%');
    expect(thumbs[0]!.style.left).toBe('50%');
  });
});

describe('RangeSlider - themed two-thumb range over the headless slider', () => {
  it('renders two positioned, themed thumbs with split min/max', () => {
    render(<RangeSlider defaultValue={RANGE_DEFAULT} min={0} max={100} aria-label="Price" />);
    const thumbs = container.querySelectorAll('[role="slider"]') as NodeListOf<HTMLElement>;
    expect(thumbs.length).toBe(2);
    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('20');
    expect(thumbs[1]!.getAttribute('aria-valuenow')).toBe('80');
    // Positioned by percent (the kit enhancement) and themed.
    expect(thumbs[0]!.style.left).toBe('20%');
    expect(look(thumbs[0]!)).not.toBe('|');
    // Lower thumb steps right via arrow keys without crossing the upper.
    act(() => {
      thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('21');
  });
});

describe('RatingInput - themed stars over the headless rating', () => {
  it('renders count stars with the value reflected in aria + glyphs', () => {
    render(<RatingInput defaultValue={3} count={5} aria-label="Rate" />);
    const el = container.querySelector('[role="slider"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-valuenow')).toBe('3');
    expect(el.getAttribute('aria-valuemax')).toBe('5');
    // Three filled + two empty glyphs.
    expect((el.textContent?.match(/★/g) ?? []).length).toBe(3);
    expect((el.textContent?.match(/☆/g) ?? []).length).toBe(2);
    // Arrow keys raise the rating.
    act(() => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(el.getAttribute('aria-valuenow')).toBe('4');
  });
});

describe('Combobox / Search - themed typeahead over the headless combobox', () => {
  it('opens a themed listbox on focus and fills the input on select', () => {
    render(<Combobox options={COMBO_OPTIONS} placeholder="Pick" />);
    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.tagName).toBe('INPUT');
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    act(() => input.focus());
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox).not.toBeNull();
    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(look(options[0]!.querySelector('div')!)).not.toBe('|'); // themed rows

    // Picking an option (headless commits on mousedown) fills the input + closes.
    act(() => {
      options[2]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe('Svelte');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('shows the loading message, and server results unfiltered', () => {
    render(<Search options={NO_OPTIONS} loading loadingMessage="Fetching" placeholder="Search" />);
    act(() => (container.querySelector('[role="combobox"]') as HTMLInputElement).focus());
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.getAttribute('aria-busy')).toBe('true');
    expect(listbox.textContent).toBe('Fetching');
    render(<Search options={COMBO_OPTIONS} filter={false} inputValue="zzz" placeholder="Search" />);
    act(() => (container.querySelector('[role="combobox"]') as HTMLInputElement).focus());
    expect(document.querySelectorAll('[role="listbox"] [role="option"]').length).toBe(3);
  });

  it('Search wraps the combobox in a role=search landmark', () => {
    render(<Search options={COMBO_OPTIONS} placeholder="Search" />);
    expect(container.querySelector('[role="search"]')).not.toBeNull();
    expect(container.querySelector('[role="combobox"]')).not.toBeNull();
  });
});

describe('MultiSelect - themed chip-select over the headless multiselect', () => {
  it('shows chips for the selection, opens a multi listbox, and toggles', () => {
    msValue = [];
    render(
      <MultiSelect
        options={COMBO_OPTIONS}
        defaultValue={MS_DEFAULT}
        onValueChange={onMultiChange}
      />,
    );
    // The default selection renders as a chip with a remove control named for its option.
    const field = container.firstElementChild as HTMLElement;
    expect(field.textContent).toContain('React');
    expect(field.querySelector('[aria-label="Remove React"]')).not.toBeNull();

    const input = container.querySelector('[role="combobox"]') as HTMLInputElement;
    act(() => input.focus());
    const listbox = document.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox).not.toBeNull();
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    // The already-selected option is marked.
    const options = listbox.querySelectorAll('[role="option"]');
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');

    // Toggling an unselected option adds it (stays open for more).
    act(() => {
      options[1]!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    expect(msValue).toEqual(['react', 'vue']);
  });
});

describe('ColorPicker - themed HSV picker over the headless behaviour', () => {
  it('renders the themed picker group with its controls', () => {
    render(<ColorPicker defaultValue="#3b82f6" />);
    const group = container.querySelector('[role="group"]') as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.getAttribute('aria-label')).toBe('Colour picker');
    expect(look(group)).not.toBe('|'); // themed card (inline token-var style)
    // The HSV plane + hue slider expose slider roles.
    expect(group.querySelectorAll('[role="slider"]').length).toBeGreaterThanOrEqual(2);
  });
});

describe('FileUpload - themed dropzone over the headless behaviour', () => {
  it('renders a themed dropzone with a hidden file input', () => {
    render(<FileUpload accept="image/*" label="Drop images" />);
    // The hidden native input drives the picker.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('accept')).toBe('image/*');
    // The visible dropzone is the themed Box (dashed border + token styling).
    expect(container.textContent).toContain('Drop images');
    const zone = Array.from(container.querySelectorAll('div')).find((d) =>
      (d.getAttribute('style') ?? '').includes('dashed'),
    ) as HTMLElement;
    expect(zone).not.toBeUndefined();
    expect(look(zone)).not.toBe('|');
  });
});

describe('TimeInput - themed native time field', () => {
  it('renders a themed input[type=time] with the value', () => {
    render(<TimeInput defaultValue="09:30" />);
    const input = container.querySelector('input[type="time"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('09:30');
    expect((input.getAttribute('style') ?? '').length).toBeGreaterThan(0); // themed inline style
  });
});

describe('HoverCard - themed interactive card over the headless behaviour', () => {
  it('renders the trigger with dialog semantics and stays closed until interaction', () => {
    render(
      <HoverCard.Root>
        <HoverCard.Trigger>
          <a data-testid="hc-trigger" href="/u/jane">
            @jane
          </a>
        </HoverCard.Trigger>
        <HoverCard.Content aria-label="Jane">Profile card</HoverCard.Content>
      </HoverCard.Root>,
    );
    // The headless Trigger clones the child + wires the hover/focus handlers and
    // the dialog relationship.
    const trigger = container.querySelector('[data-testid="hc-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.getAttribute('aria-haspopup')).toBe('dialog');
    // Closed by default - no card content in the document yet.
    expect(document.body.textContent).not.toContain('Profile card');
  });
});

describe('Collapsible - themed single disclosure over the headless behaviour', () => {
  it('toggles the panel and flips aria-expanded (pure-CSS chevron)', () => {
    render(
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Advanced options</Collapsible.Trigger>
        <Collapsible.Content>Rarely-needed settings</Collapsible.Content>
      </Collapsible.Root>,
    );
    // The disclosure semantics + theming land on a single styled element (a
    // button Box).
    const trigger = container.querySelector('[aria-expanded]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(look(trigger)).not.toBe('|'); // themed (class + inline style)
    expect(container.textContent).toContain('Rarely-needed settings');
    // The expanded styling is a hashed [aria-expanded="true"] rule (the
    // _expanded pseudo), not inline - proof it's pure CSS, not JS state.
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toContain('[aria-expanded="true"]');

    // Collapsing flips the state and unmounts the panel (no forceMount).
    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('Rarely-needed settings');
  });
});

describe('Calendar - themed month grid over the headless behaviour', () => {
  it('renders an accessible grid and marks the selected day', () => {
    render(<Calendar defaultValue={CAL_DEFAULT} />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    // Six weeks of seven day cells.
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(42);
    // The default value (Jan 15 2024) is the only selected cell.
    const selected = container.querySelector('[role="gridcell"][aria-selected="true"]')!;
    expect(selected).not.toBeNull();
    expect(selected.textContent).toContain('15');
    // The day is painted by a themed Box (class + inline style), not bare text.
    const paint = selected.firstElementChild!;
    expect(look(paint)).not.toBe('|');
  });

  it('selects a day on click', () => {
    render(<Calendar defaultValue={CAL_DEFAULT} />);
    // Click the in-month "20" cell (unique in this grid).
    const cell = Array.from(container.querySelectorAll('[role="gridcell"]')).find(
      (c) => c.textContent === '20',
    )!;
    click(cell);
    expect(cell.getAttribute('aria-selected')).toBe('true');
  });
});

describe('Calendar - range mode', () => {
  it('paints the range ends solid and tints the days between', () => {
    render(<Calendar mode="range" defaultValue={CAL_RANGE} />);
    const paintOf = (day: string): string => {
      const cell = Array.from(container.querySelectorAll('[role="gridcell"]')).find(
        (c) => c.textContent === day,
      )!;
      return look(cell.firstElementChild!);
    };
    expect(paintOf('10')).toBe(paintOf('12'));
    expect(paintOf('11')).not.toBe(paintOf('10'));
    expect(paintOf('11')).not.toBe(paintOf('13'));
    expect(paintOf('13')).not.toBe(paintOf('10'));
    const selected = container.querySelectorAll('[role="gridcell"][aria-selected="true"]');
    expect(Array.from(selected).map((c) => c.textContent)).toEqual(['10', '11', '12']);
  });
});

describe('DatePicker - themed trigger + calendar popover', () => {
  it('renders a themed trigger and opens the themed calendar on click', () => {
    render(<DatePicker placeholder="Pick a date" />);
    const trigger = container.querySelector('button')!;
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Pick a date');
    expect((trigger.getAttribute('style') ?? '').length).toBeGreaterThan(0); // themed inline style
    // Closed initially - the calendar grid isn't mounted yet.
    expect(document.querySelector('[role="grid"]')).toBeNull();
    // Opening reveals the calendar (portaled to the document).
    click(trigger);
    expect(document.querySelector('[role="grid"]')).not.toBeNull();
  });

  it('labels a range with both dates', () => {
    render(<DatePicker mode="range" locale="en-US" defaultValue={CAL_RANGE} />);
    expect(container.querySelector('button')!.textContent).toMatch(/Jan 10\D+12, 2024/);
  });
});

describe('CommandPalette - themed ⌘K overlay over the headless behaviour', () => {
  it('renders the themed input + command rows when open', () => {
    render(<CommandPalette commands={CMD_COMMANDS} open />);
    // The palette renders inside the headless Dialog → portaled to the document.
    const input = document.querySelector('[role="combobox"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect((input.getAttribute('style') ?? '').length).toBeGreaterThan(0); // themed
    expect(document.querySelectorAll('[role="option"]').length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent).toContain('New File');
  });

  it('renders nothing while closed', () => {
    render(<CommandPalette commands={CMD_COMMANDS} open={false} />);
    expect(document.querySelector('[role="combobox"]')).toBeNull();
  });

  it('opens a nested page under a themed breadcrumb that goes back', () => {
    render(<CommandPalette commands={CMD_NESTED} open />);
    expect(document.querySelector('nav[aria-label="Command pages"]')).toBeNull();
    const option = Array.from(document.querySelectorAll('[role="option"]')).find((o) =>
      o.textContent?.includes('Theme'),
    )!;
    act(() => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    expect(document.body.textContent).toContain('Dark');
    const nav = document.querySelector('nav[aria-label="Command pages"]')!;
    expect(nav.textContent).toBe('Commands/Theme');
    const back = nav.querySelector('button')!;
    expect(look(back)).not.toBe('|');
    act(() => back.click());
    expect(document.querySelector('nav[aria-label="Command pages"]')).toBeNull();
    expect(document.body.textContent).toContain('Theme');
  });
});

describe('TreeView - themed ARIA tree over the headless behaviour', () => {
  it('renders treeitems, exposes aria-expanded, and selects a node on click', () => {
    render(<TreeView data={TREE_DATA} defaultExpanded={TREE_EXPANDED} aria-label="Files" />);
    const tree = container.querySelector('[role="tree"]');
    expect(tree).not.toBeNull();
    // Expanded: src + its two children + readme = four visible treeitems.
    const items = Array.from(container.querySelectorAll('[role="treeitem"]'));
    expect(items.length).toBe(4);
    // The root folder advertises its expanded state.
    const src = items.find((i) => i.textContent?.includes('src'))!;
    expect(src.getAttribute('aria-expanded')).toBe('true');
    // The node row is painted by a themed Box (class + inline style).
    const leaf = items.find((i) => i.textContent?.includes('index.ts'))!;
    const paint = leaf.firstElementChild!;
    expect(look(paint)).not.toBe('|');
    // Clicking the row selects it (row onClick → headless select).
    click(paint);
    expect(leaf.getAttribute('aria-selected')).toBe('true');
  });
});

describe('TreeView chevron, loading and multiple selection', () => {
  it('toggles from the chevron without selecting the row', () => {
    render(<TreeView data={TREE_DATA} aria-label="Files" />);
    const src = container.querySelector('[role="treeitem"]')!;
    const chevron = src.querySelector('span')!;
    expect(chevron.textContent).toBe('▸');
    click(chevron);
    expect(src.getAttribute('aria-expanded')).toBe('true');
    expect(src.getAttribute('aria-selected')).toBe('false');
  });

  it('shows Loading on a branch whose children are loading', async () => {
    render(<TreeView data={LAZY_TREE} loadChildren={neverLoads} aria-label="Files" />);
    const docs = container.querySelector('[role="treeitem"]')!;
    expect(docs.querySelector('span')!.textContent).toBe('▸');
    await act(async () => {
      (docs.querySelector('span') as HTMLElement).click();
    });
    expect(docs.textContent).toContain('Loading');
    expect(docs.getAttribute('aria-busy')).toBe('true');
  });

  it('paints every selected row in multiple mode', () => {
    render(
      <TreeView
        data={TREE_DATA}
        defaultExpanded={TREE_EXPANDED}
        selectionMode="multiple"
        aria-label="Files"
      />,
    );
    const rows = Array.from(container.querySelectorAll('[role="treeitem"]'));
    const pick = (name: string) => rows.find((r) => r.textContent?.includes(name))!;
    click(pick('index.ts').firstElementChild!);
    click(pick('README').firstElementChild!);
    expect(pick('index.ts').getAttribute('aria-selected')).toBe('true');
    expect(pick('README').getAttribute('aria-selected')).toBe('true');
    const bg = (name: string) =>
      (pick(name).firstElementChild as HTMLElement).style.backgroundColor;
    expect(bg('index.ts')).toBe(bg('README'));
    expect(bg('index.ts')).not.toBe(bg('App.tsx'));
  });
});

describe('TagsInput - chips over the headless tags input', () => {
  it('draws each tag as a themed Chip whose remove button names it', () => {
    render(<TagsInput aria-label="Topics" defaultValue={TAGS} />);
    const remove = container.querySelector<HTMLElement>('[aria-label="Remove vue"]')!;
    expect(remove).not.toBeNull();
    expect(look(remove.parentElement!)).not.toBe('|');
    click(remove);
    expect(container.querySelector('[aria-label="Remove vue"]')).toBeNull();
    expect(container.querySelector('[aria-label="Remove react"]')).not.toBeNull();
  });
});

describe('Stat - themed metric (pure primitive)', () => {
  it('renders label, value, and a trend-coloured delta with an arrow', () => {
    render(<Stat label="Revenue" value="$48.2k" delta="12%" trend="up" helpText="vs last month" />);
    expect(container.textContent).toContain('Revenue');
    expect(container.textContent).toContain('$48.2k');
    expect(container.textContent).toContain('12%');
    expect(container.textContent).toContain('↑'); // up arrow for the trend
    expect(container.textContent).toContain('vs last month');
    // Themed primitives (class + inline style), not bare text.
    expect(look(container.firstElementChild!)).not.toBe('|');
  });
});

describe('EmptyState - themed zero-data placeholder (pure primitive)', () => {
  it('renders the title, description, and an action slot', () => {
    render(
      <EmptyState
        title="No messages yet"
        description="They'll show up here."
        action={EMPTY_ACTION}
      />,
    );
    expect(container.textContent).toContain('No messages yet');
    expect(container.textContent).toContain("They'll show up here.");
    expect(container.querySelector('[data-testid="cta"]')).not.toBeNull();
    expect(look(container.firstElementChild!)).not.toBe('|');
  });
});

describe('Timeline - themed vertical timeline (pure primitive)', () => {
  it('renders an event row per item with title + time', () => {
    render(<Timeline items={TIMELINE_ITEMS} />);
    expect(container.textContent).toContain('Order placed');
    expect(container.textContent).toContain('Packed');
    expect(container.textContent).toContain('Out for delivery');
    expect(container.textContent).toContain('14:10');
    expect(look(container.firstElementChild!)).not.toBe('|');
  });

  it('draws an item icon in a ring in place of the dot', () => {
    const items = [
      { id: 'a', title: 'Shipped', status: 'success' as const, icon: <i data-testid="truck" /> },
      { id: 'b', title: 'Delivered' },
    ];
    render(<Timeline items={items} />);
    const ring = container.querySelector('[data-testid="truck"]')!.parentElement!;
    const style = ring.getAttribute('style') ?? '';
    expect(style).toContain('width: 24px');
    expect(style).toContain('status-success-fg');
  });

  it('alternates sides from md up and stacks in one column below it', () => {
    render(<Timeline layout="alternate" items={TIMELINE_ITEMS} />);
    const css = Array.from(document.querySelectorAll('style'), (el) => el.textContent ?? '').join(
      '\n',
    );
    // The base rule and the min-width rule each element's class carries.
    const rules = (el: Element): { base: string; md: string } => {
      const cls = (el.getAttribute('class') ?? '')
        .split(' ')
        .find((c) => css.includes(`@media (min-width: 768px) { .${c} {`))!;
      const esc = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        base: new RegExp(`(?:^|\\n)\\.${esc} \\{([^}]*)\\}`).exec(css)?.[1] ?? '',
        md:
          new RegExp(`@media \\(min-width: 768px\\) \\{ \\.${esc} \\{([^}]*)\\}`).exec(css)?.[1] ??
          '',
      };
    };
    const rows = Array.from(container.firstElementChild!.children);
    // Below md: marker then content. From md: content, marker, content.
    expect(rules(rows[0]!)).toEqual({
      base: ' grid-template-columns: auto 1fr; ',
      md: ' grid-template-columns: 1fr auto 1fr; ',
    });
    const first = rules(rows[0]!.children[1]!);
    expect(first.base).toContain('grid-column: 2');
    expect(first.md).toContain('grid-column: 1');
    expect(first.md).toContain('align-items: flex-end');
    expect(rules(rows[1]!.children[1]!).md).toContain('grid-column: 3');
  });
});

describe('AvatarGroup - overlapping avatars + overflow (pure primitive)', () => {
  it('shows up to max avatars and a +N overflow circle', () => {
    render(<AvatarGroup avatars={AVATARS} max={3} />);
    // 5 avatars, max 3 → +2 overflow.
    expect(container.textContent).toContain('+2');
    // Shown avatars fall back to initials (no src) - "Jane Doe" → "JD".
    expect(container.textContent).toContain('JD');
    expect(container.querySelector('[aria-label="2 more"]')).not.toBeNull();
  });
});

describe('Chip - removable tag (pure primitive)', () => {
  it('renders the label and fires onRemove from the × button', () => {
    chipRemoved = false;
    render(<Chip onRemove={onChipRemove}>React</Chip>);
    expect(container.textContent).toContain('React');
    const btn = container.querySelector('[aria-label="Remove"]') as HTMLElement;
    expect(btn).not.toBeNull();
    click(btn);
    expect(chipRemoved).toBe(true);
  });

  it('toggles as a filter with aria-pressed, apart from its remove button', () => {
    const onSelectedChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip
        data-testid="chip"
        defaultSelected={false}
        onSelectedChange={onSelectedChange}
        onRemove={onRemove}
      >
        Design
      </Chip>,
    );
    const toggle = container.querySelector('button[aria-pressed]') as HTMLElement;
    expect(toggle.textContent).toBe('Design');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    const chip = toggle.parentElement!;
    const before = chip.getAttribute('style') ?? '';
    click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
    expect(chip.getAttribute('style') ?? '').toContain('action-primary-bg');
    expect(before).not.toContain('action-primary-bg');
    // The remove button is its own target: it removes without toggling.
    click(container.querySelector('[aria-label="Remove"]')!);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(toggle.contains(container.querySelector('[aria-label="Remove"]'))).toBe(false);
  });

  it('follows a controlled selected, and stays a plain tag without one', () => {
    render(
      <>
        <Chip selected>On</Chip>
        <Chip>Plain</Chip>
      </>,
    );
    const pressed = container.querySelectorAll('button[aria-pressed]');
    expect(pressed.length).toBe(1);
    expect(pressed[0]!.getAttribute('aria-pressed')).toBe('true');
    click(pressed[0]!);
    expect(pressed[0]!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Banner - full-width announcement (pure primitive)', () => {
  it('renders an intent-toned bar (role=alert) with a dismiss button', () => {
    bannerDismissed = false;
    render(
      <Banner intent="warning" title="Maintenance" onDismiss={onBannerDismiss}>
        Read-only soon.
      </Banner>,
    );
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toContain('Maintenance');
    // The warning intent drives the soft tint from the `status` tokens.
    expect(el.getAttribute('style') ?? '').toContain('status-warning-tint');
    click(container.querySelector('[aria-label="Dismiss"]')!);
    expect(bannerDismissed).toBe(true);
  });
});

describe('FormField - label + control a11y wiring (pure primitive)', () => {
  it('wires htmlFor/id and sets aria-invalid + aria-describedby on error', () => {
    render(
      <FormField label="Email" required error="Required">
        <input data-testid="inp" />
      </FormField>,
    );
    const input = container.querySelector('[data-testid="inp"]') as HTMLElement;
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(input.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toContain('Required');
  });
});

describe('SegmentedControl - single-select segments (pure primitive)', () => {
  it('renders a radiogroup and selects a segment on click', () => {
    segValue = '';
    render(
      <SegmentedControl
        aria-label="View"
        defaultValue="list"
        options={SEG_OPTIONS}
        onValueChange={onSegChange}
      />,
    );
    expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(2);
    expect(radios[0]!.getAttribute('aria-checked')).toBe('true');
    click(radios[1]!);
    expect(radios[1]!.getAttribute('aria-checked')).toBe('true');
    expect(segValue).toBe('grid');
  });
});

describe('DataTable - themed grid over the headless DataTable', () => {
  it('themes the grid and marks the sorted column with an arrow', () => {
    const rows = [
      { id: 'a', n: 'Cara' },
      { id: 'b', n: 'Abe' },
    ];
    render(
      <DataTable
        data={rows}
        getRowId={(r) => r.id}
        columns={[{ id: 'n', header: 'Name', value: (r) => r.n, sortable: true }]}
        selectionMode="single"
        defaultSelected={['a']}
        aria-label="People"
      />,
    );
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    expect(grid.getAttribute('style') ?? '').toContain('var(--colors-surface-raised');
    const head = container.querySelector('[role="columnheader"]') as HTMLElement;
    click(head);
    expect(head.getAttribute('aria-sort')).toBe('ascending');
    expect(head.textContent).toBe('Name ▲');
    const selectedRow = container.querySelector('[aria-selected="true"]') as HTMLElement;
    expect(selectedRow.getAttribute('style') ?? '').toContain('status-info-tint');
  });
});
