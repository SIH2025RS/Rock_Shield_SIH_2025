// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth as useAppAuth } from '@/src/auth/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { apiGet, apiGetAuth } from '@/src/api/client';

function formatAlertTime(ts) {
  if (!ts) return 'Just now';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (e) {
    return 'Just now';
  }
}

function getSeverityColor(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return '#dc2626';
  if (s === 'high') return '#f97316';
  if (s === 'medium') return '#facc15';
  if (s === 'low') return '#22c55e';
  return '#4b5563';
}

export default function OperatorAlertsScreen() {
  const { user } = useAppAuth();
  const { getToken } = useClerkAuth();
  const [backendStatus, setBackendStatus] = useState('Checking backend...');
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState(null);

  // Check backend health
  useEffect(() => {
    let cancelled = false;
    async function checkHealth() {
      try {
        const res = await apiGet('/health');
        if (!cancelled) {
          setBackendStatus(`Backend: ${res.status || 'ok'}`);
        }
      } catch (e) {
        if (!cancelled) {
          setBackendStatus('Backend: unreachable');
        }
      }
    }
    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch real alerts from backend
  useEffect(() => {
    let cancelled = false;
    async function loadAlerts() {
      try {
        const jwt = await getToken({ template: 'backend' });
        console.log('[OperatorAlertsScreen] Clerk getToken("backend") JWT:', jwt ? jwt.slice(0, 16) + '...' : jwt);
        const res = await apiGetAuth('/api/operator/alerts?limit=50', jwt);
        if (!cancelled) {
          const nextAlerts = res.alerts || [];
          setAlerts(nextAlerts);
          setAlertsError(null);
          if (nextAlerts.length) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Operator alerts',
                  body: `${nextAlerts.length} alert(s) currently active`,
                  data: { type: 'operator_alerts' },
                },
                trigger: null,
              });
            } catch (e) {
              // ignore notification errors
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setAlerts([]);
          setAlertsError('Failed to load alerts (auth or network issue).');
        }
      }
    }
    loadAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Operator Alerts</ThemedText>
      <ThemedText type="default">User: {user?.name || 'Unknown operator'}</ThemedText>
      <ThemedText type="default">{backendStatus}</ThemedText>
      <ThemedText type="default">
        Alerts: {alerts.length}
      </ThemedText>
      {alertsError ? (
        <ThemedText type="default" style={styles.error}>
          {alertsError}
        </ThemedText>
      ) : null}
      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text
                style={[styles.severity, { backgroundColor: getSeverityColor(item.severity) }]}
              >
                {(item.severity || 'unknown').toUpperCase()}
              </Text>
              <Text style={styles.time}>{formatAlertTime(item.created_at)}</Text>
            </View>
            <Text style={styles.title}>{item.title || 'Untitled alert'}</Text>
            {item.recommended_action ? (
              <Text style={styles.subtitle}>Action: {item.recommended_action}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          !alertsError && (
            <ThemedText type="default">No alerts found.</ThemedText>
          )
        }
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  title: {
    color: '#e5e7eb',
    marginBottom: 2,
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 2,
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
  error: {
    color: '#f97316',
    marginTop: 4,
  },
});
