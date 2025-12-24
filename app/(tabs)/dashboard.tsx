import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FacebookLeadsPage } from '../../src/components/FacebookLeadsPage';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <FacebookLeadsPage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

