'use client';

/**
 * The client graph of `@usemotif/headless`.
 *
 * Every component here is interactive, so this whole module is a client
 * reference: `dist/client.js` carries the `'use client'` directive and
 * `src/index.ts` re-exports it from the server graph. The split exists so
 * that compound components can be assembled server-side out of parts that
 * are each already a client reference. See `src/index.ts` for why.
 *
 * Not a public entry point. `package.json` exports only `"."`; this chunk is
 * reachable at runtime because the barrel imports it, and nothing else.
 *
 * The barrel re-exports from here by name rather than with `export *`, so a
 * name added below does not reach consumers until it is listed there too.
 * `index.test.ts` fails on the gap rather than letting it ship silently.
 */

export const PACKAGE_NAME = '@usemotif/headless';

export {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  useDialogState,
} from './Dialog.js';
export type {
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
} from './Dialog.js';

export { AlertDialogContent, AlertDialogRoot } from './AlertDialog.js';

export { TooltipContent, TooltipRoot, TooltipTrigger } from './Tooltip.js';
export type { TooltipContentProps, TooltipRootProps, TooltipTriggerProps } from './Tooltip.js';

export { PopoverClose, PopoverContent, PopoverRoot, PopoverTrigger } from './Popover.js';
export type {
  PopoverCloseProps,
  PopoverContentProps,
  PopoverRootProps,
  PopoverTriggerProps,
} from './Popover.js';

export { HoverCardContent, HoverCardRoot, HoverCardTrigger } from './HoverCard.js';
export type {
  HoverCardContentProps,
  HoverCardRootProps,
  HoverCardTriggerProps,
} from './HoverCard.js';

export { MenuContent, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from './Menu.js';
export type { MenuContentProps, MenuItemProps, MenuRootProps, MenuTriggerProps } from './Menu.js';
export { MenuSub, MenuSubContent, MenuSubTrigger } from './MenuSub.js';
export { MenuCheckboxItem, MenuLabel, MenuRadioGroup, MenuRadioItem } from './MenuItems.js';
export type {
  MenuCheckboxItemProps,
  MenuLabelProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
} from './MenuItems.js';
export type { MenuSubContentProps, MenuSubProps, MenuSubTriggerProps } from './MenuSub.js';

export {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './ContextMenu.js';
export type {
  ContextMenuContentProps,
  ContextMenuRootProps,
  ContextMenuTriggerProps,
} from './ContextMenu.js';

export type { Placement } from './positioning.js';

export { Checkbox, Radio, RadioGroup, Switch } from './toggle.js';
export type { CheckboxProps, RadioGroupProps, RadioProps, SwitchProps } from './toggle.js';

export {
  AccordionItem,
  AccordionRoot,
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
  TabsList,
  TabsPanel,
  TabsRoot,
  TabsTab,
} from './disclosure.js';
export type {
  AccordionItemProps,
  AccordionRootProps,
  CollapsibleRootProps,
  TabsPanelProps,
  TabsRootProps,
  TabsTabProps,
} from './disclosure.js';

export { Toast, Toaster, useToast } from './Toast.js';
export type {
  ToastContent,
  ToastFn,
  ToastItem,
  ToastPromiseMessages,
  ToasterProps,
} from './Toast.js';

export {
  ComboboxInput,
  ComboboxList,
  ComboboxRoot,
  MultiSelectChips,
  MultiSelectInput,
  MultiSelectList,
  MultiSelectRoot,
  MultiSelectSelectAll,
  SearchRoot,
  SelectRoot,
  SelectTrigger,
} from './combobox.js';
export type {
  ComboboxOption,
  ComboboxRootProps,
  MultiSelectRootProps,
  SelectRootProps,
} from './combobox.js';

export {
  CommandPaletteInput,
  CommandPaletteList,
  CommandPaletteRoot,
  defaultFuzzyMatch,
  useCommandPaletteShortcut,
} from './CommandPalette.js';
export type {
  Command,
  CommandPaletteListProps,
  CommandPaletteRootProps,
} from './CommandPalette.js';

export { Progress, RangeSlider, RatingInput, Slider } from './range.js';
export type {
  ProgressProps,
  RangeSliderProps,
  RatingInputProps,
  SliderMark,
  SliderProps,
} from './range.js';

export { DrawerContent, DrawerRoot, SheetContent } from './Drawer.js';
export type { DrawerContentProps } from './Drawer.js';

export { Adapt } from './Adapt.js';
export type { AdaptProps } from './Adapt.js';
export { configureViewportBreakpoints } from './_breakpoint-config.js';

export { Calendar, DatePicker, TimeInput } from './datetime.js';
export type {
  CalendarBaseProps,
  CalendarDayInfo,
  CalendarProps,
  DatePickerOptions,
  DatePickerProps,
  DateRange,
  RangeCalendarProps,
  RangeDatePickerProps,
  TimeInputProps,
} from './datetime.js';

export { ColorPicker, FileUpload, TreeView } from './specialized.js';
export type {
  ColorPickerProps,
  FileUploadProps,
  MultiTreeViewProps,
  TreeNode,
  TreeNodeInfo,
  TreeViewBaseProps,
  TreeViewProps,
} from './specialized.js';

export { Breadcrumb, NavigationMenu, Pagination, Stepper, Toolbar } from './navigation.js';
export type {
  BreadcrumbProps,
  NavigationMenuItem,
  NavigationMenuProps,
  PaginationProps,
  StepperProps,
  StepperStep,
  ToolbarProps,
} from './navigation.js';

export { useReducedMotion } from './_use-reduced-motion.js';
export { useControllableState } from './use-controllable-state.js';
export type { UseControllableStateOptions } from './use-controllable-state.js';
