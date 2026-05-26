import { useLocalSearchParams } from 'expo-router';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';

const ALL_EPISODES: FeedEpisode[] = [
  { id: 'c1111111-0001-0001-0001-000000000001', playbackId: 'slzJlfCMJmms1jT6SYdFp6283JL01MSi00B6sYf9EKx2s', title: 'The Encounter', seriesName: 'A Paris Proposal' },
  { id: 'c1111111-0001-0001-0001-000000000002', playbackId: 'Q6Fi7qg02HBytQ01luVTsjFQT00T2zXxcd7pUXu5UIeHEg', title: 'City of Light', seriesName: 'A Paris Proposal' },
  { id: 'c1111111-0001-0001-0001-000000000003', playbackId: 'qJO6rxZ1jo01B02Bi1TLP0075gewaYm17XIAEqgoJ3H602w', title: 'The Proposal', seriesName: 'A Paris Proposal' },
  { id: 'c2222222-0001-0001-0001-000000000001', playbackId: 'QJnfcyZqFd5l69lo9lS9nFs3FlQksrbjFG102TG01taFo', title: 'Arrival in Santorini', seriesName: "Love's Greek to Me" },
  { id: 'c2222222-0001-0001-0001-000000000002', playbackId: 'qpTRiqpl1ZoxR00W2IqWjPVCU92ADYOGIhOsO5DqJk01M', title: 'Lost in Translation', seriesName: "Love's Greek to Me" },
  { id: 'c2222222-0001-0001-0001-000000000003', playbackId: 'dGcDpmdtAYfXzmDSu75k1v7iTx02FWWucatu7bVyWOCk', title: 'Under the Stars', seriesName: "Love's Greek to Me" },
  { id: 'c3333333-0001-0001-0001-000000000001', playbackId: '5uw6wpup02nUdXB00c5s01oJlzelwVLGZ01SuqnBAmtSKhM', title: 'First Impressions', seriesName: 'An American Austein' },
  { id: 'c3333333-0001-0001-0001-000000000002', playbackId: 'FwZFrR3O9vSGyE4yBnlBAf0001SjSFMaWz3d2ISFNRZNY', title: 'Pride and Progress', seriesName: 'An American Austein' },
  { id: 'c4444444-0001-0001-0001-000000000001', playbackId: '02hkTa00V1bidQnbYmRowORsNXF1Pa00REDYaEUdkCMs900', title: "The Gondolier's Song", seriesName: 'Very Venice Romance' },
  { id: 'c4444444-0001-0001-0001-000000000002', playbackId: 'Sb3aCsPj8FsQVfqM4EZqV01qsuvsIcujdRjLj5P3fFBs', title: 'Masquerade', seriesName: 'Very Venice Romance' },
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
