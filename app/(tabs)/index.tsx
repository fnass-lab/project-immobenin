import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { ListingCard } from '@/components/ListingCard';
import { ListingCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { VILLES } from '@/lib/types';
import { Search, MapPin, Home, Frown } from 'lucide-react-native';

type LoadState = 'loading' | 'error' | 'success';

export default function HomeScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [ville, setVille] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const loadListings = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    let query = supabase
      .from('listings')
      .select('*')
      .eq('statut', 'disponible')
      .order('created_at', { ascending: false });

    if (ville) {
      query = query.eq('ville', ville);
    }
    if (search.trim()) {
      query = query.or(
        `titre.ilike.%${search.trim()}%,quartier.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`,
      );
    }

    const { data, error } = await query;
    if (error) {
      setErrorMsg(error.message);
      setState('error');
      setRefreshing(false);
      return;
    }
    // Tri : boostés d'abord, puis par date
    const sorted = [...(data || [])].sort((a, b) => {
      const aBoost = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
      const bBoost = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    setListings(sorted);
    setState('success');
    setRefreshing(false);
  }, [ville, search]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const renderContent = () => {
    if (state === 'loading') {
      return (
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (state === 'error') {
      return (
        <View style={styles.errorContainer}>
          <Frown size={48} color={colors.neutral[400]} />
          <Text style={styles.errorTitle}>Impossible de charger les annonces</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadListings}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (listings.length === 0) {
      return (
        <EmptyState
          title="Aucune annonce trouvée"
          message="Essayez de modifier votre recherche ou votre ville."
          icon={<Home size={32} color={colors.neutral[400]} />}
        />
      );
    }
    return (
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => router.push(`/listing/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ImmoBénin</Text>
        <Text style={styles.headerSub}>
          Trouvez votre appartement au Bénin
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Quartier, titre, mot-clé…"
            placeholderTextColor={colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.villeRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            onPress={() => setVille('')}
            style={[styles.chip, !ville && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, !ville && styles.chipTextActive]}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          {VILLES.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setVille(v)}
              style={[styles.chip, ville === v && styles.chipActive]}
            >
              <MapPin size={12} color={ville === v ? colors.neutral[0] : colors.neutral[500]} />
              <Text
                style={[styles.chipText, ville === v && styles.chipTextActive]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.clay[700],
    fontSize: 26,
  },
  headerSub: {
    ...typography.body,
    color: colors.neutral[500],
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral[0],
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: typography.fontRegular,
    color: colors.neutral[800],
  },
  villeRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.neutral[0],
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
  },
  chipActive: {
    backgroundColor: colors.clay[600],
    borderColor: colors.clay[600],
  },
  chipText: {
    ...typography.small,
    color: colors.neutral[600],
    fontFamily: typography.fontMedium,
  },
  chipTextActive: {
    color: colors.neutral[0],
    fontFamily: typography.fontSemiBold,
  },
  list: {
    padding: spacing.lg,
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
  errorMsg: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.clay[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  retryText: {
    ...typography.body,
    color: colors.neutral[0],
    fontFamily: typography.fontSemiBold,
  },
});
