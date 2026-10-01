import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Payment, UserRole } from '@/lib/types';
import { formatFCFA, formatDate } from '@/lib/format';
import {
  User,
  Wallet,
  CreditCard,
  LogOut,
  ArrowLeftRight,
  Zap,
  CheckCircle2,
  History,
  Frown,
  Mail,
  Smartphone,
  CircleCheck,
  ChevronRight,
  FileText,
  Sparkles,
  HelpCircle,
} from 'lucide-react-native';

const CREDIT_PACKS = [
  { credits: 5, price: 2500, label: '5 crédits' },
  { credits: 12, price: 5000, label: '12 crédits' },
  { credits: 25, price: 10000, label: '25 crédits' },
];

type LoadState = 'loading' | 'error' | 'success';

export default function ProfilScreen() {
  const { profile, session, updateProfile, signOut, refreshProfile } = useAuth();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payState, setPayState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!session?.user) return;
    setPayState('loading');
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setPayState('error');
      setRefreshing(false);
      return;
    }
    setPayments((data || []) as Payment[]);
    setPayState('success');
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
    refreshProfile();
  };

  const handleBuyCredits = async (pack: (typeof CREDIT_PACKS)[0]) => {
    if (!session?.user) return;
    setBuying(pack.credits);
    // Simuler un paiement Mobile Money (fictif)
    const newSolde = (profile?.solde_credits ?? 0) + pack.credits;
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ solde_credits: newSolde })
      .eq('id', session.user.id);
    if (profileErr) {
      setBuying(null);
      return;
    }
    await supabase.from('payments').insert({
      user_id: session.user.id,
      type: 'credits',
      montant_fcfa: pack.price,
      credits_ajoutes: pack.credits,
      description: pack.label,
    });
    await refreshProfile();
    await loadPayments();
    setBuying(null);
    setShowBuyModal(false);
  };

  const handleSwitchRole = async () => {
    if (!profile) return;
    setRoleLoading(true);
    const newRole: UserRole =
      profile.role === 'locataire' ? 'proprietaire' : 'locataire';
    await updateProfile({ role: newRole });
    setRoleLoading(false);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Profil introuvable</Text>
          <Button title="Recharger" onPress={refreshProfile} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const isProprietaire = profile.role === 'proprietaire';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <User size={32} color={colors.neutral[0]} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>
              {profile.nom} {profile.prenom}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {isProprietaire ? 'Propriétaire' : 'Locataire'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.clay[600]} />
            <Text style={styles.cardTitle}>Informations du compte</Text>
          </View>
          <View style={styles.accountRow}>
            <Mail size={17} color={colors.neutral[500]} />
            <View style={styles.accountValueWrap}>
              <Text style={styles.accountLabel}>E-mail</Text>
              <Text style={styles.accountValue}>{session?.user?.email ?? 'Non renseigné'}</Text>
            </View>
          </View>
          <View style={styles.accountRow}>
            <Smartphone size={17} color={colors.neutral[500]} />
            <View style={styles.accountValueWrap}>
              <Text style={styles.accountLabel}>WhatsApp</Text>
              <Text style={styles.accountValue}>{profile.telephone || 'Non renseigné'}</Text>
            </View>
          </View>
          <View style={styles.accountRow}>
            <CircleCheck size={17} color={colors.success} />
            <View style={styles.accountValueWrap}>
              <Text style={styles.accountLabel}>Statut du compte</Text>
              <Text style={styles.activeStatus}>Actif</Text>
            </View>
          </View>
        </View>

        <View style={styles.compactCardsRow}>
          <View style={styles.compactCard}>
            <View style={styles.cardHeader}>
              <Wallet size={18} color={colors.clay[600]} />
              <Text style={styles.cardTitle}>Crédits</Text>
            </View>
            <Text style={styles.balance}>{profile.solde_credits}</Text>
            {profile.solde_credits < 1 && (
              <Text style={styles.balanceSub}>
                Solde insuffisant — achetez des crédits pour publier
              </Text>
            )}
            <TouchableOpacity
              onPress={() => setShowBuyModal(true)}
              style={styles.buyLink}
              activeOpacity={0.75}
            >
              <Text style={styles.buyLinkText}>Acheter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.compactCard}>
            <View style={styles.cardHeader}>
              <CreditCard size={18} color={colors.clay[600]} />
              <Text style={styles.cardTitle}>Pass Contacts</Text>
            </View>
            {profile.pass_contact_actif &&
            profile.pass_contact_expires_at &&
            new Date(profile.pass_contact_expires_at) > new Date() ? (
              <View style={styles.passActiveRow}>
                <CheckCircle2 size={17} color={colors.accent[600]} />
                <Text style={styles.passActiveText}>Actif</Text>
              </View>
            ) : (
              <>
                <Text style={styles.passInactive}>Inactif</Text>
                <Text style={styles.passPrice}>1 000 FCFA / mois</Text>
              </>
            )}
          </View>
        </View>

        {/* Changer de rôle */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ArrowLeftRight size={20} color={colors.clay[600]} />
            <Text style={styles.cardTitle}>Rôle</Text>
          </View>
          <Text style={styles.roleDesc}>
            Vous êtes actuellement {isProprietaire ? 'propriétaire' : 'locataire'}.
            {isProprietaire
              ? " Basculez en locataire pour chercher un logement."
              : " Devenez propriétaire pour publier des annonces."}
          </Text>
          <Button
            title={isProprietaire ? 'Devenir Locataire' : 'Devenir Propriétaire'}
            onPress={handleSwitchRole}
            loading={roleLoading}
            variant="outline"
            fullWidth
            style={styles.cardBtn}
          />
        </View>

        {/* Historique paiements */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <History size={20} color={colors.clay[600]} />
            <Text style={styles.cardTitle}>Historique des paiements</Text>
          </View>
          {payState === 'loading' ? (
            <Text style={styles.loadingText}>Chargement…</Text>
          ) : payState === 'error' ? (
            <View style={styles.payError}>
              <Frown size={24} color={colors.neutral[400]} />
              <Text style={styles.errorTitle}>Impossible de charger l'historique</Text>
              <Button title="Réessayer" onPress={loadPayments} variant="outline" />
            </View>
          ) : payments.length === 0 ? (
            <Text style={styles.emptyText}>Aucun paiement pour le moment.</Text>
          ) : (
            <View style={styles.payList}>
              {payments.map((p) => (
                <View key={p.id} style={styles.payItem}>
                  <View style={styles.payItemLeft}>
                    <View style={styles.payIcon}>
                      {p.type === 'credits' ? (
                        <Wallet size={14} color={colors.clay[600]} />
                      ) : p.type === 'pass_contact' ? (
                        <CreditCard size={14} color={colors.clay[600]} />
                      ) : (
                        <Zap size={14} color={colors.clay[600]} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.payDesc}>
                        {p.description || p.type}
                      </Text>
                      <Text style={styles.payDate}>{formatDate(p.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.payAmount}>{formatFCFA(p.montant_fcfa)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.menuCard}>
          <ProfileMenuRow
            icon={<Wallet size={19} color={colors.clay[600]} />}
            label="Acheter des crédits"
            onPress={() => setShowBuyModal(true)}
          />
          <ProfileMenuRow
            icon={<FileText size={19} color={colors.clay[600]} />}
            label="Conditions d'utilisation"
            onPress={() => router.push('/(auth)/cgu')}
          />
          <ProfileMenuRow
            icon={<Sparkles size={19} color={colors.clay[600]} />}
            label="Boost Visibilité"
            onPress={() => router.push('/profile-menu/boost')}
          />
          <ProfileMenuRow
            icon={<HelpCircle size={19} color={colors.clay[600]} />}
            label="Aide & support"
            onPress={() => router.push('/profile-menu/support')}
            last
          />
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          onPress={signOut}
          style={styles.logoutBtn}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          ImmoBénin v1.0.0 — Location d'appartements au Bénin
        </Text>
      </ScrollView>

      {/* Modal achat crédits */}
      <Modal
        visible={showBuyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBuyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Acheter des crédits</Text>
            <Text style={styles.modalMsg}>
              Paiement via Mobile Money (MTN MoMo / Moov Money).
            </Text>
            {CREDIT_PACKS.map((pack) => (
              <TouchableOpacity
                key={pack.credits}
                onPress={() => handleBuyCredits(pack)}
                disabled={buying !== null}
                style={styles.packRow}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={styles.packLabel}>{pack.label}</Text>
                  <Text style={styles.packPrice}>{formatFCFA(pack.price)}</Text>
                </View>
                {buying === pack.credits ? (
                  <Text style={styles.packProcessing}>Traitement…</Text>
                ) : (
                  <Text style={styles.packBtn}>Acheter</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowBuyModal(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProfileMenuRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuRow, !last && styles.menuRowBorder]}
      activeOpacity={0.7}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={19} color={colors.neutral[400]} />
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    ...typography.h3,
    color: colors.neutral[800],
  },
  email: {
    ...typography.small,
    color: colors.neutral[500],
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.clay[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  roleText: {
    ...typography.caption,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  compactCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  compactCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  accountValueWrap: {
    flex: 1,
  },
  accountLabel: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  accountValue: {
    ...typography.small,
    color: colors.neutral[800],
    marginTop: 1,
  },
  activeStatus: {
    ...typography.small,
    color: colors.success,
    fontFamily: typography.fontSemiBold,
    marginTop: 1,
  },
  menuCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.clay[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.body,
    color: colors.neutral[700],
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.neutral[800],
    fontSize: 16,
  },
  balance: {
    ...typography.h1,
    color: colors.clay[700],
    fontSize: 36,
    lineHeight: 46,
    includeFontPadding: true,
  },
  balanceSub: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  buyLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buyLinkText: {
    ...typography.small,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  cardBtn: {
    marginTop: spacing.sm,
  },
  passActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  passActiveText: {
    ...typography.body,
    color: colors.accent[700],
    fontFamily: typography.fontSemiBold,
  },
  passInactive: {
    ...typography.body,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
    marginTop: spacing.xs,
  },
  passExpiry: {
    ...typography.small,
    color: colors.neutral[500],
    marginTop: 4,
  },
  passMsg: {
    ...typography.body,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  passPrice: {
    ...typography.h3,
    color: colors.clay[700],
  },
  roleDesc: {
    ...typography.body,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.neutral[500],
  },
  payError: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.neutral[400],
  },
  payList: {
    gap: spacing.sm,
  },
  payItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  payItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  payIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  payDesc: {
    ...typography.small,
    color: colors.neutral[700],
    fontFamily: typography.fontMedium,
  },
  payDate: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  payAmount: {
    ...typography.body,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontFamily: typography.fontSemiBold,
  },
  footerText: {
    ...typography.caption,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  modalMsg: {
    ...typography.body,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  packLabel: {
    ...typography.body,
    color: colors.neutral[800],
    fontFamily: typography.fontSemiBold,
  },
  packPrice: {
    ...typography.small,
    color: colors.neutral[500],
  },
  packBtn: {
    ...typography.body,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  packProcessing: {
    ...typography.small,
    color: colors.neutral[400],
  },
  modalCancel: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.neutral[500],
    fontFamily: typography.fontMedium,
  },
});
