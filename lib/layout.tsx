// Responsive layout primitives for the web build. On native (and true phone
// viewports) everything here is a no-op passthrough — phone layouts stay exactly
// as designed. On web, once the viewport is wide enough to look like a stretched
// phone, screens switch to their real "web app" composition (top nav, centered
// max-width content, multi-column grids) instead of a single phone column blown
// up edge-to-edge.
import type { ReactNode } from 'react';
import { Platform, View, useWindowDimensions, type ViewStyle } from 'react-native';

// The web layout tiers. Anything ≥ DESKTOP_MIN is treated as a real web app
// surface (tablet, laptop, desktop). Below it is a phone — even on web — and
// keeps the mobile composition. 768 is the standard tablet breakpoint and is
// where a stretched phone column starts to read as "unfinished".
export const DESKTOP_MIN = 768;
// Where the layout has enough room for the roomier, wider desktop treatment
// (bigger gutters, more grid columns, side-by-side detail pages).
export const WIDE_MIN = 1024;
// Wide, Netflix-portal content column.
export const CONTENT_MAX = 1320;

const isWeb = Platform.OS === 'web';

export function useIsWeb(): boolean {
  return isWeb;
}

/** Real "web app" surface: web AND wide enough to not look like a stretched phone. */
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return isWeb && width >= DESKTOP_MIN;
}

/** The roomier desktop tier (≥1024) — distinct from the tablet tier (768–1023). */
export function useIsWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return isWeb && width >= WIDE_MIN;
}

/** Width screens should base their card/grid math on. */
export function useContentWidth(max: number = CONTENT_MAX): number {
  const { width } = useWindowDimensions();
  const gutter = useWebGutter();
  const desktop = isWeb && width >= DESKTOP_MIN;
  if (!desktop) return width;
  return Math.min(width - 2 * gutter, max);
}

/**
 * Horizontal page gutter for desktop-web surfaces — scales with the viewport so
 * a 768px tablet isn't gutter-starved and a 1440px desktop isn't cramped.
 */
export function useWebGutter(): number {
  const { width } = useWindowDimensions();
  if (!isWeb || width < DESKTOP_MIN) return 20;
  if (width < WIDE_MIN) return 24; // tablet
  if (width < 1440) return 40; // laptop
  return 56; // desktop
}

/**
 * Column count for a responsive poster grid, given a target minimum card width.
 * Mirrors `repeat(auto-fill, minmax(min, 1fr))` but returns an integer so the
 * RN flex-wrap grid can size cards exactly.
 */
export function useGridColumns(minCardWidth = 200, contentWidth?: number): number {
  const measured = useContentWidth();
  const w = contentWidth ?? measured;
  return Math.max(2, Math.floor((w + 16) / (minCardWidth + 16)));
}

/**
 * Centers children in a max-width column on wide web; renders them untouched on
 * native and true phones. Unlike a raw wrapper, this caps at `max` on ANY web
 * width ≥ max, so a phone-composition screen never stretches edge-to-edge in a
 * mid-width browser window — it becomes a centered app column instead.
 */
export function WebContent({
  children,
  max = CONTENT_MAX,
  style,
}: {
  children: ReactNode;
  max?: number;
  style?: ViewStyle;
}) {
  const { width } = useWindowDimensions();
  const shouldCenter = isWeb && width >= Math.min(max, DESKTOP_MIN);
  if (!shouldCenter) return <>{children}</>;
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={[{ width: '100%', maxWidth: max }, style]}>{children}</View>
    </View>
  );
}
