export const Colors = {
  // Cool near-black base with a faint violet cast (neo / liquid-glass).
  bg: '#0A0A0F',
  surface: '#15151E', // solid fallback behind glass
  elevated: '#1E1E2A',

  ink: '#F4F5FA',
  ink2: 'rgba(244,245,250,0.66)',
  ink3: 'rgba(244,245,250,0.44)',
  ink4: 'rgba(244,245,250,0.24)',

  hairline: 'rgba(255,255,255,0.10)',
  hairline2: 'rgba(255,255,255,0.05)',

  // Vibrant violet→pink accent. `accent` is the light tint that reads on dark
  // (text, icons, links); `accent2` is the saturated fill; `accentPink` the
  // warm pole of the brand gradient.
  accent: '#B7A4FF',
  accent2: '#7C5CFF',
  accentPink: '#FF5E9C',
  accentTint: 'rgba(183,164,255,0.14)',

  // Content that sits on a saturated accent fill / brand gradient.
  onAccent: '#FFFFFF',

  // Glass surfaces — translucent white; web layers a backdrop blur (see Glass).
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.14)',

  coin: '#FFC24B',
  success: '#3DDC97',

  black: '#0A0A0F',
  white: '#FFFFFF',
} as const;

// Brand gradient — pink → violet → indigo. The signature neo-Instagram sweep,
// used on primary CTAs, the wordmark, and hero accents.
export const Gradients = {
  brand: ['#FF5E9C', '#A24BFF', '#6B6CFF'] as [string, string, string],
  brandSoft: ['rgba(255,94,156,0.18)', 'rgba(107,108,255,0.18)'] as [string, string],
} as const;

export const Fonts = {
  // Display = Plus Jakarta Sans (modern geometric). Body/labels = Geist
  // (neo-grotesque). Mono = Geist Mono.
  display: 'PlusJakartaSans_800ExtraBold',
  displayItalic: 'PlusJakartaSans_700Bold_Italic',
  display600: 'PlusJakartaSans_700Bold',
  sans300: 'Geist_300Light',
  sans: 'Geist_400Regular',
  sans500: 'Geist_500Medium',
  sans600: 'Geist_600SemiBold',
  sans700: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  mono500: 'GeistMono_500Medium',
} as const;

/**
 * Display type style with a safe line-height. The display face is now a sans,
 * but keep the generous multiplier — tight leading on big geometric headings
 * still clips descenders on Android.
 */
export function displayType(fontSize: number, italic = false) {
  return {
    fontFamily: italic ? Fonts.displayItalic : Fonts.display,
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.12),
    letterSpacing: fontSize >= 28 ? -0.5 : -0.2,
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
  sm: 6,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 100,
} as const;
