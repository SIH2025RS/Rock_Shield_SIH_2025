// @ts-nocheck
import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/src/auth/AuthContext';

// Simple placeholder alerts for miners; later this will come from /api/miner/alerts
const MOCK_ALERTS = [
  { id: '1', severity: 'critical', title: 'Evacuate Patch A immediately', time: 'Just now' },
  { id: '2', severity: 'medium', title: 'Inspect support bolts in Tunnel B', time: '5 min ago' },
];

export default function MinerAlertsScreen() {
  const { user } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Miner Alerts</ThemedText>
      <ThemedText type="default">User: {user?.name || 'Unknown miner'}</ThemedText>
      <FlatList
        data={MOCK_ALERTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.severity}>{item.severity.toUpperCase()}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  severity: {
    fontWeight: 'bold',
    color: '#0b1120',
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  title: {
    color: '#e5e7eb',
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
