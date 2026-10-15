/**
 * Every label and announcement motif writes itself, in headless, the kit and the platform
 * primitives. A component's own prop for a string still wins over this catalogue; the catalogue is
 * what applies when the app passes none.
 */
export interface MotifMessages {
  readonly pagination: string;
  readonly previousPage: string;
  readonly nextPage: string;
  readonly itemsPerPage: string;
  readonly perPage: (count: number) => string;
  readonly breadcrumb: string;
  readonly showHiddenBreadcrumbs: string;
  readonly primaryNavigation: string;
  readonly pinCharacter: (position: number, length: number) => string;
  readonly remove: string;
  readonly removeItem: (item: string) => string;
  readonly dismiss: string;
  readonly loading: string;
  readonly loadingOptions: string;
  readonly noOptions: string;
  readonly searchPlaceholder: string;
  readonly selectPlaceholder: string;
  readonly addPlaceholder: string;
  readonly commands: string;
  readonly commandPages: string;
  readonly noMatches: string;
  readonly commandPlaceholder: string;
  readonly noMatchingCommands: string;
  readonly resizeColumn: string;
  readonly colourPicker: string;
  readonly pickColourFromScreen: string;
  readonly pickColour: string;
  readonly swatches: string;
  readonly saturationAndValue: string;
  readonly saturationAndValueText: (saturation: number, value: number) => string;
  readonly hue: string;
  readonly alpha: string;
  readonly colourFormat: string;
  readonly pickDate: string;
  readonly pickDates: string;
  readonly previousMonth: string;
  readonly nextMonth: string;
  readonly calendarOf: (year: number, month: number) => string;
  readonly time: string;
  readonly fileUpload: string;
  readonly dropFiles: string;
  readonly moreItems: (count: number) => string;
  readonly expand: string;
  readonly collapse: string;
  readonly showPassword: string;
  readonly hidePassword: string;
}

/** The English catalogue every component falls back to. */
export const DEFAULT_MESSAGES: MotifMessages = {
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  itemsPerPage: 'Items per page',
  perPage: (count) => `${count} / page`,
  breadcrumb: 'Breadcrumb',
  showHiddenBreadcrumbs: 'Show hidden breadcrumbs',
  primaryNavigation: 'Primary',
  pinCharacter: (position, length) => `Character ${position} of ${length}`,
  remove: 'Remove',
  removeItem: (item) => `Remove ${item}`,
  dismiss: 'Dismiss',
  loading: 'Loading',
  loadingOptions: 'Loading...',
  noOptions: 'No options',
  searchPlaceholder: 'Search...',
  selectPlaceholder: 'Select...',
  addPlaceholder: 'Add...',
  commands: 'Commands',
  commandPages: 'Command pages',
  noMatches: 'No matches',
  commandPlaceholder: 'Type a command...',
  noMatchingCommands: 'No matching commands',
  resizeColumn: 'Resize column',
  colourPicker: 'Colour picker',
  pickColourFromScreen: 'Pick a colour from the screen',
  pickColour: 'Pick',
  swatches: 'Swatches',
  saturationAndValue: 'Saturation and value selector',
  saturationAndValueText: (saturation, value) => `Saturation ${saturation}%, value ${value}%`,
  hue: 'Hue',
  alpha: 'Alpha',
  colourFormat: 'Colour format',
  pickDate: 'Pick a date',
  pickDates: 'Pick dates',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  calendarOf: (year, month) => `${year}-${month} calendar`,
  time: 'Time',
  fileUpload: 'File upload',
  dropFiles: 'Drag files here, or click to browse',
  moreItems: (count) => `${count} more`,
  expand: 'Expand',
  collapse: 'Collapse',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
};

/** `base` with any of `overrides` laid over it. */
export function mergeMessages(
  base: MotifMessages,
  overrides: Partial<MotifMessages> | undefined,
): MotifMessages {
  return overrides === undefined ? base : { ...base, ...overrides };
}
