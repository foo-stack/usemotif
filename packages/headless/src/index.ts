/**
 * @usemotif/headless - accessible behavior components for motif-js.
 *
 * Headless: behaviour + a11y wiring, no styling. Each component
 * exposes a small surface (Root / Trigger / Content / etc.) that
 * composes the visual primitives from `@usemotif/react`. Build
 * fully-styled components on top of these in your app.
 *
 * **This barrel deliberately carries no `'use client'` directive.** The
 * components live in `./client.js`, which does; this module re-exports them,
 * so each name arrives here already a client reference. That is what lets a
 * Server Component import from this package at all.
 *
 * It also lets a compound component cross the boundary. A client reference is
 * a proxy that exposes named exports and nothing else, so reaching *through*
 * one - `Dialog.Root` where `Dialog` is an object the client module exported -
 * yields `undefined` and the render dies. Assembling the namespace here
 * instead, out of parts the client module exports flat, gives an object whose
 * every property is itself a client reference: a valid element type on either
 * side of the boundary.
 */

import {
  AccordionItem,
  AccordionRoot,
  AlertDialogContent,
  AlertDialogRoot,
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
  ComboboxInput,
  ComboboxList,
  ComboboxRoot,
  CommandPaletteBreadcrumb,
  CommandPaletteInput,
  CommandPaletteList,
  CommandPaletteRoot,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  DrawerContent,
  DrawerRoot,
  HoverCardContent,
  HoverCardRoot,
  HoverCardTrigger,
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuCheckboxItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  MultiSelectChips,
  MultiSelectInput,
  MultiSelectList,
  MultiSelectRoot,
  MultiSelectSelectAll,
  PopoverClose,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
  SearchRoot,
  SelectRoot,
  SelectTrigger,
  SheetContent,
  TabsList,
  TabsPanel,
  TabsRoot,
  TabsTab,
  FloatingArrow,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from './client.js';

/**
 * The namespaces, built here in the server graph out of client references.
 *
 * An object exported from the client chunk would arrive as a proxy, and
 * `Menu.Root` would read a property that does not exist on it. Built this way,
 * every property is itself a client reference and so a valid element type.
 *
 * This is also where the reuse between namespaces is resolved. `AlertDialog`,
 * `Drawer` and `Sheet` share four of Dialog's parts, `Accordion` shares two of
 * Collapsible's, `ContextMenu` shares Menu's item, separator, submenu, checkbox, radio and label parts, `Search` shares
 * Combobox's input and list, and `Select` shares its list alone. Sharing a part
 * means sharing the identical client reference, not a copy.
 */
export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: DialogTrigger,
  Content: AlertDialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

export const Drawer = {
  Root: DrawerRoot,
  Trigger: DialogTrigger,
  Content: DrawerContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

export const Sheet = {
  Root: DrawerRoot,
  Trigger: DialogTrigger,
  Content: SheetContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};

export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
  Arrow: FloatingArrow,
};

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Close: PopoverClose,
  Arrow: FloatingArrow,
};

export const HoverCard = {
  Root: HoverCardRoot,
  Trigger: HoverCardTrigger,
  Content: HoverCardContent,
  Arrow: FloatingArrow,
};

export const Menu = {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Label: MenuLabel,
};

export const ContextMenu = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Label: MenuLabel,
};

export const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
};

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
};

export const Combobox = {
  Root: ComboboxRoot,
  Input: ComboboxInput,
  List: ComboboxList,
};

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  List: ComboboxList,
};

export const Search = {
  Root: SearchRoot,
  Input: ComboboxInput,
  List: ComboboxList,
};

export const MultiSelect = {
  Root: MultiSelectRoot,
  Input: MultiSelectInput,
  Chips: MultiSelectChips,
  List: MultiSelectList,
  SelectAll: MultiSelectSelectAll,
};

export const CommandPalette = {
  Root: CommandPaletteRoot,
  Input: CommandPaletteInput,
  List: CommandPaletteList,
  Breadcrumb: CommandPaletteBreadcrumb,
};

export {
  Adapt,
  Breadcrumb,
  Calendar,
  Checkbox,
  ColorPicker,
  configureViewportBreakpoints,
  DatePicker,
  defaultFuzzyMatch,
  FileUpload,
  Listbox,
  NavigationMenu,
  PACKAGE_NAME,
  Pagination,
  PinInput,
  Progress,
  Radio,
  RadioGroup,
  RangeSlider,
  RatingInput,
  Slider,
  Stepper,
  Switch,
  TagsInput,
  TimeInput,
  Toast,
  Toaster,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  TreeView,
  useCommandPaletteShortcut,
  useControllableState,
  useDialogState,
  useReducedMotion,
  useShortcut,
  useToast,
} from './client.js';

export type {
  AccordionItemProps,
  AccordionRootProps,
  AdaptProps,
  BreadcrumbProps,
  CalendarBaseProps,
  CalendarDayInfo,
  CalendarProps,
  CheckboxProps,
  CollapsibleRootProps,
  ColorPickerProps,
  ComboboxOption,
  ComboboxRootProps,
  Command,
  CommandPaletteBreadcrumbProps,
  CommandPaletteListProps,
  CommandPaletteRootProps,
  ContextMenuContentProps,
  ContextMenuRootProps,
  ContextMenuTriggerProps,
  DatePickerOptions,
  DatePickerProps,
  DateRange,
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogRootProps,
  DialogTitleProps,
  DialogTriggerProps,
  DrawerContentProps,
  FileRejection,
  FileRejectionReason,
  FileUploadProps,
  HoverCardContentProps,
  HoverCardRootProps,
  HoverCardTriggerProps,
  ListboxBaseProps,
  ListboxProps,
  MenuContentProps,
  MenuCheckboxItemProps,
  MenuItemProps,
  MenuLabelProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuSubContentProps,
  MenuSubProps,
  MenuSubTriggerProps,
  MenuRootProps,
  MenuTriggerProps,
  MultiSelectRootProps,
  MultiListboxProps,
  MultiTreeViewProps,
  NavigationMenuItem,
  NavigationMenuProps,
  PaginationProps,
  PinInputProps,
  PinType,
  Placement,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverRootProps,
  PopoverTriggerProps,
  ProgressProps,
  RadioGroupProps,
  RadioProps,
  RangeCalendarProps,
  RangeDatePickerProps,
  RangeSliderProps,
  RatingInputProps,
  SelectRootProps,
  SliderMark,
  SliderProps,
  StepperProps,
  StepperStep,
  SwitchProps,
  TabsPanelProps,
  TabsRootProps,
  TabsTabProps,
  TagInfo,
  TagsInputProps,
  TimeInputProps,
  ToastContent,
  ToasterProps,
  ToastFn,
  ToastItem,
  ToastPlacement,
  ToastPromiseMessages,
  ToggleGroupItemProps,
  ToggleGroupProps,
  ToggleProps,
  ToolbarProps,
  FloatingArrowProps,
  TooltipContentProps,
  TooltipProviderProps,
  TooltipRootProps,
  TooltipTriggerProps,
  TreeNode,
  TreeNodeInfo,
  TreeViewBaseProps,
  TreeViewProps,
  UseControllableStateOptions,
  UseShortcutOptions,
} from './client.js';
