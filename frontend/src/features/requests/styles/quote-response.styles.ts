import { createThemedStyles } from '@/theme/create-themed-styles';

export const useStyles = createThemedStyles((colors) => ({
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
    backgroundColor: colors.canvas,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    gap: 28,
    padding: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
  },
  center: { alignItems: 'center', gap: 18, paddingVertical: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.8, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 29, lineHeight: 37, fontWeight: '700', textAlign: 'center' },
  description: {
    maxWidth: 520,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  choices: { gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
  error: { color: colors.red, fontSize: 14, lineHeight: 21 },
}));
