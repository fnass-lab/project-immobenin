import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/lib/theme';

export function LoadingScreen({ message = 'Chargement…' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.neutral[50], gap: spacing.md },
  text: { ...typography.body, color: colors.neutral[500] },
});
