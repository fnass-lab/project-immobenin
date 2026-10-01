import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, CheckCircle2 } from 'lucide-react-native';

export default function CguScreen() {
  const { acceptCgu, needsProfileCompletion } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    setLoading(true);
    const acceptError = await acceptCgu();
    setLoading(false);
    if (acceptError) {
      setError(
        `Impossible d'enregistrer votre acceptation : ${acceptError}`,
      );
      return;
    }
    // Le guard central redirige vers l'app une fois cgu_accepted = true.
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.iconWrap}>
        <ShieldCheck size={36} color={colors.clay[600]} />
      </View>

      <Text style={styles.title}>Règles de la Communauté</Text>
      <Text style={styles.subtitle}>
        Avant de commencer, lisez et acceptez le contrat ImmoBénin.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Annonces exactes</Text>
        <Text style={styles.sectionBody}>
          Vous vous engagez à publier des informations exactes sur vos biens :
          prix, quartier, commodités, photos réelles. Toute fausse déclaration
          est passible de sanctions.
        </Text>

        <Text style={styles.sectionTitle}>2. Logement déjà occupé</Text>
        <Text style={styles.sectionBody}>
          Il est strictement interdit de publier un logement déjà occupé ou
          indisponible. En cas de signalement confirmé, une amende automatique
          de 3 crédits sera appliquée et l'annonce sera masquée.
        </Text>

        <Text style={styles.sectionTitle}>3. Respect et courtoisie</Text>
        <Text style={styles.sectionBody}>
          Tout comportement abusif, trompeur ou frauduleux entraîne le blocage
          du compte et la perte des crédits.
        </Text>

        <Text style={styles.sectionTitle}>4. Crédits et paiements</Text>
        <Text style={styles.sectionBody}>
          La publication d'une annonce coûte 1 crédit. Un solde négatif bloque
          le compte jusqu'au rachat de crédits.
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setAccepted(!accepted)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
          {accepted && <CheckCircle2 size={20} color={colors.neutral[0]} />}
        </View>
        <Text style={styles.checkboxText}>
          J'accepte le contrat d'ImmoBénin et je m'engage sur l'exactitude de
          mes annonces.
        </Text>
      </TouchableOpacity>

      <Button
        title="Débloquer l'accès"
        onPress={handleAccept}
        loading={loading}
        disabled={!accepted}
        fullWidth
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.neutral[800],
    textAlign: 'center',
    fontSize: 24,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.clay[700],
    fontSize: 16,
  },
  sectionBody: {
    ...typography.body,
    color: colors.neutral[600],
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.accent[600],
    borderColor: colors.accent[600],
  },
  checkboxText: {
    ...typography.body,
    color: colors.neutral[700],
    flex: 1,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
