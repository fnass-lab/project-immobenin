import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import { UserRound } from 'lucide-react-native';

// Écran de complétion de profil après connexion Google
// (Google ne fournit pas téléphone ni rôle).
export default function CompleteProfileScreen() {
  const { updateProfile, refreshProfile } = useAuth();
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState<UserRole>('locataire');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!telephone.trim()) return 'Veuillez saisir votre numéro WhatsApp.';
    if (!/^\+229\d{8}$/.test(telephone.trim()))
      return 'Numéro invalide. Format attendu : +229XXXXXXXX.';
    return null;
  };

  const handleSave = async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    const ok = await updateProfile({
      telephone: telephone.trim(),
      role,
    });
    setLoading(false);
    if (!ok) {
      setError("Impossible d'enregistrer vos informations. Réessayez.");
      return;
    }
    await refreshProfile();
    // Le guard central gère la redirection.
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrap}>
          <UserRound size={36} color={colors.clay[600]} />
        </View>
        <Text style={styles.title}>Complétez votre profil</Text>
        <Text style={styles.subtitle}>
          Votre compte Google a été créé. Ajoutez votre numéro WhatsApp et
          choisissez votre rôle pour continuer.
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Numéro WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={telephone}
            onChangeText={(t) => {
              if (t && !t.startsWith('+')) {
                setTelephone('+' + t);
              } else {
                setTelephone(t);
              }
            }}
            placeholder="+229XXXXXXXX"
            placeholderTextColor={colors.neutral[400]}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Je suis</Text>
          <View style={styles.roleRow}>
            {(['locataire', 'proprietaire'] as UserRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === r && styles.roleTextActive,
                  ]}
                >
                  {r === 'locataire' ? 'Locataire' : 'Propriétaire'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Continuer"
          onPress={handleSave}
          loading={loading}
          fullWidth
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scroll: {
    flexGrow: 1,
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
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.small,
    color: colors.error,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.small,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: typography.fontRegular,
    color: colors.neutral[800],
    backgroundColor: colors.neutral[0],
    minHeight: 52,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
  },
  roleBtnActive: {
    borderColor: colors.clay[600],
    backgroundColor: colors.clay[50],
  },
  roleText: {
    ...typography.body,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
  },
  roleTextActive: {
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  submit: {
    marginTop: spacing.md,
  },
});
