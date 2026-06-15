// Responsive layout primitives for the web build. On native (and narrow web
// viewports) everything here is a no-op passthrough — phone layouts stay
// exactly as designed. On desktop web, screens center their content and widen
// their grids instead of stretching the phone layout across the viewport.
import type { ReactNode } from 'react';
import { Platform, View, useWindowDimensions, type ViewStyle } from 'react-native';

export const DESKTOP_MIN = 1024;
// Wide, Netflix-portal content column.
export const CONTENT_MAX = 1320;

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN;
}

/** Width screens should base their card/grid math on. */
export function useContentWidth(max: number = CONTENT_MAX): number {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= DESKTOP_MIN;
  return desktop ? Math.min(width - 48, max) : width;
}

/**
 * Centers children in a max-width column on desktop web; renders them
 * untouched everywhere else.
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
  const desktop = useIsDesktopWeb();
  if (!desktop) return <>{children}</>;
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={[{ width: '100%', maxWidth: max }, style]}>{children}</View>
    </View>
  );
}
