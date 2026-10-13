import { Image, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { colors } from '@/theme/tokens';

export function Brand({
  compact = false,
  inverse = false,
  wordmarkOnly = false,
}: {
  compact?: boolean;
  inverse?: boolean;
  wordmarkOnly?: boolean;
}) {
  return (
    <View accessible accessibilityLabel="Echo Ring, traduções que conectam" style={styles.brand}>
      {!wordmarkOnly && (
        <Image
          source={require('@/assets/images/brand/echoring-mark.png')}
          resizeMode="contain"
          style={[styles.brandMark, compact && styles.brandMarkCompact]}
        />
      )}
      <View>
        <View style={styles.wordmark}>
          <Txt
            style={[
              styles.brandName,
              compact && styles.brandNameCompact,
              inverse && { color: colors.white },
            ]}
          >
            echo
          </Txt>
          <Txt style={[styles.brandName, styles.brandAccent, compact && styles.brandNameCompact]}>
            ring
          </Txt>
        </View>
        {!compact && (
          <Txt style={[styles.brandCaption, inverse && { color: colors.navigationMuted }]}>
            TRADUÇÕES QUE CONECTAM
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42 },
  brandMarkCompact: { width: 34, height: 34 },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
  brandName: { fontSize: 25, fontWeight: '700', lineHeight: 27, letterSpacing: -1.1 },
  brandNameCompact: { fontSize: 21, lineHeight: 24, letterSpacing: -0.8 },
  brandAccent: { color: colors.accent },
  brandCaption: {
    fontSize: 7,
    color: colors.muted,
    lineHeight: 11,
    letterSpacing: 2.25,
    fontWeight: '600',
  },
});
