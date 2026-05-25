import { useLocalSearchParams } from 'expo-router';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';

const ALL_EPISODES: FeedEpisode[] = [
  { id: 'c1111111-0001-0001-0001-000000000001', playbackId: 'lvaEHovI902CKK2msfyfkPCUE2YZDeYtk4Au00vJq01iTE', title: 'Static', seriesName: 'The Last Signal' },
  { id: 'c1111111-0001-0001-0001-000000000002', playbackId: 'lvaEHovI902CKK2msfyfkPCUE2YZDeYtk4Au00vJq01iTE', title: 'Frequency', seriesName: 'The Last Signal' },
  { id: 'c1111111-0001-0001-0001-000000000003', playbackId: 'SIy9YkrXcJYzELARIZEYUE6hJ4xexGKc02Rn502xnId7c', title: 'Coordinates', seriesName: 'The Last Signal' },
  { id: 'c1111111-0002-0001-0001-000000000001', playbackId: 'JgPPQQqoTMsBbGNJFOsM8FomOX00mcJTGqA9d61RZeLY', title: 'Return', seriesName: 'The Last Signal' },
  { id: 'c1111111-0002-0001-0001-000000000002', playbackId: 'SIy9YkrXcJYzELARIZEYUE6hJ4xexGKc02Rn502xnId7c', title: 'Decoded', seriesName: 'The Last Signal' },
  { id: 'c2222222-0001-0001-0001-000000000001', playbackId: 'wYf1qCcrQ01gu5iHqqH4TvBZ8YK02id02Y02JaNwEiGPSF00', title: 'Dusk', seriesName: 'City Lights' },
  { id: 'c2222222-0001-0001-0001-000000000002', playbackId: 'JgPPQQqoTMsBbGNJFOsM8FomOX00mcJTGqA9d61RZeLY', title: 'Midnight', seriesName: 'City Lights' },
  { id: 'c2222222-0001-0001-0001-000000000003', playbackId: 'lvaEHovI902CKK2msfyfkPCUE2YZDeYtk4Au00vJq01iTE', title: 'Dawn', seriesName: 'City Lights' },
  { id: 'c3333333-0001-0001-0001-000000000001', playbackId: 'SIy9YkrXcJYzELARIZEYUE6hJ4xexGKc02Rn502xnId7c', title: 'Opening Night', seriesName: 'Behind the Curtain' },
  { id: 'c3333333-0001-0001-0001-000000000002', playbackId: 'wYf1qCcrQ01gu5iHqqH4TvBZ8YK02id02Y02JaNwEiGPSF00', title: 'Rehearsal', seriesName: 'Behind the Curtain' },
];

export default function PlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();

  const startIndex = ALL_EPISODES.findIndex((e) => e.id === episodeId);
  const ordered =
    startIndex > 0
      ? [...ALL_EPISODES.slice(startIndex), ...ALL_EPISODES.slice(0, startIndex)]
      : ALL_EPISODES;

  return <VerticalFeed episodes={ordered} />;
}
