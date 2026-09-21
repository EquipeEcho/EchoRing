import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, typeScale } from '@/constants/design';
import { IconButton, Txt } from './primitives';

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={s.overlay} accessibilityRole="none">
      <Pressable onPress={event => event.stopPropagation()} style={s.dialog} accessibilityRole="none">
        <View style={s.header}><Txt accessibilityRole="header" style={s.title}>{title}</Txt><IconButton icon={X} label="Fechar" onPress={onClose} /></View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, width: '100%', maxWidth: 520, maxHeight: '90%', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { ...typeScale.section, fontWeight: '600', flex: 1 },
  content: { padding: 24, gap: 20 },
});
