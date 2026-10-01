import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function EmptyState({ title, message, icon }: {
  title: string; message?: string; icon?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.sm },
  iconWrap: { width: 72, height: 72, borderRadius: radius.pill,
    backgroundColor: colors.neutral[100], alignItems: 'center',
    justifyContent: 'center', marginBottom: spacing.md },
  title: { ...typography.h3, color: colors.neutral[700], textAlign: 'center' },
  message: { ...typography.body, color: colors.neutral[500], textAlign: 'center' },
});
