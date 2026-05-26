import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type P = { size?: number; color?: string; fill?: string };

export function SearchIcon({ size = 20, color = '#fff' }: P) {
  return <Ionicons name="search" size={size} color={color} />;
}

export function HomeIcon({ size = 22, color = '#fff', filled = false }: P & { filled?: boolean }) {
  return <Ionicons name={filled ? 'home' : 'home-outline'} size={size} color={color} />;
}

export function FeedIcon({ size = 22, color = '#fff' }: P) {
  return <Ionicons name="film-outline" size={size} color={color} />;
}

export function UserIcon({ size = 22, color = '#fff' }: P) {
  return <Ionicons name="person-outline" size={size} color={color} />;
}

export function HeartIcon({ size = 24, color = '#fff', fill = 'none' }: P) {
  const filled = fill !== 'none';
  return <Ionicons name={filled ? 'heart' : 'heart-outline'} size={size} color={filled ? fill : color} />;
}

export function CommentIcon({ size = 24, color = '#fff' }: P) {
  return <Ionicons name="chatbubble-outline" size={size} color={color} />;
}

export function ShareIcon({ size = 24, color = '#fff' }: P) {
  return <Ionicons name="share-outline" size={size} color={color} />;
}

export function BookmarkIcon({ size = 24, color = '#fff', fill = 'none' }: P) {
  const filled = fill !== 'none';
  return <Ionicons name={filled ? 'bookmark' : 'bookmark-outline'} size={size} color={filled ? fill : color} />;
}

export function MoreIcon({ size = 24, color = '#fff' }: P) {
  return <Ionicons name="ellipsis-vertical" size={size} color={color} />;
}

export function PlayIcon({ size = 18, color = '#fff' }: P) {
  return <Ionicons name="play" size={size} color={color} />;
}

export function PauseIcon({ size = 18, color = '#fff' }: P) {
  return <Ionicons name="pause" size={size} color={color} />;
}

export function PlusIcon({ size = 20, color = '#fff' }: P) {
  return <Ionicons name="add" size={size} color={color} />;
}

export function CheckIcon({ size = 18, color = '#fff' }: P) {
  return <Ionicons name="checkmark" size={size} color={color} />;
}

export function LockIcon({ size = 14, color = '#fff' }: P) {
  return <Ionicons name="lock-closed" size={size} color={color} />;
}

export function ChevronIcon({ size = 18, color = '#fff', direction = 'right' }: P & { direction?: 'right' | 'down' | 'left' | 'up' }) {
  const name = ({ right: 'chevron-forward', down: 'chevron-down', left: 'chevron-back', up: 'chevron-up' } as const)[direction];
  return <Ionicons name={name} size={size} color={color} />;
}

export function CloseIcon({ size = 20, color = '#fff' }: P) {
  return <Ionicons name="close" size={size} color={color} />;
}

export function CoinIcon({ size = 16 }: P) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F1B844', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5, fontWeight: '700', color: '#9C7320', lineHeight: size * 0.65, includeFontPadding: false }}>$</Text>
    </View>
  );
}

export function VipIcon({ size = 16, color = '#fff' }: P) {
  return <MaterialCommunityIcons name="crown" size={size} color={color} />;
}

export function SparkleIcon({ size = 14, color = '#fff' }: P) {
  return <MaterialCommunityIcons name="star-four-points" size={size} color={color} />;
}

export function FlameIcon({ size = 14, color = '#fff' }: P) {
  return <Ionicons name="flame" size={size} color={color} />;
}

export function FilterIcon({ size = 18, color = '#fff' }: P) {
  return <Ionicons name="filter" size={size} color={color} />;
}

export function VoiceIcon({ size = 18, color = '#fff' }: P) {
  return <Ionicons name="mic-outline" size={size} color={color} />;
}

export function NotificationIcon({ size = 20, color = '#fff' }: P) {
  return <Ionicons name="notifications-outline" size={size} color={color} />;
}

export function SettingsIcon({ size = 20, color = '#fff' }: P) {
  return <Ionicons name="settings-outline" size={size} color={color} />;
}

export function TargetIcon({ size = 18, color = '#fff' }: P) {
  return <MaterialCommunityIcons name="target" size={size} color={color} />;
}
