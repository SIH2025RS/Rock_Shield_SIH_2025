// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth as useAppAuth } from '@/src/auth/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { apiGet, apiGetAuth } from '@/src/api/client';
import { playAlertSound } from '@/src/sound/alertSound';
import { notifyNewAlert } from '@/src/notifications/alertsNotifications';

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
  const queueRef = useRef([]); // pending alerts to show one by one
  const knownIdsRef = useRef(new Set()); // all IDs we've already queued/displayed
  const lastShownAtRef = useRef(0); // timestamp of last alert we actually displayed with buzzer

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

  // Poll backend and show alerts one by one with buzzer + notification
  // NOTE: We run this effect once on mount. getToken from Clerk remains
  // valid for the lifetime of this screen.
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    // Reset state and internal queues whenever this screen starts polling.
    setAlerts([]);
    setAlertsError(null);
    queueRef.current = [];
    knownIdsRef.current = new Set();
    lastShownAtRef.current = 0;

    function enqueueNewAlerts(serverAlerts) {
      if (!Array.isArray(serverAlerts) || serverAlerts.length === 0) return;
      const known = knownIdsRef.current;
      const queue = queueRef.current;

      for (const alert of serverAlerts) {
        if (!alert || alert.id == null) continue;
        const key = String(alert.id);
        if (known.has(key)) continue;
        known.add(key);
        queue.push(alert);
      }
    }

    async function fetchAlertsFromServer() {
      try {
        const jwt = await getToken({ template: 'backend' });
        if (!jwt) {
          if (!cancelled) {
            setAlertsError('Not signed in as operator.');
          }
          return null;
        }

        const res = await apiGetAuth(`/api/operator/alerts?limit=50&ts=${Date.now()}`, jwt);
        if (cancelled || !res) return null;

        const sorted = (res.alerts || [])
          .slice()
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        if (!cancelled) {
          setAlertsError(null);
        }

        return sorted;
      } catch (e) {
        if (!cancelled) {
          setAlertsError('Failed to load alerts (auth or network issue).');
        }
        return null;
      }
    }

    async function showNextAlertTick() {
      if (cancelled) return;

      const now = Date.now();
      const lastShownAt = lastShownAtRef.current || 0;

      // Hard throttle: never show more than one new alert within 20 seconds,
      // even if this function is called too frequently for any reason.
      if (lastShownAt && now - lastShownAt < 20000) {
        return;
      }

      const queue = queueRef.current;

      // If we have pending alerts in the queue, show the next one.
      if (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;

        setAlerts((prev) => [...prev, next]);
        lastShownAtRef.current = Date.now();
        try {
          await playAlertSound();
        } catch {
          // ignore sound errors
        }
        try {
          await notifyNewAlert(next);
        } catch {
          // ignore notification errors
        }
        return;
      }

      // No pending alerts; fetch latest from server and enqueue any new ones.
      const serverAlerts = await fetchAlertsFromServer();
      if (!serverAlerts || cancelled) return;

      enqueueNewAlerts(serverAlerts);

      // After enqueue, if we now have something, show one immediately.
      const refreshedQueue = queueRef.current;
      if (refreshedQueue.length > 0) {
        const next = refreshedQueue.shift();
        if (!next) return;

        setAlerts((prev) => [...prev, next]);
        lastShownAtRef.current = Date.now();
        try {
          await playAlertSound();
        } catch {
          // ignore sound errors
        }
        try {
          await notifyNewAlert(next);
        } catch {
          // ignore notification errors
        }
      }
    }

    async function init() {
      const initialAlerts = await fetchAlertsFromServer();
      if (cancelled || !initialAlerts) return;

      // Enqueue all existing alerts so they are delivered one by one
      // with buzzer/notification, oldest first.
      enqueueNewAlerts(initialAlerts);

      // Immediately deliver the first alert from the queue (if any).
      await showNextAlertTick();

      // Then keep polling for brand new alerts every 20 seconds.
      intervalId = setInterval(() => {
        showNextAlertTick();
      }, 20000);
    }

    init();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
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
