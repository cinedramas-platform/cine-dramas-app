import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type P = { size?: number; color?: string; fill?: string };

export function SearchIcon({ size = 20, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={1.6} />
      <Path d="m20 20-3.5-3.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function HomeIcon({ size = 22, color = '#fff', filled = false }: P & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke={filled ? undefined : color}
        strokeWidth={filled ? undefined : 1.6}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function FeedIcon({ size = 22, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={3} width={14} height={18} rx={2} stroke={color} strokeWidth={1.6} />
      <Path d="M10.5 9.5v5l4-2.5-4-2.5Z" fill={color} />
    </Svg>
  );
}

export function UserIcon({ size = 22, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.6} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color = '#fff', fill = 'none' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20s-7-4.4-9-9.4C1.6 6.9 4.2 4 7.5 4 9.6 4 11 5.2 12 6.6 13 5.2 14.4 4 16.5 4 19.8 4 22.4 6.9 21 10.6 19 15.6 12 20 12 20Z"
        stroke={color}
        strokeWidth={1.6}
        fill={fill}
      />
    </Svg>
  );
}

export function CommentIcon({ size = 24, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v11H8l-4 4V5Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function ShareIcon({ size = 24, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M16 6l-4-4-4 4M12 2v14"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({ size = 24, color = '#fff', fill = 'none' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3h12v18l-6-4-6 4V3Z" stroke={color} strokeWidth={1.6} fill={fill} />
    </Svg>
  );
}

export function MoreIcon({ size = 24, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={5} r={1.6} />
      <Circle cx={12} cy={12} r={1.6} />
      <Circle cx={12} cy={19} r={1.6} />
    </Svg>
  );
}

export function PlayIcon({ size = 18, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 4v16l13-8L7 4Z" />
    </Svg>
  );
}

export function PauseIcon({ size = 18, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={6} y={4} width={4} height={16} />
      <Rect x={14} y={4} width={4} height={16} />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12 4 4 10-10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = 14, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Path d="M8 11V7a4 4 0 1 1 8 0v4" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color = '#fff', direction = 'right' }: P & { direction?: 'right' | 'down' | 'left' | 'up' }) {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function CoinIcon({ size = 16 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={10} fill="#F1B844" />
      <Circle cx={12} cy={12} r={7} fill="none" stroke="#9C7320" strokeWidth={1.2} />
      <Path
        d="M12 8v8M9.5 10.5h3.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h4"
        stroke="#9C7320"
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function VipIcon({ size = 16, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 7l4 12h10l4-12-5 3-4-6-4 6-5-3Z" />
    </Svg>
  );
}

export function SparkleIcon({ size = 14, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2 14 9l7 2-7 2-2 9-2-9-7-2 7-2 2-7Z" />
    </Svg>
  );
}

export function FlameIcon({ size = 14, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4-1 4 2 5 2 5s-2-3 0-10Z" />
    </Svg>
  );
}

export function FilterIcon({ size = 18, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M6 12h12M10 18h4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function VoiceIcon({ size = 18, color = '#fff' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={12} rx={3} stroke={color} strokeWidth={1.6} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
