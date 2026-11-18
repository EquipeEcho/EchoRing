import { createThemedStyles } from '@/theme/create-themed-styles';
import { radius } from '@/theme/tokens';

export const useStyles = createThemedStyles(colors => ({
  anchor: { position: 'absolute', zIndex: 30, alignItems: 'flex-end' },
  buttonWrap: { alignItems: 'flex-end', justifyContent: 'center' },
  fab: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', boxShadow: colors.cardShadow,
  },
  fabActive: { backgroundColor: colors.accentStrong, transform: [{ scale: 1.05 }] },
  availabilityDot: {
    position: 'absolute', right: 3, top: 3, width: 12, height: 12,
    borderRadius: 6, backgroundColor: colors.amber, borderWidth: 2, borderColor: colors.surface,
  },
  tooltip: {
    position: 'absolute', right: 70, backgroundColor: colors.ink, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 120,
  },
  tooltipText: { color: colors.surface, fontSize: 12, textAlign: 'center' },
  window: {
    backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1,
    borderColor: colors.line, boxShadow: colors.cardShadow, overflow: 'hidden',
  },
  windowContent: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  agentIcon: {
    width: 42, height: 42, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.accentSoft,
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  status: { fontSize: 12, lineHeight: 18, color: colors.muted },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1, minHeight: 0 },
  messageContent: { padding: 16, gap: 12 },
  welcome: {
    alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: colors.elevated,
    borderRadius: 14, padding: 12,
  },
  messageText: { fontSize: 14, lineHeight: 21 },
  suggestions: { gap: 8, alignItems: 'flex-start' },
  suggestionsLabel: { fontSize: 12, color: colors.muted },
  suggestion: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10 },
  suggestionText: { color: colors.accent, fontSize: 13, lineHeight: 19 },
  messageRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '90%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  userBubble: { backgroundColor: colors.accent },
  agentBubble: { backgroundColor: colors.elevated },
  userText: { color: colors.onAccent, fontSize: 14, lineHeight: 21 },
  time: { color: colors.muted, fontSize: 10, lineHeight: 15, alignSelf: 'flex-end', marginTop: 4 },
  userTime: { color: colors.onAccent, opacity: 0.8 },
  error: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.redSoft,
    padding: 10, borderRadius: 10,
  },
  errorText: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 18 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  input: {
    flex: 1, minWidth: 0, minHeight: 44, maxHeight: 100, paddingHorizontal: 12,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.controlLine,
    backgroundColor: colors.canvas, color: colors.ink, fontSize: 14, lineHeight: 20,
  },
  send: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
}));
