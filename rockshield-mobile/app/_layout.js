import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/auth/AuthContext';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const first = segments[0];
    const inSignIn = first === 'sign-in';
    const inTabs = first === '(tabs)';

    if (!isSignedIn && !inSignIn) {
      router.replace('/sign-in');
    } else if (isSignedIn && (inSignIn || !inTabs)) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <RootNavigation />
    </ClerkProvider>
  );
}
