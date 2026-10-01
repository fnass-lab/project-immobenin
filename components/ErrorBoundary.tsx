import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode }, State
> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  handleReload = () => { this.setState({ hasError: false, error: undefined }); };
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>Oups</Text>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>
            Nous n'avons pas pu charger cet écran. Vous pouvez réessayer.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReload} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Recharger</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, backgroundColor: colors.neutral[50] },
  emoji: { fontSize: 48, fontFamily: typography.fontBold,
    color: colors.clay[600], marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.neutral[800],
    marginBottom: spacing.sm, textAlign: 'center' },
  message: { ...typography.body, color: colors.neutral[500],
    textAlign: 'center', marginBottom: spacing.xl },
  button: { backgroundColor: colors.clay[600],
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill },
  buttonText: { ...typography.body, color: colors.neutral[0],
    fontFamily: typography.fontSemiBold },
});
