import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, type DimensionValue, View } from 'react-native';

import { createThemedStyles } from '@/theme/create-themed-styles';
import { radius, spacing } from '@/theme/tokens';

function usePulse() {
  const [opacity] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(0.7); return; }
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver }),
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);
  return opacity;
}

/** Placeholder block that pulses while content loads. */
export function SkeletonBlock({ width = '100%', height = 14, round = false }: { width?: DimensionValue; height?: number; round?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.block, { width, height }, round && { borderRadius: height / 2 }]} />;
}

/** List-shaped loading state; keeps the page layout steady until the rows arrive. */
export function SkeletonList({ label, rows = 3, variant = 'row' }: { label: string; rows?: number; variant?: 'row' | 'card' }) {
  const styles = useStyles();
  const opacity = usePulse();
  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy style={[styles.list, { opacity }]}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, variant === 'card' && styles.card]}>
          <SkeletonBlock width={40} height={40} />
          <View style={styles.copy}>
            <SkeletonBlock width={index % 2 ? '46%' : '62%'} height={16} />
            <SkeletonBlock width={index % 2 ? '72%' : '38%'} height={12} />
            {variant === 'card' && <SkeletonBlock width="84%" height={12} />}
          </View>
          <SkeletonBlock width={88} height={22} round />
        </View>
      ))}
    </Animated.View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  block: { backgroundColor: colors.elevated, borderRadius: radius.sm },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  card: { alignItems: 'flex-start', padding: spacing.xl, boxShadow: colors.cardShadow },
  copy: { flex: 1, minWidth: 0, gap: spacing.sm },
}));
