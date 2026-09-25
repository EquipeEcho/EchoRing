import { type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@/constants/design';
import { Txt } from './primitives';

export function Dialog({ open, onClose, title, eyebrow, description, size = 'default', children }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; description?: string;
  size?: 'compact' | 'default' | 'wide'; children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={[s.overlay, mobile && s.overlayMobile]} accessibilityRole="none">
      <Pressable onPress={event => event.stopPropagation()} style={[s.dialog, size === 'compact' && s.compact, size === 'wide' && s.wide, mobile && s.dialogMobile]} accessibilityRole="none">
        <View style={[s.header, mobile && s.headerMobile]}><View style={s.headerCopy}>{eyebrow && <Txt style={s.eyebrow}>{eyebrow}</Txt>}<Txt accessibilityRole="header" style={[s.title, mobile && s.titleMobile]}>{title}</Txt>{description && <Txt style={s.description}>{description}</Txt>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={({ hovered, pressed }) => [s.close, hovered && s.closeHover, pressed && { opacity: 0.72 }]}><X size={21} color={colors.muted} strokeWidth={1.8} /></Pressable>
        </View>
        <ScrollView style={s.scroll} contentContainerStyle={[s.content, mobile && s.contentMobile]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>{children}</ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.84)', justifyContent: 'center', alignItems: 'center', padding: 24, ...Platform.select({ web: { backdropFilter: 'blur(8px)' } as any, default: {} }) }, overlayMobile: { padding: 10, justifyContent: 'flex-end' },
  dialog: { width: '100%', maxWidth: 600, maxHeight: '88%', backgroundColor: '#101012', borderWidth: 1, borderColor: '#303034', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.72)' }, compact: { maxWidth: 460 }, wide: { maxWidth: 880 }, dialogMobile: { maxHeight: '94%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 18, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#0D0D0F' }, headerMobile: { minHeight: 80, paddingHorizontal: 20, paddingVertical: 15 }, headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: { fontSize: 9, lineHeight: 14, letterSpacing: 2, color: colors.accent, fontWeight: '600' }, title: { fontSize: 24, lineHeight: 31, letterSpacing: -0.6, fontWeight: '700' }, titleMobile: { fontSize: 21, lineHeight: 28 }, description: { marginTop: 2, fontSize: 12, lineHeight: 18, color: colors.muted },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#141416' }, closeHover: { borderColor: '#574149', backgroundColor: colors.accentSoft },
  scroll: { minHeight: 0 }, content: { paddingHorizontal: 28, paddingVertical: 26, gap: 22 }, contentMobile: { paddingHorizontal: 20, paddingVertical: 22, gap: 20 },
});
