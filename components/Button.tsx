import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  title, onPress, variant = 'primary', loading = false,
  disabled = false, style, fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = variant === 'primary' ? colors.clay[600]
    : variant === 'secondary' ? colors.accent[600]
    : variant === 'danger' ? colors.error : 'transparent';
  const fg = variant === 'outline' || variant === 'ghost'
    ? colors.clay[700] : colors.neutral[0];
  const border = variant === 'outline'
    ? { borderWidth: 1.5, borderColor: colors.clay[600] } : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base, { backgroundColor: bg }, border,
        fullWidth && styles.fullWidth, isDisabled && styles.disabled, style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  fullWidth: { width: '100%' },
  text: { ...typography.body, fontFamily: typography.fontSemiBold,
    fontSize: 16, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
