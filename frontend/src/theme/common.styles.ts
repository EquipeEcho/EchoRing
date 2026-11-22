import { typeScale } from '@/theme/tokens';
import { createThemedStyles } from '@/theme/create-themed-styles';

export const useCommonStyles = createThemedStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { ...typeScale.section, fontSize: 20, lineHeight: 28, fontWeight: '600', color: colors.ink },
  caption: { ...typeScale.caption, color: colors.muted },
}));
