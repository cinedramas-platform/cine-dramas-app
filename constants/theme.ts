export const Colors = {
  bg: '#08070A',
  surface: '#15110E',
  elevated: '#1E1A14',

  ink: '#FAF6EE',
  ink2: 'rgba(250,246,238,0.62)',
  ink3: 'rgba(250,246,238,0.40)',
  ink4: 'rgba(250,246,238,0.22)',

  hairline: 'rgba(255,255,255,0.08)',
  hairline2: 'rgba(255,255,255,0.04)',

  accent: '#E8C570',
  accent2: '#C9A857',
  accentTint: 'rgba(232,197,112,0.12)',

  coin: '#F1B844',
  success: '#4ADE80',

  black: '#0A0A0B',
  white: '#FFFFFF',
} as const;

export const Fonts = {
  display: 'PlayfairDisplay_500Medium',
  displayItalic: 'PlayfairDisplay_500Medium_Italic',
  display600: 'PlayfairDisplay_600SemiBold',
  sans300: 'Geist_300Light',
  sans: 'Geist_400Regular',
  sans500: 'Geist_500Medium',
  sans600: 'Geist_600SemiBold',
  sans700: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  mono500: 'GeistMono_500Medium',
} as const;

/**
 * Display (serif) type style with a safe line-height. Android clips serif
 * ascenders/descenders whenever lineHeight < fontSize — never hand-tune below
 * 1.12x for the display face.
 */
export function displayType(fontSize: number, italic = false) {
  return {
    fontFamily: italic ? Fonts.displayItalic : Fonts.display,
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.12),
  } as const;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 18,
  pill: 100,
} as const;
