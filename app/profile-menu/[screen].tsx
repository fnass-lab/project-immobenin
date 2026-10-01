import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing } from '@/lib/theme';

const labels: Record<string, string> = {
  boost: 'Boost Visibilité',
  support: 'Aide & support',
};

export default function ProfileMenuScreen() {
  const { screen } = useLocalSearchParams<{ screen: string }>();
  const title = labels[screen] ?? 'Bientôt disponible';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>Cette section sera bientôt disponible.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.neutral[50],
  },
  title: {
    ...typography.h2,
    color: colors.clay[700],
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
