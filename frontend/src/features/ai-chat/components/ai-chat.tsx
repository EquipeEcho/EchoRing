import { AlertCircle, Bot, ChevronDown, Send, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { TextInput } from '@/components/ui/text-input';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { sendAIChatMessage, type AIChatMessage } from '@/features/ai-chat/services/ai-chat-service';
import { useStyles } from '@/features/ai-chat/styles/ai-chat.styles';
import { useSession } from '@/features/auth/contexts/session-context';
import { desktopWidth, fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-context';

const suggestions = [
  'Como posso organizar as solicitações?',
  'Como acompanho os projetos em andamento?',
];

export function AIChat() {
  const styles = useStyles();
  const { session } = useSession();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('Aguardando mensagem');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const nextId = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const buttonRef = useRef<View>(null);
  const windowRef = useRef<View>(null);
  const wasOpen = useRef(false);
  const { session } = useSession();

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(error => console.warn('Não foi possível verificar a preferência de movimento reduzido.', error));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 0 : 160,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [open, opacity, reduceMotion]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (open) inputRef.current?.focus();
      else if (wasOpen.current) {
        const button = buttonRef.current;
        if (button && 'focus' in button && typeof button.focus === 'function') button.focus();
      }
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const chatWindow = windowRef.current;
      if (event.key === 'Escape' && chatWindow instanceof Node && event.target instanceof Node && chatWindow.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const send = async () => {
    const content = draft.trim();
    if (sending || content.length < 3 || content.length > 500) return;
    const userMessage: AIChatMessage = {
      id: String(nextId.current++), role: 'user', content, createdAt: Date.now(),
    };
    setMessages(previous => [...previous, userMessage]);
    setDraft('');
    setError('');
    setSending(true);
    setStatus('Processando solicitação...');
    const result = await sendAIChatMessage({ message: content }, session?.token);
    if (result.status === 'success') {
      setMessages(previous => [...previous, {
        id: String(nextId.current++), role: 'assistant', content: result.message, createdAt: Date.now(),
      }]);
      setStatus('Resposta recebida');
    } else {
      setError(result.message);
      setStatus(result.status === 'unavailable' ? 'Serviço indisponível' : 'Erro na solicitação');
    }
    setSending(false);
  };

  const bottom = width >= desktopWidth ? 24 : 96;
  return (
    <View pointerEvents="box-none" style={[styles.anchor, { right: width < 400 ? 12 : 24, bottom }]}>
      {visible && (
        <Animated.View
          ref={windowRef}
          pointerEvents={open ? 'auto' : 'none'}
          style={[styles.window, {
            width: Math.min(400, width - (width < 400 ? 24 : 48)),
            height: Math.min(550, Math.max(220, height - bottom - 24)),
            opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }]}
        >
          <KeyboardAvoidingView style={styles.windowContent} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <AIChatHeader status={status} onMinimize={() => setOpen(false)} />
            <AIChatMessages messages={messages} error={error} sending={sending} onSuggestion={value => {
              setDraft(value);
              inputRef.current?.focus();
            }} />
            <AIChatInput inputRef={inputRef} value={draft} sending={sending} onChange={setDraft} onSend={send} />
          </KeyboardAvoidingView>
        </Animated.View>
      )}
      {!open && <AIChatButton buttonRef={buttonRef} onPress={() => { setVisible(true); setOpen(true); }} />}
    </View>
  );
}

function AIChatButton({ buttonRef, onPress }: { buttonRef: React.RefObject<View | null>; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <View style={styles.buttonWrap}>
      {hovered && <View pointerEvents="none" style={styles.tooltip}><Txt style={styles.tooltipText}>Assistente de IA</Txt></View>}
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel="Assistente de IA"
        accessibilityHint="Abrir conversa com o assistente"
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed, hovered: isHovered }) => [styles.fab, (pressed || isHovered) && styles.fabActive]}
      >
        <Sparkles size={25} color={colors.onAccent} />
        <View style={styles.availabilityDot} />
      </Pressable>
    </View>
  );
}

function AIChatHeader({ status, onMinimize }: { status: string; onMinimize: () => void }) {
function AIChatHeader({ status, onMinimize }: { status: string; onMinimize: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.agentIcon}><Bot size={22} color={colors.accent} /></View>
      <View style={styles.headerText}>
        <Txt style={styles.title}>Assistente IA</Txt>
        <Txt style={styles.status}>{status}</Txt>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Minimizar assistente" onPress={onMinimize} style={styles.iconButton}>
        <ChevronDown size={22} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function AIChatMessages({ messages, error, sending, onSuggestion }: {
  messages: AIChatMessage[];
  sending: boolean;
  error: string;
  sending: boolean;
  onSuggestion: (value: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const scroll = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={scroll}
      accessibilityLabel="Mensagens do assistente"
      style={styles.messages}
      contentContainerStyle={styles.messageContent}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
    >
      <View style={styles.welcome}>
        <Txt style={styles.messageText}>Olá! Sou seu assistente de IA. Como posso ajudar você hoje?</Txt>
      </View>
      {messages.length === 0 && (
        <View style={styles.suggestions}>
          <Txt style={styles.suggestionsLabel}>Sugestões para começar</Txt>
          {suggestions.map(value => (
            <Pressable key={value} accessibilityRole="button" onPress={() => onSuggestion(value)} style={styles.suggestion}>
              <Txt style={styles.suggestionText}>{value}</Txt>
            </Pressable>
          ))}
        </View>
      )}
      {messages.map(message => <AIChatMessageView key={message.id} message={message} />)}
      {sending && (
        <View accessibilityLiveRegion="polite" style={styles.processing}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Txt style={styles.processingText}>O assistente está processando sua solicitação...</Txt>
        </View>
      )}
      {!!error && (
        <View accessibilityRole="alert" style={styles.error}>
          <AlertCircle size={17} color={colors.red} />
          <Txt style={styles.errorText}>{error}</Txt>
        </View>
      )}
    </ScrollView>
  );
}

function AIChatMessageView({ message }: { message: AIChatMessage }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const user = message.role === 'user';
  return (
    <View style={[styles.messageRow, user && styles.userRow]}>
      <View style={[styles.bubble, user ? styles.userBubble : styles.agentBubble]}>
        {user ? <Txt style={styles.userText}>{message.content}</Txt> : (
          <Markdown style={{
            body: { color: colors.ink, fontFamily: fonts.regular, fontSize: 14 },
            code_inline: {
              backgroundColor: 'transparent', borderWidth: 0, padding: 0, borderRadius: 0, color: colors.ink,
            },
            fence: {
              backgroundColor: 'transparent', borderWidth: 0, padding: 0, borderRadius: 0, color: colors.ink,
            },
            code_block: {
              backgroundColor: 'transparent', borderWidth: 0, padding: 0, borderRadius: 0, color: colors.ink,
            },
            table: { borderColor: colors.line },
            th: { borderColor: colors.line },
            tr: { borderColor: colors.line },
            link: { color: colors.accent },
          }}>{message.content}</Markdown>
        )}
        <Txt style={[styles.time, user && styles.userTime]}>
          {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Txt>
      </View>
    </View>
  );
}

function AIChatInput({ inputRef, value, sending, onChange, onSend }: {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const canSend = !disabled && value.trim().length >= 3 && value.trim().length <= 500;
  const onKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const nativeEvent = event.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean; isComposing?: boolean };
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey && !nativeEvent.isComposing) {
      event.preventDefault();
      onSend();
    }
  };
  return (
    <View style={styles.composer}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Mensagem para o assistente"
        accessibilityHint="Digite de 3 a 500 caracteres."
        placeholder="Escreva sua mensagem..."
        placeholderTextColor={colors.muted}
        maxLength={500}
        multiline
        editable={!disabled}
        maxLength={500}
        value={value}
        onChangeText={onChange}
        onKeyPress={onKeyPress}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
        accessibilityState={{ disabled: sending || value.trim().length < 3 || value.trim().length > 500 }}
        disabled={sending || value.trim().length < 3 || value.trim().length > 500}
        onPress={onSend}
        style={[styles.send, (sending || value.trim().length < 3 || value.trim().length > 500) && styles.sendDisabled]}
      >
        <Send size={19} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}
