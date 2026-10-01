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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { authRedirectUrl, supabase } from '@/lib/supabase';
import {
  Home,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react-native';

const getAuthErrorMessage = (message: string, status?: number) => {
  if (status === 429 || /rate limit|too many requests|too many attempts/i.test(message)) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (status === 503 || /503|service unavailable|temporarily unavailable/i.test(message)) {
    return 'Le service de connexion est temporairement indisponible. Réessayez dans quelques minutes.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou mot de passe incorrect.';
  }
  return message;
};

function GoogleMark() {
  return <Text style={styles.googleMark}>G</Text>;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return 'Veuillez saisir votre email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Format d'email invalide.";
    }
    if (!password) return 'Veuillez saisir votre mot de passe.';
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    return null;
  };

  const handleLogin = async () => {
    if (loading) return;
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(getAuthErrorMessage(err.message, err.status));
      return;
    }
  };

  const handleGoogle = async () => {
    if (loading || googleLoading) return;
    setError(null);
    setGoogleLoading(true);

    try {
      if (Platform.OS === 'web') {
        const { error: err } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: authRedirectUrl },
        });
        if (err) setError(getAuthErrorMessage(err.message, err.status));
        return;
      }

      const redirectTo = Linking.createURL('/login');
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (err) throw err;
      if (!data?.url) throw new Error('URL de connexion Google introuvable.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        if (result.type !== 'cancel') setError('La connexion Google a été interrompue.');
        return;
      }

      const parsed = Linking.parse(result.url);
      const code = typeof parsed.queryParams?.code === 'string'
        ? parsed.queryParams.code
        : null;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const hash = result.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
          throw new Error('Réponse Google invalide.');
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (user) {
        await supabase.from('profiles').upsert(
          { id: user.id, role: 'locataire' },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      }
      router.replace('/(tabs)');
    } catch (googleError) {
      const message = googleError instanceof Error
        ? googleError.message
        : 'Impossible de se connecter avec Google.';
      setError(getAuthErrorMessage(message));
    } finally {
      setGoogleLoading(false);
    }
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
          <Text style={styles.title}>Connexion</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          >
            <ArrowRight size={18} color={colors.neutral[0]} />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading || googleLoading}
            activeOpacity={0.9}
            style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
          >
            <GoogleMark />
            {googleLoading ? (
              <ActivityIndicator size="small" color={colors.neutral[700]} />
            ) : (
              <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signupLink}>Créer un compte</Text>
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9E1D9',
  },
  dividerText: {
    ...typography.small,
    color: colors.neutral[400],
    fontFamily: typography.fontMedium,
  },
  googleButton: {
    position: 'relative',
    minHeight: 52,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: '#EFE8E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  googleButtonText: {
    ...typography.body,
    color: colors.neutral[800],
    fontFamily: typography.fontMedium,
    fontSize: 16,
  },
  googleMark: {
    position: 'absolute',
    left: spacing.md,
    top: 16,
    color: '#4285F4',
    fontSize: 21,
    lineHeight: 24,
    fontFamily: typography.fontBold,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  signupRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: 6,
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
