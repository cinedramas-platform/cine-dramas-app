import { useLocalSearchParams } from 'expo-router';
import { VerticalFeed, type FeedEpisode } from '@/components/video/VerticalFeed';

const ALL_EPISODES: FeedEpisode[] = [
  { id: 'c1111111-0001-0001-0001-000000000001', playbackId: 'Q3fybUQ6ABSrL00KAOQttuSX01I8MrnXp13aEUdBffLBc', title: 'The Encounter', seriesName: 'A Paris Proposal' },
  { id: 'c1111111-0001-0001-0001-000000000002', playbackId: '1018Nx7e3rPHzQbbORpgT7LzMdwRGVYwtAf2wA01JEcd4', title: 'City of Light', seriesName: 'A Paris Proposal' },
  { id: 'c1111111-0001-0001-0001-000000000003', playbackId: 'GUU7GeH4dYKdgapc6WzLWuGXE4hH0102vvWaBu01r2oyoM', title: 'The Proposal', seriesName: 'A Paris Proposal' },
  { id: 'c2222222-0001-0001-0001-000000000001', playbackId: '1A3wJJrug4tMWb002sstDL39IO8J02idsweNxg3AnWX2o', title: 'Arrival in Santorini', seriesName: "Love's Greek to Me" },
  { id: 'c2222222-0001-0001-0001-000000000002', playbackId: 'iq3gP4glDGGJ3Yke9aTMRp9TE9NPVMKYnQtwp5ConKE', title: 'Lost in Translation', seriesName: "Love's Greek to Me" },
  { id: 'c2222222-0001-0001-0001-000000000003', playbackId: 'CDNF01zJ3gcSzIJjoN2gOJ2uFTipfG1qf6uTADG2E01hM', title: 'Under the Stars', seriesName: "Love's Greek to Me" },
  { id: 'c3333333-0001-0001-0001-000000000001', playbackId: 'HyBJTQlP9nF01bGa202WLYjx601Hz0000rwS2a2OxlvsiNNY', title: 'First Impressions', seriesName: 'An American Austein' },
  { id: 'c3333333-0001-0001-0001-000000000002', playbackId: 'Tr9DdHazohlmAHhfAFZrapV58GiV1mwZbkwPmePkqvs', title: 'Pride and Progress', seriesName: 'An American Austein' },
  { id: 'c4444444-0001-0001-0001-000000000001', playbackId: 'rgWMkmU6oUIQHhzlYRdHXWBIEmXOsk01SDHRamDEKEis', title: "The Gondolier's Song", seriesName: 'Very Venice Romance' },
  { id: 'c4444444-0001-0001-0001-000000000002', playbackId: 'j023HankqedJFLUMp94NFpVlbr00ms64dmDGLN4G9lZlE', title: 'Masquerade', seriesName: 'Very Venice Romance' },
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
