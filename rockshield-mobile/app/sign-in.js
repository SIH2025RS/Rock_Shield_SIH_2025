import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Set when Clerk asks for an emailed code (e.g. first sign-in on a new device)
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');

  const getErrorMessage = (err, fallback) =>
    err?.errors?.[0]?.message ||
    (typeof err?.message === 'string' ? err.message : fallback);

  const onVerifyPress = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err) {
      console.error('Verification error', err);
      setError(getErrorMessage(err, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const onSignInPress = async () => {
    if (!isLoaded) {
      setError('Auth is still loading, please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({
        identifier: emailAddress,
        password,
      });

      const emailFactor = result.supportedSecondFactors?.find((f) => f.strategy === 'email_code');

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'needs_second_factor' && emailFactor) {
        await signIn.prepareSecondFactor({
          strategy: 'email_code',
          emailAddressId: emailFactor.emailAddressId,
        });
        setNeedsCode(true);
      } else {
        console.log('Sign in next step:', JSON.stringify(result, null, 2));
        setError(
          'Sign-in requires additional steps (verification or second factor). Please check your email or contact your admin.'
        );
      }
    } catch (err) {
      console.error('Sign in error', err);
      setError(getErrorMessage(err, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>RockShield</Text>
      <Text style={styles.title}>Sign in to your shift</Text>
      <Text style={styles.subtitle}>
        Use the credentials provided by your admin to access live alerts and tasks.
      </Text>
      {needsCode ? (
        <>
          <Text style={styles.subtitle}>Enter the verification code sent to your email.</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="Verification code"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={loading ? 'Verifying...' : 'Verify'}
            onPress={onVerifyPress}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <TextInput
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title={loading ? 'Signing in...' : 'Sign in'}
            onPress={onSignInPress}
            disabled={loading}
          />
        </>
      )}
      <Text style={styles.footer}>
        Operators see the full control panel. Miners see only the alerts and tasks forwarded to
        them.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#020617',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: '#38bdf8',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#e5e7eb',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
