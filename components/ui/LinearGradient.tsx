import { useMemo } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';

type Props = {
  colors: readonly string[];
  locations?: readonly number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const SIZE = 256;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function parseColor(c: string): [number, number, number, number] {
  if (c === 'transparent') return [0, 0, 0, 0];
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1];
  const h = c.replace('#', '');
  if (h.length === 3)
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), 1];
  if (h.length === 6)
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      1,
    ];
  return [0, 0, 0, 1];
}

const CRC_T: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_T[n] = c;
}
function crc32(d: number[]) {
  let c = ~0;
  for (let i = 0; i < d.length; i++) c = CRC_T[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ ~0) >>> 0;
}
function adler32(d: number[]) {
  let a = 1,
    b = 0;
  for (let i = 0; i < d.length; i++) {
    a = (a + d[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function be32(v: number) {
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
}
function chunk(type: number[], data: number[]) {
  const p = [...type, ...data];
  return [...be32(data.length), ...p, ...be32(crc32(p))];
}
function toB64(bytes: number[]) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1] ?? 0,
      c = bytes[i + 2] ?? 0;
    s += B64[a >> 2];
    s += B64[((a & 3) << 4) | (b >> 4)];
    s += i + 1 < bytes.length ? B64[((b & 0xf) << 2) | (c >> 6)] : '=';
    s += i + 2 < bytes.length ? B64[c & 0x3f] : '=';
  }
  return s;
}

function buildUri(colors: readonly string[], locs: readonly number[], vertical: boolean): string {
  const parsed = colors.map(parseColor);
  const w = vertical ? 1 : SIZE;
  const h = vertical ? SIZE : 1;
  const dim = vertical ? h : w;

  const raw: number[] = [];
  for (let row = 0; row < h; row++) {
    raw.push(0);
    for (let col = 0; col < w; col++) {
      const t = (vertical ? row : col) / (dim - 1);
      let seg = 0;
      for (let j = 0; j < locs.length - 1; j++) if (t >= locs[j]) seg = j;
      const s0 = locs[seg],
        s1 = locs[Math.min(seg + 1, locs.length - 1)];
      const f = s1 === s0 ? 0 : Math.max(0, Math.min(1, (t - s0) / (s1 - s0)));
      const a = parsed[seg],
        b = parsed[Math.min(seg + 1, parsed.length - 1)];
      raw.push(
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
        Math.round((a[3] + (b[3] - a[3]) * f) * 255),
      );
    }
  }

  const len = raw.length;
  const deflate = [0x01, len & 0xff, (len >> 8) & 0xff, ~len & 0xff, (~len >> 8) & 0xff, ...raw];
  const ad = adler32(raw);
  const zlib = [0x78, 0x01, ...deflate, ...be32(ad)];

  const png = [
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk([73, 72, 68, 82], [...be32(w), ...be32(h), 8, 6, 0, 0, 0]),
    ...chunk([73, 68, 65, 84], zlib),
    ...chunk([73, 69, 78, 68], []),
  ];

  return `data:image/png;base64,${toB64(png)}`;
}

export function LinearGradient({ colors, locations, start, end, style, children }: Props) {
  const isHorizontal =
    start != null && end != null && Math.abs(end.x - start.x) > Math.abs(end.y - start.y);
  const locs = locations ? [...locations] : colors.map((_, i) => i / (colors.length - 1));
  const key = `${colors.join(',')}|${locs.join(',')}|${isHorizontal}`;

  const uri = useMemo(() => buildUri(colors, locs, !isHorizontal), [key]);

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        contentFit="fill"
      />
      {children}
    </View>
  );
}
