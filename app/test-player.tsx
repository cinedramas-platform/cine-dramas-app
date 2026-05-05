import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';

const TEST_EPISODES: FeedEpisode[] = [
  {
    id: '1',
    playbackId: 'lvaEHovI902CKK2msfyfkPCUE2YZDeYtk4Au00vJq01iTE',
    title: 'Episode 1',
    seriesName: 'Test Series',
  },
  {
    id: '2',
    playbackId: 'JgPPQQqoTMsBbGNJFOsM8FomOX00mcJTGqA9d61RZeLY',
    title: 'Episode 2',
    seriesName: 'Test Series',
  },
  {
    id: '3',
    playbackId: 'wYf1qCcrQ01gu5iHqqH4TvBZ8YK02id02Y02JaNwEiGPSF00',
    title: 'Episode 3',
    seriesName: 'Test Series',
  },
  {
    id: '4',
    playbackId: 'SIy9YkrXcJYzELARIZEYUE6hJ4xexGKc02Rn502xnId7c',
    title: 'Episode 4',
    seriesName: 'Test Series',
  },
];

export default function TestPlayerScreen() {
  return <VerticalFeed episodes={TEST_EPISODES} />;
}
