import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Listing, Profile } from '@/lib/types';
import { formatFCFA, formatDate } from '@/lib/format';
import {
  ChevronLeft,
  MapPin,
  CheckCircle2,
  Zap,
  Phone,
  Lock,
  Flag,
  ImageOff,
  Wifi,
  Car,
  Flame,
  Sparkles,
  Droplets,
} from 'lucide-react-native';

type LoadState = 'loading' | 'error' | 'success';

const COMMODITE_ICONS: Record<string, React.ReactNode> = {
  'Compteur prépayé SBEE': <Zap size={16} color={colors.clay[600]} />,
  'Eau SONEB': <Droplets size={16} color={colors.clay[600]} />,
  Pavé: <CheckCircle2 size={16} color={colors.clay[600]} />,
  Climatisation: <Flame size={16} color={colors.clay[600]} />,
  'Wi-Fi': <Wifi size={16} color={colors.clay[600]} />,
  Parking: <Car size={16} color={colors.clay[600]} />,
};

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile, refreshProfile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setState('loading');
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      setErrorMsg(error?.message || 'Annonce introuvable.');
      setState('error');
      return;
    }
    setListing(data as Listing);

    // Charger le profil du propriétaire (pour afficher le contact si déverrouillé)
    const { data: ownerData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', (data as Listing).owner_id)
      .maybeSingle();
    if (ownerData) setOwner(ownerData as Profile);

    // Vérifier si l'utilisateur a déjà déverrouillé ce contact
    if (session?.user) {
      const { data: unlock } = await supabase
        .from('contact_unlocks')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('listing_id', id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (unlock) setContactUnlocked(true);
    }
    setState('success');
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  const hasPass =
    profile?.pass_contact_actif &&
    profile?.pass_contact_expires_at &&
    new Date(profile.pass_contact_expires_at) > new Date();

  const handleUnlockContact = async () => {
    if (!session?.user || !listing) return;
    setPassLoading(true);

    // Si l'utilisateur a déjà un Pass Contacts actif, déverrouiller directement
    if (hasPass) {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      const { error: unlockError } = await supabase
        .from('contact_unlocks')
        .insert({
          user_id: session.user.id,
          listing_id: listing.id,
          expires_at: expires.toISOString(),
        });
      setPassLoading(false);
      if (unlockError) {
        Alert.alert('Erreur', 'Impossible de déverrouiller le contact. Réessayez.');
        return;
      }
      setContactUnlocked(true);
      setShowPassModal(false);
      return;
    }

    // Sinon, simuler un paiement Mobile Money (fictif) et activer le Pass
    // Dans une vraie app, ceci irait vers un edge function / RevenueCat.
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);

    // Activer le Pass sur le profil
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        pass_contact_actif: true,
        pass_contact_expires_at: expires.toISOString(),
      })
      .eq('id', session.user.id);
    if (profileErr) {
      setPassLoading(false);
      Alert.alert('Erreur', 'Paiement échoué. Réessayez.');
      return;
    }

    // Enregistrer le paiement
    await supabase.from('payments').insert({
      user_id: session.user.id,
      type: 'pass_contact',
      montant_fcfa: 1000,
      description: 'Pass Contacts - 1 mois',
    });

    // Créer le déverrouillage
    const unlockExpires = new Date();
    unlockExpires.setDate(unlockExpires.getDate() + 30);
    await supabase.from('contact_unlocks').insert({
      user_id: session.user.id,
      listing_id: listing.id,
      expires_at: unlockExpires.toISOString(),
    });

    await refreshProfile();
    setContactUnlocked(true);
    setPassLoading(false);
    setShowPassModal(false);
  };

  const handleReport = async () => {
    if (!session?.user || !listing) return;
    setReportLoading(true);
    const { error } = await supabase.from('reports').insert({
      listing_id: listing.id,
      reporter_id: session.user.id,
      motif: 'Logement déjà occupé',
    });
    setReportLoading(false);
    if (error) {
      Alert.alert('Erreur', 'Signalement déjà envoyé ou impossible.');
      return;
    }
    setShowReportModal(false);
    Alert.alert(
      'Signalement envoyé',
      'Merci. Notre équipe va vérifier cette annonce. Si le logement est bien déjà occupé, des sanctions seront appliquées.',
    );
  };

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        <LoadingScreen message="Chargement de l'annonce…" />
      </SafeAreaView>
    );
  }

  if (state === 'error' || !listing) {
    return (
      <SafeAreaView style={styles.screen}>
        <BackHeader />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Annonce introuvable</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <Button title="Retour" onPress={() => router.back()} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  const isBoosted =
    listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const photos = listing.photos?.length ? listing.photos : [];

  return (
    <SafeAreaView style={styles.screen}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Galerie photos */}
        <View style={styles.gallery}>
          {photos.length > 0 ? (
            <>
              <Image
                source={{ uri: photos[activePhoto] }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              {photos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnails}
                  contentContainerStyle={{ gap: spacing.sm }}
                >
                  {photos.map((p, i) => (
                    <Pressable key={i} onPress={() => setActivePhoto(i)}>
                      <Image
                        source={{ uri: p }}
                        style={[
                          styles.thumb,
                          activePhoto === i && styles.thumbActive,
                        ]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={[styles.mainPhoto, styles.placeholder]}>
              <ImageOff size={48} color={colors.neutral[400]} />
            </View>
          )}
          {isBoosted && (
            <View style={styles.boostBadge}>
              <Zap size={14} color={colors.neutral[0]} fill={colors.neutral[0]} />
              <Text style={styles.boostText}>Boost</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{listing.titre}</Text>
          <View style={styles.locationRow}>
            <MapPin size={16} color={colors.clay[600]} />
            <Text style={styles.location}>
              {listing.quartier ? `${listing.quartier}, ` : ''}
              {listing.ville}
            </Text>
          </View>
          <Text style={styles.price}>{formatFCFA(listing.prix)}/mois</Text>

          {/* Badge disponible */}
          <View style={styles.availableRow}>
            <View style={styles.availableBadge}>
              <View style={styles.dot} />
              <Text style={styles.availableText}>Disponible</Text>
            </View>
            <Text style={styles.dateText}>
              Publié le {formatDate(listing.created_at)}
            </Text>
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionBody}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Commodités */}
          {listing.commodites?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Commodités</Text>
              <View style={styles.commoditesGrid}>
                {listing.commodites.map((c, i) => (
                  <View key={i} style={styles.commoditeChip}>
                    {COMMODITE_ICONS[c] || <CheckCircle2 size={16} color={colors.clay[600]} />}
                    <Text style={styles.commoditeText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact propriétaire */}
          <View style={styles.contactCard}>
            {contactUnlocked && owner ? (
              <>
                <View style={styles.contactHeader}>
                  <Phone size={20} color={colors.accent[600]} />
                  <Text style={styles.contactTitle}>Contact du propriétaire</Text>
                </View>
                <Text style={styles.contactName}>
                  {owner.prenom} {owner.nom}
                </Text>
                <Text style={styles.contactPhone}>{owner.telephone}</Text>
                <Text style={styles.contactHint}>
                  Appelez ou écrivez sur WhatsApp en mentionnant ImmoBénin.
                </Text>
              </>
            ) : (
              <>
                <Lock size={24} color={colors.clay[600]} />
                <Text style={styles.contactLockedTitle}>
                  Contact verrouillé
                </Text>
                <Text style={styles.contactLockedMsg}>
                  Débloquez le contact du propriétaire pour appeler ou écrire
                  directement.
                </Text>
                <Button
                  title="Débloquer le contact — 1000 FCFA/mois"
                  onPress={() => setShowPassModal(true)}
                  fullWidth
                  style={styles.unlockBtn}
                />
              </>
            )}
          </View>

          {/* Signaler */}
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => setShowReportModal(true)}
          >
            <Flag size={16} color={colors.neutral[500]} />
            <Text style={styles.reportText}>Signaler comme déjà occupé</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Pass Contacts */}
      <Modal
        visible={showPassModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pass Contacts</Text>
            <Text style={styles.modalMsg}>
              Accédez aux contacts de tous les propriétaires pendant 1 mois.
              Paiement via Mobile Money (MTN MoMo / Moov Money).
            </Text>
            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPrice}>1 000 FCFA</Text>
              <Text style={styles.modalPriceSub}>/mois</Text>
            </View>
            <View style={styles.momoRow}>
              <View style={styles.momoBadge}>
                <Text style={styles.momoText}>MTN MoMo</Text>
              </View>
              <View style={styles.momoBadge}>
                <Text style={styles.momoText}>Moov Money</Text>
              </View>
            </View>
            <Button
              title="Payer et débloquer"
              onPress={handleUnlockContact}
              loading={passLoading}
              fullWidth
              style={styles.modalBtn}
            />
            <TouchableOpacity
              onPress={() => setShowPassModal(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Signalement */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Flag size={28} color={colors.warning} />
            <Text style={styles.modalTitle}>Signaler ce logement</Text>
            <Text style={styles.modalMsg}>
              Si ce logement est déjà occupé ou indisponible, signalez-le. En cas
              de fraude confirmée, le propriétaire sera sanctionné (amende de 3
              crédits + annonce masquée).
            </Text>
            <Button
              title="Confirmer le signalement"
              onPress={handleReport}
              loading={reportLoading}
              variant="danger"
              fullWidth
              style={styles.modalBtn}
            />
            <TouchableOpacity
              onPress={() => setShowReportModal(false)}
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

function BackHeader() {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.8}
      >
        <ChevronLeft size={24} color={colors.neutral[700]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  gallery: {
    position: 'relative',
  },
  mainPhoto: {
    width: '100%',
    height: 280,
    backgroundColor: colors.neutral[100],
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnails: {
    padding: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: {
    borderColor: colors.clay[600],
  },
  boostBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warm[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  boostText: {
    ...typography.caption,
    color: colors.neutral[0],
    fontFamily: typography.fontSemiBold,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.neutral[800],
    fontSize: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.neutral[500],
  },
  price: {
    ...typography.h2,
    color: colors.clay[700],
    marginTop: spacing.sm,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent[600],
  },
  availableText: {
    ...typography.small,
    color: colors.accent[700],
    fontFamily: typography.fontSemiBold,
  },
  dateText: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.neutral[800],
    marginBottom: spacing.sm,
  },
  sectionBody: {
    ...typography.body,
    color: colors.neutral[600],
    lineHeight: 24,
  },
  commoditesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  commoditeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  commoditeText: {
    ...typography.small,
    color: colors.neutral[700],
    fontFamily: typography.fontMedium,
  },
  contactCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.clay[50],
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contactTitle: {
    ...typography.h3,
    color: colors.neutral[800],
  },
  contactName: {
    ...typography.h3,
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  contactPhone: {
    ...typography.h2,
    color: colors.accent[700],
    marginBottom: spacing.sm,
  },
  contactHint: {
    ...typography.small,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  contactLockedTitle: {
    ...typography.h3,
    color: colors.neutral[800],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  contactLockedMsg: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  unlockBtn: {
    width: '100%',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  reportText: {
    ...typography.small,
    color: colors.neutral[500],
    fontFamily: typography.fontMedium,
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
  },
  errorMsg: {
    ...typography.body,
    color: colors.neutral[500],
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
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.neutral[800],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  modalMsg: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing.lg,
  },
  modalPrice: {
    ...typography.h1,
    color: colors.clay[700],
    fontSize: 32,
  },
  modalPriceSub: {
    ...typography.body,
    color: colors.neutral[500],
  },
  momoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  momoBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  momoText: {
    ...typography.small,
    color: colors.neutral[700],
    fontFamily: typography.fontSemiBold,
  },
  modalBtn: {
    width: '100%',
  },
  modalCancel: {
    marginTop: spacing.md,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.neutral[500],
    fontFamily: typography.fontMedium,
  },
});
