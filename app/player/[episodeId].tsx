import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function PlayerScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Player</Text>
      <Text style={styles.subtitle}>Episode: {episodeId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
  },
});
