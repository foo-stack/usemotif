import { describe, expect, it } from 'vitest';
import {
  GROUP_ATTRIBUTE,
  PSEUDO_SELECTOR,
  PSEUDO_STATE_PROP_NAMES,
  PSEUDO_STATE_PROPS,
  STYLE_PROP_NAMES,
  isPseudoStateProp,
  isStyleProp,
  serializeFontVariationSettings,
} from './style-props.js';

describe('style-props', () => {
  it('isStyleProp recognises known props', () => {
    expect(isStyleProp('p')).toBe(true);
    expect(isStyleProp('bg')).toBe(true);
    expect(isStyleProp('flexDirection')).toBe(true);
  });

  it('isStyleProp rejects unknown keys', () => {
    expect(isStyleProp('id')).toBe(false);
    expect(isStyleProp('_hover')).toBe(false);
    expect(isStyleProp('onClick')).toBe(false);
  });

  it('STYLE_PROP_NAMES contains every entry exactly once', () => {
    expect(STYLE_PROP_NAMES.size).toBeGreaterThan(40);
    expect(STYLE_PROP_NAMES.has('p')).toBe(true);
    expect(STYLE_PROP_NAMES.has('_hover')).toBe(false);
  });

  it('recognises the text-flow family (whiteSpace, wordBreak, overflowWrap, hyphens, textOverflow)', () => {
    expect(isStyleProp('whiteSpace')).toBe(true);
    expect(isStyleProp('wordBreak')).toBe(true);
    expect(isStyleProp('overflowWrap')).toBe(true);
    expect(isStyleProp('hyphens')).toBe(true);
    expect(isStyleProp('textOverflow')).toBe(true);
  });

  it('recognises the background-* family (image / positioning / sizing / blending)', () => {
    expect(isStyleProp('background')).toBe(true);
    expect(isStyleProp('backgroundImage')).toBe(true);
    expect(isStyleProp('backgroundPosition')).toBe(true);
    expect(isStyleProp('backgroundRepeat')).toBe(true);
    expect(isStyleProp('backgroundSize')).toBe(true);
    expect(isStyleProp('backgroundOrigin')).toBe(true);
    expect(isStyleProp('backgroundClip')).toBe(true);
    expect(isStyleProp('backgroundAttachment')).toBe(true);
    expect(isStyleProp('backgroundBlendMode')).toBe(true);
  });
});

describe('pseudo-state schema', () => {
  it('exposes the pseudo-state prop names', () => {
    expect(PSEUDO_STATE_PROP_NAMES).toEqual([
      '_hover',
      '_focus',
      '_active',
      '_disabled',
      '_checked',
      '_selected',
      '_expanded',
      '_invalid',
      '_pressed',
      '_focusWithin',
      '_readOnly',
      '_groupHover',
      '_groupFocus',
      '_groupActive',
    ]);
  });

  it('isPseudoStateProp recognises pseudo names and rejects others', () => {
    expect(isPseudoStateProp('_hover')).toBe(true);
    expect(isPseudoStateProp('_focus')).toBe(true);
    expect(isPseudoStateProp('_active')).toBe(true);
    expect(isPseudoStateProp('_disabled')).toBe(true);
    expect(isPseudoStateProp('_checked')).toBe(true);
    expect(isPseudoStateProp('_selected')).toBe(true);
    expect(isPseudoStateProp('_expanded')).toBe(true);
    expect(isPseudoStateProp('p')).toBe(false);
    expect(isPseudoStateProp('hover')).toBe(false);
  });

  it('PSEUDO_STATE_PROPS membership matches the name list', () => {
    expect(PSEUDO_STATE_PROPS.size).toBe(14);
    for (const name of PSEUDO_STATE_PROP_NAMES) {
      expect(PSEUDO_STATE_PROPS.has(name)).toBe(true);
    }
  });

  it('maps _focus to :focus-visible (deliberate over :focus)', () => {
    expect(PSEUDO_SELECTOR._focus).toBe(':focus-visible');
  });

  it('maps _checked / _selected to their :checked / [aria-selected] selectors', () => {
    expect(PSEUDO_SELECTOR._checked).toBe('&:checked, &[aria-checked="true"]');
    expect(PSEUDO_SELECTOR._selected).toBe('&[aria-selected="true"]');
  });

  it('maps _expanded to the [aria-expanded] selector', () => {
    expect(PSEUDO_SELECTOR._expanded).toBe('&[aria-expanded="true"]');
  });

  it('maps the ARIA-driven states to attributes, not the over-eager pseudo-classes', () => {
    // `:invalid` matches an untouched required field; `:read-only` matches a plain div.
    expect(PSEUDO_SELECTOR._invalid).toBe('&[aria-invalid="true"]');
    expect(PSEUDO_SELECTOR._readOnly).toBe('&[readonly], &[aria-readonly="true"]');
    expect(PSEUDO_SELECTOR._pressed).toBe('&[aria-pressed="true"]');
    expect(PSEUDO_SELECTOR._focusWithin).toBe(':focus-within');
  });

  it('keys the group states on an ancestor carrying the group attribute', () => {
    expect(GROUP_ATTRIBUTE).toBe('data-motif-group');
    expect(PSEUDO_SELECTOR._groupHover).toBe('[data-motif-group]:hover &');
    expect(PSEUDO_SELECTOR._groupFocus).toBe('[data-motif-group]:focus-visible &');
    expect(PSEUDO_SELECTOR._groupActive).toBe('[data-motif-group]:active &');
  });

  it('maps _disabled to a selector that covers both :disabled and aria-disabled', () => {
    expect(PSEUDO_SELECTOR._disabled).toContain(':disabled');
    expect(PSEUDO_SELECTOR._disabled).toContain('aria-disabled');
  });

  it('maps _hover and _active to their plain CSS pseudo-classes', () => {
    expect(PSEUDO_SELECTOR._hover).toBe(':hover');
    expect(PSEUDO_SELECTOR._active).toBe(':active');
  });
});

describe('motion prop schema (membership)', () => {
  it('isStyleProp does not match motion prop names', async () => {
    const { isMotionProp } = await import('./style-props.js');
    expect(isMotionProp('enterStyle')).toBe(true);
    expect(isStyleProp('enterStyle')).toBe(false);
    expect(isPseudoStateProp('enterStyle')).toBe(false);
  });
});

describe('display props (1.4)', () => {
  it('recognises fontVariationSettings as a style prop', () => {
    expect(isStyleProp('fontVariationSettings')).toBe(true);
  });

  it('recognises maskImage and WebkitMaskImage as style props', () => {
    expect(isStyleProp('maskImage')).toBe(true);
    expect(isStyleProp('WebkitMaskImage')).toBe(true);
  });

  it('recognises clipPath as a style prop', () => {
    expect(isStyleProp('clipPath')).toBe(true);
  });
});

describe('container query props (1.5)', () => {
  it('recognises containerType as a style prop', () => {
    expect(isStyleProp('containerType')).toBe(true);
  });

  it('recognises containerName as a style prop', () => {
    expect(isStyleProp('containerName')).toBe(true);
  });
});

describe('grid layout props (1.7)', () => {
  it('recognises grid-template props', () => {
    expect(isStyleProp('gridTemplateColumns')).toBe(true);
    expect(isStyleProp('gridTemplateRows')).toBe(true);
    expect(isStyleProp('gridTemplateAreas')).toBe(true);
    expect(isStyleProp('gridTemplate')).toBe(true);
  });

  it('recognises grid-placement props', () => {
    expect(isStyleProp('gridColumn')).toBe(true);
    expect(isStyleProp('gridColumnStart')).toBe(true);
    expect(isStyleProp('gridColumnEnd')).toBe(true);
    expect(isStyleProp('gridRow')).toBe(true);
    expect(isStyleProp('gridRowStart')).toBe(true);
    expect(isStyleProp('gridRowEnd')).toBe(true);
    expect(isStyleProp('gridArea')).toBe(true);
  });

  it('recognises grid-auto and place-* props', () => {
    expect(isStyleProp('gridAutoRows')).toBe(true);
    expect(isStyleProp('gridAutoColumns')).toBe(true);
    expect(isStyleProp('gridAutoFlow')).toBe(true);
    expect(isStyleProp('placeItems')).toBe(true);
    expect(isStyleProp('placeContent')).toBe(true);
    expect(isStyleProp('placeSelf')).toBe(true);
  });
});

describe('transform props (1.7)', () => {
  it('recognises transform and transform-origin', () => {
    expect(isStyleProp('transform')).toBe(true);
    expect(isStyleProp('transformOrigin')).toBe(true);
  });

  it('recognises 3d-transform helpers', () => {
    expect(isStyleProp('transformBox')).toBe(true);
    expect(isStyleProp('transformStyle')).toBe(true);
    expect(isStyleProp('perspective')).toBe(true);
    expect(isStyleProp('perspectiveOrigin')).toBe(true);
    expect(isStyleProp('backfaceVisibility')).toBe(true);
  });
});

describe('serializeFontVariationSettings', () => {
  it('serializes a single axis', () => {
    expect(serializeFontVariationSettings({ opsz: 36 })).toBe("'opsz' 36");
  });

  it('serializes multiple axes in insertion order, comma-joined', () => {
    expect(serializeFontVariationSettings({ opsz: 36, wght: 600, SOFT: 50 })).toBe(
      "'opsz' 36, 'wght' 600, 'SOFT' 50",
    );
  });

  it('skips axes whose value is undefined', () => {
    // Using a runtime object with explicit undefined to mirror the index-
    // signature shape; the typed common-axis fields cannot be assigned
    // `undefined` directly under `exactOptionalPropertyTypes`.
    const input: { [axis: string]: number | undefined } = {
      opsz: 36,
      wght: undefined,
      SOFT: 50,
    };
    expect(serializeFontVariationSettings(input)).toBe("'opsz' 36, 'SOFT' 50");
  });

  it('returns an empty string for an empty object', () => {
    expect(serializeFontVariationSettings({})).toBe('');
  });

  it('preserves uppercase foundry-specific axis tags', () => {
    expect(serializeFontVariationSettings({ GRAD: -200, WONK: 1 })).toBe("'GRAD' -200, 'WONK' 1");
  });

  it('emits zero values (does not treat 0 as missing)', () => {
    expect(serializeFontVariationSettings({ ital: 0, slnt: 0 })).toBe("'ital' 0, 'slnt' 0");
  });
});
