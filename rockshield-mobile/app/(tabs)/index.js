// @ts-nocheck
import { useAuth } from '@/src/auth/AuthContext';
import { Platform, StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

export default function HomeScreen() {
  const { user, role } = useAuth();
  const displayRole = role || 'no role';
  const roleColor =
    displayRole === 'operator' ? '#f97316' : displayRole === 'miner' ? '#22c55e' : '#6b7280';
  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#0f172a', dark: '#020617' }}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">RockShield Control Center</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.roleBadgeContainer}>
        <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
          <ThemedText type="default" style={styles.roleBadgeText}>
            {displayRole}
          </ThemedText>
        </View>
      </ThemedView>
      <ThemedView style={styles.subtitleContainer}>
        <ThemedText type="default">
          Real-time rockfall and safety overview for your mine operations.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">You are signed in</ThemedText>
        <ThemedText type="default">
          <ThemedText type="defaultSemiBold">{user?.name ?? 'Unknown user'}</ThemedText> ({displayRole})
        </ThemedText>
        <ThemedText type="default">
          Device:{' '}
          {Platform.OS === 'web'
            ? 'Web console'
            : Platform.OS === 'ios'
            ? 'iOS app'
            : 'Android app'}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Today&apos;s focus</ThemedText>
        {displayRole === 'operator' ? (
          <>
            <ThemedText type="default">• Monitor high-risk alerts and forward them to miners.</ThemedText>
            <ThemedText type="default">• Log incidents from the field with photos and GPS.</ThemedText>
            <ThemedText type="default">• Assign and track critical response tasks.</ThemedText>
          </>
        ) : displayRole === 'miner' ? (
          <>
            <ThemedText type="default">• Review alerts assigned to your team.</ThemedText>
            <ThemedText type="default">• Follow recommended actions underground.</ThemedText>
            <ThemedText type="default">• Update task status as you complete work.</ThemedText>
          </>
        ) : (
          <ThemedText type="default">
            Your role is not set yet. Ask an admin to grant you operator or miner access.
          </ThemedText>
        )}
      </ThemedView>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Quick navigation</ThemedText>
        <Link href="/(tabs)/alerts">
          <Link.Trigger>
            <ThemedText type="link">Open Alerts</ThemedText>
          </Link.Trigger>
        </Link>
        <Link href="/(tabs)/explore">
          <Link.Trigger>
            <ThemedText type="link">Explore capabilities</ThemedText>
          </Link.Trigger>
        </Link>
        <Link href="/(tabs)/profile">
          <Link.Trigger>
            <ThemedText type="link">Profile &amp; sign out</ThemedText>
          </Link.Trigger>
        </Link>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roleBadgeContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleBadgeText: {
    color: '#0b1120',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  subtitleContainer: {
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    gap: 6,
  },
});
