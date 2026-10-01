import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/lib/types';
import { VILLES } from '@/lib/types';
import { formatFCFA } from '@/lib/format';
import { Bot, Send, MapPin, Sparkles, Home } from 'lucide-react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestions?: Listing[];
}

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: "Bonjour ! Je suis ImmoAssistant. Décrivez le logement que vous cherchez (ville, quartier, budget, commodités) et je trouve les annonces correspondantes.",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, thinking]);

  // Analyse en langage naturel simple : extrait ville, budget max, mots-clés
  const parseQuery = (text: string) => {
    const lower = text.toLowerCase();
    let ville: string | null = null;
    for (const v of VILLES) {
      if (lower.includes(v.toLowerCase())) {
        ville = v;
        break;
      }
    }
    // Budget : "moins de 45000", "< 45000", "max 45000", "budget 45000"
    let maxPrice: number | null = null;
    const priceMatch = lower.match(/(?:moins de|max|<|inférieur à|budget de?)\s*(\d[\d\s]*)/);
    if (priceMatch) {
      maxPrice = parseInt(priceMatch[1].replace(/\s/g, ''), 10);
    }
    // Commodités
    const commodites: string[] = [];
    if (lower.includes('pavé')) commodites.push('Pavé');
    if (lower.includes('clim')) commodites.push('Climatisation');
    if (lower.includes('sbee') || lower.includes('compteur')) commodites.push('Compteur prépayé SBEE');
    if (lower.includes('soneb') || lower.includes('eau')) commodites.push('Eau SONEB');
    if (lower.includes('wifi') || lower.includes('wi-fi')) commodites.push('Wi-Fi');
    if (lower.includes('parking')) commodites.push('Parking');
    return { ville, maxPrice, commodites, keywords: lower };
  };

  const searchListings = async (params: ReturnType<typeof parseQuery>) => {
    let query = supabase
      .from('listings')
      .select('*')
      .eq('statut', 'disponible');
    if (params.ville) query = query.eq('ville', params.ville);
    if (params.maxPrice) query = query.lte('prix', params.maxPrice);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error || !data) return [];
    let results = data as Listing[];
    // Filtrer par commodités (toutes doivent être présentes)
    if (params.commodites.length > 0) {
      results = results.filter((l) =>
        params.commodites.every((c) => (l.commodites || []).includes(c)),
      );
    }
    // Boostés en premier
    results.sort((a, b) => {
      const aB = a.boosted_until && new Date(a.boosted_until) > new Date() ? 1 : 0;
      const bB = b.boosted_until && new Date(b.boosted_until) > new Date() ? 1 : 0;
      return bB - aB;
    });
    return results.slice(0, 5);
  };

  const buildResponse = (params: ReturnType<typeof parseQuery>, results: Listing[]): string => {
    if (results.length === 0) {
      let msg = "Je n'ai pas trouvé d'annonce correspondante";
      if (params.ville) msg += ` à ${params.ville}`;
      if (params.maxPrice) msg += ` à moins de ${formatFCFA(params.maxPrice)}`;
      msg += ". Essayez d'élargir vos critères.";
      return msg;
    }
    let msg = `J'ai trouvé ${results.length} annonce${results.length > 1 ? 's' : ''} qui correspond${results.length > 1 ? 'ent' : ''} à votre recherche`;
    if (params.ville) msg += ` à ${params.ville}`;
    if (params.maxPrice) msg += ` à moins de ${formatFCFA(params.maxPrice)}`;
    msg += '. Voici mes recommandations :';
    return msg;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const params = parseQuery(text);
    const results = await searchListings(params);
    const responseText = buildResponse(params, results);

    setThinking(false);
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: responseText,
      suggestions: results.length > 0 ? results : undefined,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const renderSuggestion = (listing: Listing) => (
    <Pressable
      key={listing.id}
      onPress={() => router.push(`/listing/${listing.id}`)}
      style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
    >
      <View style={styles.suggestionHeader}>
        <Text style={styles.suggestionTitle} numberOfLines={1}>
          {listing.titre}
        </Text>
        {listing.boosted_until && new Date(listing.boosted_until) > new Date() && (
          <View style={styles.boostTag}>
            <Sparkles size={10} color={colors.warm[500]} />
          </View>
        )}
      </View>
      <View style={styles.suggestionRow}>
        <MapPin size={12} color={colors.neutral[500]} />
        <Text style={styles.suggestionLocation} numberOfLines={1}>
          {listing.quartier ? `${listing.quartier}, ` : ''}
          {listing.ville}
        </Text>
      </View>
      <Text style={styles.suggestionPrice}>{formatFCFA(listing.prix)}/mois</Text>
    </Pressable>
  );

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.msg, item.role === 'user' ? styles.userMsg : styles.assistantMsg]}>
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Bot size={16} color={colors.neutral[0]} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.bubbleText}>{item.text}</Text>
      </View>
      {item.suggestions && item.suggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          {item.suggestions.map(renderSuggestion)}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bot size={22} color={colors.neutral[0]} />
        </View>
        <View>
          <Text style={styles.headerTitle}>ImmoAssistant</Text>
          <Text style={styles.headerSub}>Votre assistant immobilier IA</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {thinking && (
        <View style={styles.thinkingRow}>
          <View style={styles.avatar}>
            <Bot size={16} color={colors.neutral[0]} />
          </View>
          <View style={styles.thinkingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ex: entrée couchée pavée à Calavi Kpota, moins de 45 000 FCFA"
            placeholderTextColor={colors.neutral[400]}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || thinking}
            style={[styles.sendBtn, (!input.trim() || thinking) && styles.sendDisabled]}
            activeOpacity={0.8}
          >
            <Send size={18} color={colors.neutral[0]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.neutral[800],
  },
  headerSub: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  chatList: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  msg: {
    maxWidth: '85%',
  },
  userMsg: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantMsg: {
    alignSelf: 'flex-start',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.clay[600],
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.neutral[0],
    borderBottomLeftRadius: 4,
    ...shadows.card,
  },
  bubbleText: {
    ...typography.body,
    color: colors.neutral[800],
  },
  suggestionsList: {
    gap: spacing.sm,
  },
  suggestion: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  suggestionTitle: {
    ...typography.body,
    color: colors.neutral[800],
    fontFamily: typography.fontSemiBold,
    flex: 1,
  },
  boostTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  suggestionLocation: {
    ...typography.small,
    color: colors.neutral[500],
  },
  suggestionPrice: {
    ...typography.body,
    color: colors.clay[700],
    fontFamily: typography.fontSemiBold,
    marginTop: 4,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral[400],
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontFamily: typography.fontRegular,
    color: colors.neutral[800],
    backgroundColor: colors.neutral[50],
    maxHeight: 80,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.clay[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
