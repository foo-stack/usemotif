'use client';

import { FileUpload as HeadlessFileUpload, type FileRejection } from '@usemotif/headless';
import { useCallback, type CSSProperties, type ReactNode } from 'react';
import { Pressable, useMessages } from 'usemotif';
import { platformText } from './_platform-text.js';

export interface FileUploadProps {
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
  readonly onFiles?: (files: File[]) => void;
  /** Largest file accepted, in bytes. */
  readonly maxSize?: number;
  /** Most files taken from one pick or drop, with `multiple`. */
  readonly maxFiles?: number;
  /** Every refused file from a pick or drop, and why: `type`, `size`, or `count`. */
  readonly onReject?: (rejections: FileRejection<File>[]) => void;
  /** Prompt shown inside the drop zone. */
  readonly label?: ReactNode;
}

const DASHED: CSSProperties = { borderStyle: 'dashed' };

/**
 * A themed drag-and-drop file dropzone over the accessible headless `FileUpload`
 * (hidden `<input type="file">`, drag depth tracking, `accept`/`multiple`
 * gating). The zone highlights while dragging and opens the picker on click.
 *
 * ```tsx
 * <FileUpload accept="image/*" multiple onFiles={(files) => upload(files)} />
 * ```
 */
const ZONE_TEXT = { color: '$colors.text.muted', fontSize: '$fontSizes.sm' } as const;

export function FileUpload({ label: ownLabel, ...rest }: FileUploadProps) {
  const messages = useMessages();
  const label = ownLabel ?? messages.dropFiles;
  const renderZone = useCallback(
    (info: { isDragging: boolean; openPicker: () => void }): ReactNode => (
      <Pressable
        // A div on web, as before: the hidden file input is the control.
        as="div"
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        px="$space.5"
        py="$space.6"
        borderWidth={2}
        borderRadius="$radii.lg"
        borderColor={info.isDragging ? '$colors.action.primary.bg' : '$colors.border.strong'}
        bg={info.isDragging ? '$colors.surface.muted' : '$colors.surface.base'}
        color="$colors.text.muted"
        fontSize="$fontSizes.sm"
        cursor="pointer"
        transition="border-color 120ms ease, background-color 120ms ease"
        style={DASHED}
        onPress={info.openPicker}
      >
        {platformText(label, ZONE_TEXT)}
      </Pressable>
    ),
    [label],
  );
  return <HeadlessFileUpload {...rest}>{renderZone}</HeadlessFileUpload>;
}
