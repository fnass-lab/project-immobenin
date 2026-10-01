import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { authRedirectUrl, supabase } from '@/lib/supabase';
import { MailCheck } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authRedirectUrl },
    });
    setResending(false);
    if (error) {
      setMessage("Impossible de renvoyer l'email. Réessayez plus tard.");
    } else {
      setMessage('Un nouvel email de confirmation a été envoyé.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MailCheck size={40} color={colors.clay[600]} />
        </View>
        <Text style={styles.title}>Vérifiez votre boîte mail</Text>
        <Text style={styles.message}>
          Nous avons envoyé un lien de confirmation à :
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.message}>
          Cliquez sur le lien dans l'email pour activer votre compte, puis
          revenez ici vous connecter.
        </Text>

        {message && <Text style={styles.feedback}>{message}</Text>}

        <Button
          title="Renvoyer l'email"
          onPress={handleResend}
          loading={resending}
          variant="outline"
          fullWidth
          style={styles.resend}
        />

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backLink}
        >
          <Text style={styles.backText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    ...shadows.card,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  email: {
    ...typography.h3,
    color: colors.clay[700],
    marginBottom: spacing.sm,
  },
  feedback: {
    ...typography.small,
    color: colors.accent[700],
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  resend: {
    marginTop: spacing.md,
  },
  backLink: {
    marginTop: spacing.lg,
  },
  backText: {
    ...typography.body,
    color: colors.neutral[500],
    fontFamily: typography.fontMedium,
  },
});
