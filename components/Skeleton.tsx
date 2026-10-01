import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp, Easing } from 'react-native';
import { colors, spacing, radius } from '@/lib/theme';

export function Skeleton({
  width = '100%', height = 16, radius: r = radius.sm, style,
}: { width?: number | string; height?: number | string; radius?: number; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height: height as any, borderRadius: r,
          backgroundColor: colors.neutral[200] },
        { opacity }, style,
      ]}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={180} radius={radius.lg} />
      <View style={styles.body}>
        <Skeleton width="70%" height={18} />
        <View style={styles.row}><Skeleton width="50%" height={14} /></View>
        <View style={styles.row}>
          <Skeleton width="40%" height={20} />
          <Skeleton width="30%" height={20} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.neutral[0], borderRadius: radius.lg,
    padding: spacing.sm, marginBottom: spacing.md },
  body: { paddingVertical: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
