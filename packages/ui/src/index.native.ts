/**
 * `@usemotif/ui` on React Native, served by the package's `react-native` export
 * condition. The display components; the overlay, form and navigation
 * families are web only for now.
 */

import { CardBody, CardFooter, CardHeader, CardMedia, CardRoot } from './Card.native.js';

/** `Card`, with `Card.Header`, `Card.Body`, `Card.Footer` and `Card.Media` parts. */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Media: CardMedia,
});

export { Badge, type BadgeProps } from './Badge.native.js';
export { Button, type ButtonProps } from './Button.native.js';
export { TextField, type TextFieldProps } from './TextField.native.js';
export { Alert, type AlertIntent, type AlertProps } from './Alert.js';
export { Banner, type BannerIntent, type BannerProps } from './Banner.js';
export { Chip, type ChipIntent, type ChipProps } from './Chip.native.js';
export { Spinner, type SpinnerProps } from './Spinner.js';
export { Skeleton, type SkeletonProps } from './Skeleton.native.js';
export { Progress, type ProgressProps } from './Progress.native.js';
export { ProgressCircle, type ProgressCircleProps } from './ProgressCircle.native.js';
