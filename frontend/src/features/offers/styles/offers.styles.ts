import { createThemedStyles } from '@/theme/create-themed-styles';

export const useOfferStyles = createThemedStyles((colors) => ({
  page: { padding: 36, gap: 24, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  stack: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  card: { padding: 22, gap: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
  title: { fontSize: 19, lineHeight: 27, fontWeight: '600' },
  amount: { color: colors.green, fontWeight: '700', fontSize: 24, lineHeight: 32 },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  input: { minHeight: 46, padding: 12, color: colors.ink, borderColor: colors.controlLine, borderWidth: 1, borderRadius: 10, fontSize: 14, backgroundColor: colors.surface },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  error: { color: colors.red, fontSize: 14, lineHeight: 22 },
  notice: { color: colors.green, fontSize: 14, lineHeight: 22 },
  filter: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.line },
  active: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  recipient: { padding: 14, gap: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, gap: 12 },
}));
