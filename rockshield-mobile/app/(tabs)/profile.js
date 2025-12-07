// @ts-nocheck
import React from 'react';
import { View, StyleSheet, Button } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/src/auth/AuthContext';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

export default function ProfileScreen() {
  const { user, role, logout } = useAuth();
  const { signOut } = useClerkAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      // ignore
    } finally {
      logout();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>

      <View style={styles.section}>
        <ThemedText type="subtitle">Account</ThemedText>
        <ThemedText type="default">
          Name: {user?.name || 'Unknown'}
        </ThemedText>
        <ThemedText type="default">
          Email: {user?.email || 'Unknown'}
        </ThemedText>
        <ThemedText type="default">
          Role: {role || 'none'}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <Button title="Sign out" onPress={handleSignOut} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  section: {
    marginTop: 16,
    gap: 4,
  },
});
