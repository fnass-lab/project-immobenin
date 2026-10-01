import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import type { Listing } from '@/lib/types';
import { formatFCFA } from '@/lib/format';
import { MapPin, Zap, ImageOff } from 'lucide-react-native';

export function ListingCard({ listing, onPress }: {
  listing: Listing; onPress: () => void;
}) {
  const isBoosted = listing.boosted_until && new Date(listing.boosted_until) > new Date();
  const photo = listing.photos?.[0];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <ImageOff size={32} color={colors.neutral[400]} />
          </View>
        )}
        {isBoosted && (
          <View style={styles.boostBadge}>
            <Zap size={12} color={colors.neutral[0]} fill={colors.neutral[0]} />
            <Text style={styles.boostText}>Boost</Text>
          </View>
        )}
        <View style={styles.availableBadge}>
          <View style={styles.dot} />
          <Text style={styles.availableText}>Disponible</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{listing.titre}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.neutral[500]} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.quartier ? `${listing.quartier}, ` : ''}{listing.ville}
          </Text>
        </View>
        <Text style={styles.price}>{formatFCFA(listing.prix)}/mois</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.neutral[0], borderRadius: radius.lg,
    marginBottom: spacing.md, ...shadows.card, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  imageWrap: { position: 'relative', width: '100%', height: 180 },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center' },
  boostBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.warm[500], paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: radius.pill },
  boostText: { ...typography.caption, color: colors.neutral[0],
    fontFamily: typography.fontSemiBold },
  availableBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.92)', paddingHorizontal: spacing.sm,
    paddingVertical: 4, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neutral[0] },
  availableText: { ...typography.caption, color: colors.neutral[0],
    fontFamily: typography.fontSemiBold },
  body: { padding: spacing.md, gap: spacing.xs },
  title: { ...typography.h3, color: colors.neutral[800], fontSize: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { ...typography.small, color: colors.neutral[500], flexShrink: 1 },
  price: { ...typography.body, color: colors.clay[700],
    fontFamily: typography.fontSemiBold, fontSize: 16, marginTop: 2 },
});
