import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Listing } from '@/lib/types';
import { VILLES, COMMODITES } from '@/lib/types';
import { Camera, X, CheckCircle2, ImageOff, AlertCircle } from 'lucide-react-native';

export default function AjouterScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [ville, setVille] = useState<string>(VILLES[0]);
  const [quartier, setQuartier] = useState('');
  const [commodites, setCommodites] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isBlocked = (profile?.solde_credits ?? 0) < 1;

  const toggleCommodite = (c: string) => {
    setCommodites((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  // Demande la permission au moment de l'usage, avec un texte explicatif
  const handleAddPhotos = useCallback(async () => {
    setError(null);

    // Vérifier la permission avec un contexte explicatif
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Accès aux photos requis',
        "Pour ajouter des photos de votre bien, autorisez l'accès à vos photos. Vous pouvez l'activer dans les réglages de votre téléphone.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    });

    if (result.canceled) return;
    const newUris = result.assets.map((a) => a.uri);
    setPhotos((prev) => [...prev, ...newUris].slice(0, 6));
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!titre.trim()) return 'Veuillez saisir un titre.';
    if (!description.trim()) return 'Veuillez saisir une description.';
    if (!prix.trim()) return 'Veuillez saisir un prix.';
    const prixNum = parseInt(prix.replace(/\D/g, ''), 10);
    if (isNaN(prixNum) || prixNum <= 0) return 'Prix invalide.';
    if (!ville) return 'Veuillez choisir une ville.';
    if (!quartier.trim()) return 'Veuillez saisir un quartier.';
    if (photos.length === 0) return 'Veuillez ajouter au moins une photo.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    if (isBlocked) {
      setError(
        "Vous n'avez pas assez de crédits. Achetez des crédits pour publier une annonce.",
      );
      return;
    }

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    const prixNum = parseInt(prix.replace(/\D/g, ''), 10);

    // Insérer l'annonce (owner_id est rempli par défaut auth.uid())
    const { data, error: insertErr } = await supabase
      .from('listings')
      .insert({
        titre: titre.trim(),
        description: description.trim(),
        prix: prixNum,
        ville,
        quartier: quartier.trim(),
        commodites: commodites,
        photos: photos, // Dans une vraie app, uploader vers Storage d'abord
        statut: 'disponible',
      })
      .select()
      .maybeSingle();

    if (insertErr || !data) {
      setError("Impossible de publier l'annonce. Réessayez.");
      setLoading(false);
      return;
    }

    // Débiter 1 crédit
    const newSolde = (profile?.solde_credits ?? 0) - 1;
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ solde_credits: newSolde })
      .eq('id', session!.user.id)
      .select()
      .maybeSingle();

    if (profileErr) {
      // L'annonce est publiée mais le débit a échoué — ne pas bloquer
      console.warn('Débit crédit échoué:', profileErr.message);
    }

    await refreshProfile();
    setLoading(false);
    setSuccess(true);

    // Reset form
    setTitre('');
    setDescription('');
    setPrix('');
    setQuartier('');
    setCommodites([]);
    setPhotos([]);

    Alert.alert(
      'Annonce publiée !',
      'Votre annonce est maintenant visible par les locataires. Il vous reste ' +
        newSolde +
        ' crédit(s).',
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Ajouter un appartement</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Vos crédits</Text>
            <Text
              style={[
                styles.balanceValue,
                isBlocked && styles.balanceBlocked,
              ]}
            >
              {profile?.solde_credits ?? 0}
            </Text>
          </View>
          {isBlocked && (
            <View style={styles.warnBox}>
              <AlertCircle size={16} color={colors.error} />
              <Text style={styles.warnText}>
                Solde insuffisant. Achetez des crédits dans l'onglet Profil pour
                publier.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successBox}>
              <CheckCircle2 size={16} color={colors.accent[600]} />
              <Text style={styles.successText}>Annonce publiée avec succès !</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Titre de l'annonce</Text>
            <TextInput
              style={styles.input}
              value={titre}
              onChangeText={setTitre}
              placeholder="Ex: Studio meublé à Cotonou"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le logement, le quartier, les repères…"
              placeholderTextColor={colors.neutral[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Prix (FCFA/mois)</Text>
              <TextInput
                style={styles.input}
                value={prix}
                onChangeText={setPrix}
                placeholder="45000"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Ville</Text>
              <View style={styles.pickerWrap}>
                {VILLES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setVille(v)}
                    style={[styles.pickerItem, ville === v && styles.pickerItemActive]}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        ville === v && styles.pickerTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Quartier / Repères</Text>
            <TextInput
              style={styles.input}
              value={quartier}
              onChangeText={setQuartier}
              placeholder="Ex: Calavi Kpota, près de la pharmacie"
              placeholderTextColor={colors.neutral[400]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Commodités</Text>
            <View style={styles.commoditesGrid}>
              {COMMODITES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => toggleCommodite(c)}
                  style={[
                    styles.commoditeChip,
                    commodites.includes(c) && styles.commoditeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.commoditeText,
                      commodites.includes(c) && styles.commoditeTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Photos (max 6)</Text>
            <TouchableOpacity
              onPress={handleAddPhotos}
              style={styles.addPhotoBtn}
              activeOpacity={0.8}
            >
              <Camera size={24} color={colors.clay[600]} />
              <Text style={styles.addPhotoText}>Ajouter des photos</Text>
              <Text style={styles.addPhotoHint}>
                Autorisez l'accès à vos photos quand demandé.
              </Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <View style={styles.photosGrid}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoWrap}>
                    <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => removePhoto(i)}
                      style={styles.removePhoto}
                    >
                      <X size={14} color={colors.neutral[0]} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Button
            title="Publier (1 crédit)"
            onPress={handleSubmit}
            loading={loading}
            disabled={isBlocked}
            fullWidth
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  title: {
    ...typography.h1,
    color: colors.neutral[800],
    fontSize: 24,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
  },
  balanceValue: {
    ...typography.h2,
    color: colors.clay[700],
  },
  balanceBlocked: {
    color: colors.error,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnText: {
    ...typography.small,
    color: colors.error,
    flex: 1,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent[50],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.small,
    color: colors.accent[700],
    fontFamily: typography.fontSemiBold,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  textArea: {
    minHeight: 100,
  },
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  pickerItemActive: {
    borderColor: colors.clay[600],
    backgroundColor: colors.clay[50],
  },
  pickerText: {
    ...typography.small,
    color: colors.neutral[600],
  },
  pickerTextActive: {
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  commoditesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  commoditeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
  },
  commoditeChipActive: {
    borderColor: colors.accent[600],
    backgroundColor: colors.accent[50],
  },
  commoditeText: {
    ...typography.small,
    color: colors.neutral[600],
  },
  commoditeTextActive: {
    color: colors.accent[700],
    fontFamily: typography.fontSemiBold,
  },
  addPhotoBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.neutral[300],
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral[0],
  },
  addPhotoText: {
    ...typography.body,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
  },
  addPhotoHint: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    marginTop: spacing.lg,
  },
});
