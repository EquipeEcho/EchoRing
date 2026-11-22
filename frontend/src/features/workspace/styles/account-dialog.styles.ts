import { createThemedStyles } from '@/theme/create-themed-styles';

export const useStyles = createThemedStyles(colors => ({
  body: { gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 17, lineHeight: 23, color: colors.accent, fontWeight: '600' },
  identityCopy: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 23, letterSpacing: -0.2, fontWeight: '600' },
  email: { fontSize: 13, lineHeight: 20, color: colors.muted },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  role: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 12, lineHeight: 18 },
  context: { fontSize: 13, lineHeight: 20, color: colors.muted },
  actions: { gap: 2, marginTop: 2, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line },
  action: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 8 },
  actionHover: { backgroundColor: colors.elevated },
  actionText: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  signOutText: { color: colors.muted, fontWeight: '400' },
}));
