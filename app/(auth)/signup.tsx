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
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { authRedirectUrl, supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/types';
import {
  Home,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserRound,
  Phone,
} from 'lucide-react-native';

const getAuthErrorMessage = (message: string, status?: number) => {
  if (status === 429 || /rate limit|too many requests|too many attempts/i.test(message)) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (status === 503 || /503|service unavailable|temporarily unavailable/i.test(message)) {
    return 'Le service d’inscription est temporairement indisponible. Réessayez dans quelques minutes.';
  }
  if (/email address.*invalid|already registered|user already exists/i.test(message)) {
    return 'Cette adresse email est invalide ou déjà utilisée.';
  }
  return message;
};

const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isPhoneValid = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10;
};

const isPasswordStrong = (value: string) => {
  if (value.length < 8) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return true;
};

export default function SignupScreen() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid =
    nom.trim().length > 0 &&
    prenom.trim().length > 0 &&
    isPhoneValid(telephone) &&
    isEmailValid(email) &&
    isPasswordStrong(password) &&
    password === confirmPassword &&
    Boolean(role);

  const validate = (): string | null => {
    if (!nom.trim()) return 'Veuillez saisir votre nom.';
    if (!prenom.trim()) return 'Veuillez saisir votre prénom.';
    if (!isPhoneValid(telephone)) return 'Le numéro doit contenir exactement 10 chiffres.';
    if (!isEmailValid(email)) return "Format d'email invalide.";
    if (!isPasswordStrong(password)) {
      return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.';
    }
    if (password !== confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    if (!role) return 'Veuillez sélectionner un type d’utilisateur.';
    return null;
  };

  const handleSignup = async () => {
    if (loading || !isFormValid) return;
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirectUrl },
    });

    if (err) {
      setError(getAuthErrorMessage(err.message, err.status));
      setLoading(false);
      return;
    }

    if (!data.session) {
      setLoading(false);
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim() },
      });
      return;
    }

    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          nom: nom.trim(),
          prenom: prenom.trim(),
          telephone: telephone.replace(/\D/g, ''),
          role,
        })
        .eq('id', data.user.id);
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Home size={32} color={colors.neutral[0]} />
          </View>
          <Text style={styles.appName}>ImmoBénin</Text>
          <Text style={styles.tagline}>Trouvez votre logement au Bénin</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.title}>Créer un compte</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <UserRound size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom"
              placeholderTextColor="#B8A89D"
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <UserRound size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Prénom"
              placeholderTextColor="#B8A89D"
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <Phone size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={(value) => setTelephone(value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Téléphone"
              placeholderTextColor="#B8A89D"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Je suis</Text>
            <View style={styles.roleRow}>
              {(['locataire', 'proprietaire'] as UserRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                >
                  <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                    {r === 'locataire' ? 'Locataire' : 'Propriétaire'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <Mail size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#B8A89D"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <Lock size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor="#B8A89D"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              hitSlop={10}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={18} color={colors.neutral[500]} />
              ) : (
                <Eye size={18} color={colors.neutral[500]} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputIconWrap}>
              <Lock size={18} color={colors.neutral[500]} />
            </View>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor="#B8A89D"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((value) => !value)}
              hitSlop={10}
              style={styles.eyeButton}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} color={colors.neutral[500]} />
              ) : (
                <Eye size={18} color={colors.neutral[500]} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSignup}
            disabled={!isFormValid || loading}
            activeOpacity={0.9}
            style={[styles.primaryButton, (!isFormValid || loading) && styles.primaryButtonDisabled]}
          >
            <ArrowRight size={18} color={colors.neutral[0]} />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Déjà un compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signupLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F4F0',
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    backgroundColor: colors.clay[600],
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
  },
  logoWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(98, 60, 30, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.elevated,
  },
  appName: {
    ...typography.h1,
    color: colors.neutral[0],
    fontSize: 34,
    letterSpacing: -0.5,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 15,
  },
  formCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: 32,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 40,
    paddingBottom: spacing.xl,
    ...shadows.card,
  },
  title: {
    ...typography.h2,
    color: colors.neutral[900],
    marginBottom: spacing.lg,
    fontSize: 30,
    lineHeight: 40,
    letterSpacing: -0.5,
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E2DC',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: spacing.sm,
    height: 60,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 15,
    fontFamily: typography.fontRegular,
    color: colors.neutral[800],
  },
  eyeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.small,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
    marginBottom: spacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E2DC',
    alignItems: 'center',
    backgroundColor: colors.neutral[0],
  },
  roleBtnActive: {
    borderColor: colors.clay[600],
    backgroundColor: '#F9F2EA',
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
  primaryButton: {
    marginTop: spacing.sm,
    height: 58,
    backgroundColor: colors.clay[600],
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.neutral[0],
    fontFamily: typography.fontSemiBold,
    fontSize: 17,
  },
  signupRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  signupText: {
    ...typography.body,
    color: colors.neutral[600],
  },
  signupLink: {
    ...typography.body,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
});
