import { X } from 'lucide-react-native';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components/ui/text';
import { createThemedStyles } from '@/theme/create-themed-styles';
import { useTheme } from '@/theme/theme-context';

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  description,
  size = 'default',
  density = 'default',
  mobileSheet = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  size?: 'compact' | 'default' | 'wide';
  density?: 'default' | 'compact';
  mobileSheet?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const s = useStyles();
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  const titleId = useId();
  const surface = useRef<View>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web' || !window.visualViewport) return;
    const visible = window.visualViewport;
    const update = () => setViewport(visible.scale === 1 ? { height: visible.height, top: visible.offsetTop } : null);
    update();
    visible.addEventListener('resize', update);
    visible.addEventListener('scroll', update);
    return () => {
      visible.removeEventListener('resize', update);
      visible.removeEventListener('scroll', update);
    };
  }, [open]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const elements = () => {
      const container = surface.current as unknown as HTMLElement | null;
      return Array.from(container?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ) ?? []).filter(element => element.getClientRects().length && element.getAttribute('aria-disabled') !== 'true');
    };
    const timer = setTimeout(() => elements()[0]?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      const dialogs = Array.from(document.querySelectorAll('[data-testid="dialog-surface"]')).filter(element => element.getClientRects().length);
      if (dialogs.at(-1) !== (surface.current as unknown as HTMLElement)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current();
      }
      if (event.key === 'Tab') {
        const focusable = elements();
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[s.overlay, mobile && s.overlayMobile,
          viewport && { position: 'absolute', left: 0, right: 0, top: viewport.top, height: viewport.height }]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} accessibilityRole="none" />
        <View
          ref={surface}
          testID="dialog-surface"
          role="dialog"
          aria-modal
          aria-labelledby={titleId}
          style={[
            s.dialog,
            size === 'compact' && s.compact,
            size === 'wide' && s.wide,
            mobile && s.dialogMobile,
            mobile && size === 'compact' && s.dialogCompactMobile,
            mobile && size === 'wide' && s.dialogWideMobile,
            mobile && mobileSheet && s.dialogSelectionMobile,
            density === 'compact' && size === 'compact' && s.denseCompact,
          ]}
        >
          <View style={[s.header, mobile && s.headerMobile, density === 'compact' && s.denseHeader]}>
            <View style={s.headerCopy}>
              {eyebrow && <Txt style={s.eyebrow}>{eyebrow}</Txt>}
              <Txt nativeID={titleId} accessibilityRole="header" style={[s.title, mobile && s.titleMobile, density === 'compact' && s.denseTitle]}>
                {title}
              </Txt>
              {description && <Txt style={s.description}>{description}</Txt>}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              style={({ hovered, pressed }) => [
                s.close,
                density === 'compact' && s.denseClose,
                hovered && s.closeHover,
                pressed && { opacity: 0.72 },
              ]}
            >
              <X size={21} color={colors.muted} strokeWidth={1.8} />
            </Pressable>
          </View>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.content, mobile && s.contentMobile, density === 'compact' && s.denseContent,
              mobile && { paddingBottom: Math.max(density === 'compact' ? 18 : 22, insets.bottom + 12) }]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            showsHorizontalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = createThemedStyles((colors, selectColor) => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...Platform.select({ web: { backdropFilter: 'blur(8px)' } as any, default: {} }),
  },
  overlayMobile: { padding: 0, justifyContent: 'flex-end' },
  dialog: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '88%',
    flexShrink: 1,
    backgroundColor: selectColor('#101012', colors.surface),
    borderWidth: 1,
    borderColor: selectColor('#303034', colors.controlLine),
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: selectColor('0 32px 100px rgba(0,0,0,0.72)', '0 32px 100px rgba(25,25,45,0.10)'),
  },
  compact: { maxWidth: 460 },
  wide: { maxWidth: 880 },
  dialogMobile: { maxHeight: '94%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dialogCompactMobile: { minHeight: 0 },
  dialogWideMobile: { height: '94%' },
  dialogSelectionMobile: { height: '76%' },
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 19,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: selectColor('#0D0D0F', colors.surface),
  },
  headerMobile: { minHeight: 80, paddingHorizontal: 20, paddingVertical: 15 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  eyebrow: {
    fontSize: 9,
    lineHeight: 14,
    letterSpacing: 2,
    color: colors.accent,
    fontWeight: '600',
  },
  title: { fontSize: 24, lineHeight: 31, letterSpacing: -0.6, fontWeight: '700' },
  titleMobile: { fontSize: 21, lineHeight: 28 },
  description: { marginTop: 2, fontSize: 14, lineHeight: 22, color: colors.muted },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: selectColor('#141416', colors.surface),
  },
  closeHover: { borderColor: selectColor('#574149', colors.accent), backgroundColor: colors.accentSoft },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 28, paddingVertical: 26, gap: 22 },
  contentMobile: { paddingHorizontal: 20, paddingVertical: 22, gap: 20 },
  denseCompact: { maxWidth: 400, minHeight: 0 },
  denseHeader: { minHeight: 64, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0 },
  denseTitle: { fontSize: 20, lineHeight: 26 },
  denseClose: { borderWidth: 0, borderRadius: 10, backgroundColor: 'transparent' },
  denseContent: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 18, gap: 12 },
}));
