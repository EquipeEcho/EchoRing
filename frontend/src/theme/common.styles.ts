import { StyleSheet } from 'react-native';

import { colors, typeScale } from '@/theme/tokens';

export const common = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { ...typeScale.section, fontWeight: '600', color: colors.ink },
  caption: { ...typeScale.caption, color: colors.muted },
});
