// @ts-nocheck
import React from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/src/auth/AuthContext';
import OperatorAlertsScreen from '@/src/screens/Operator/OperatorAlertsScreen';
import MinerAlertsScreen from '@/src/screens/Miner/MinerAlertsScreen';

export default function AlertsTab() {
  const { role } = useAuth();

  if (role === 'operator') {
    return <OperatorAlertsScreen />;
  }

  if (role === 'miner') {
    return <MinerAlertsScreen />;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text>No user role detected. Please log in.</Text>
    </View>
  );
}
