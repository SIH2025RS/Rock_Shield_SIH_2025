import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0f172a', dark: '#020617' }}
      headerImage={
        <IconSymbol
          size={260}
          color="#64748b"
          name="mountain.2.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore RockShield
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.intro}>
        RockShield combines live sensor data, operator workflows, and underground miner tools into
        one safety platform.
      </ThemedText>
      <Collapsible title="Alerts & workflows">
        <ThemedText>
          • Operators see every critical, high, and medium alert in one place.
        </ThemedText>
        <ThemedText>
          • Acknowledge and resolve alerts, or forward them to miners as response tasks.
        </ThemedText>
        <ThemedText>
          • Miners receive only the alerts forwarded to them via <ThemedText type="defaultSemiBold">/api/miner/alerts</ThemedText>.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Field teams">
        <ThemedText>
          • Operators can log incidents from the pit or underground with photos and GPS.
        </ThemedText>
        <ThemedText>
          • Each incident can automatically create review tasks for system admins.
        </ThemedText>
        <ThemedText>
          • Miners update task status as they respond to hazards.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Maps & insights">
        <ThemedText>
          • View recent sensor activity and alert locations on the RockShield map.
        </ThemedText>
        <ThemedText>
          • Inspect vibration events and other trends over time to predict risk.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              • On iOS, enjoy a smooth parallax header for quick situational awareness.
            </ThemedText>
          ),
        })}
      </Collapsible>
      <Collapsible title="What&apos;s next?">
        <ThemedText>
          This mobile app is the on-site companion to the RockShield web console. Use it to keep
          operators and miners aligned on the latest risks.
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#0f172a',
    bottom: -60,
    left: -20,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  intro: {
    marginBottom: 12,
  },
});
