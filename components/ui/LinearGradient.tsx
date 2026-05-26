import { View, type ViewStyle, type StyleProp } from 'react-native';

type Props = {
  colors: readonly string[];
  locations?: readonly number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const STEPS = 10;

function parseColor(color: string): [number, number, number, number] {
  if (color === 'transparent') return [0, 0, 0, 0];

  const rgba = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return [+rgba[1], +rgba[2], +rgba[3], rgba[4] != null ? +rgba[4] : 1];
  }

  const hex = color.replace('#', '');
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16), 1];
  }
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
}

function lerp(a: [number, number, number, number], b: [number, number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  const al = +(a[3] + (b[3] - a[3]) * t).toFixed(3);
  return `rgba(${r},${g},${bl},${al})`;
}

export function LinearGradient({ colors, locations, start, end, style, children }: Props) {
  const isHorizontal = start != null && end != null && Math.abs(end.x - start.x) > Math.abs(end.y - start.y);
  const parsed = colors.map(parseColor);
  const locs = locations ? [...locations] : colors.map((_, i) => i / (colors.length - 1));

  const bands: string[] = [];
  for (let i = 0; i < STEPS; i++) {
    const t = i / (STEPS - 1);
    let seg = 0;
    for (let j = 0; j < locs.length - 1; j++) {
      if (t >= locs[j]) seg = j;
    }
    const sStart = locs[seg];
    const sEnd = locs[Math.min(seg + 1, locs.length - 1)];
    const st = sEnd === sStart ? 0 : (t - sStart) / (sEnd - sStart);
    bands.push(lerp(parsed[seg], parsed[Math.min(seg + 1, parsed.length - 1)], Math.max(0, Math.min(1, st))));
  }

  return (
    <View style={style}>
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          flexDirection: isHorizontal ? 'row' : 'column',
          overflow: 'hidden',
        }}
      >
        {bands.map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      {children}
    </View>
  );
}
