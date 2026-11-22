import { router } from 'expo-router';
import { ChevronRight, LogOut, UserRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Dialog } from '@/components/ui/dialog';
import { Txt } from '@/components/ui/text';
import { roleLabel } from '@/features/auth/constants';
import { type Session } from '@/features/auth/types';
import { useStyles } from '@/features/workspace/styles/account-dialog.styles';
import { useTheme } from '@/theme/theme-context';

export function AccountDialog({ open, session, initials, onClose, onSignOut }: {
  open: boolean;
  session: Session | null;
  initials: string;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  if (!session) return null;
  const workspace = session.role === 'translator' ? 'Portal do tradutor' : session.role === 'hr' ? 'Recursos Humanos' : 'Gestão da plataforma';
  const statusColor = session.demo ? colors.amber : colors.green;
  return (
    <Dialog open={open} onClose={onClose} size="compact" density="compact" title="Meu perfil">
      <View style={s.body}>
        <View style={s.identity}>
          <View style={s.avatar}><Txt style={s.initials}>{initials}</Txt></View>
          <View style={s.identityCopy}>
            <Txt style={s.name}>{session.name}</Txt>
            <Txt selectable numberOfLines={2} accessibilityLabel={session.email} style={s.email}>{session.email}</Txt>
          </View>
        </View>
        <View style={s.meta}>
          <Txt style={s.role}>{roleLabel[session.role]}</Txt>
          <View style={s.status}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Txt style={[s.statusText, { color: statusColor }]}>{session.demo ? 'Modo demonstração' : 'Conta autenticada'}</Txt>
          </View>
        </View>
        <Txt style={s.context}>Aliança Traduções · {workspace}</Txt>
        <View style={s.actions}>
          {session.role === 'translator' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver perfil profissional"
              onPress={() => { onClose(); router.push('/perfil'); }}
              style={({ hovered, pressed }) => [s.action, hovered && s.actionHover, pressed && { opacity: 0.75 }]}
            >
              <UserRound size={17} color={colors.accent} />
              <Txt style={s.actionText}>Ver perfil profissional</Txt>
              <ChevronRight size={16} color={colors.muted} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            onPress={onSignOut}
            style={({ hovered, pressed }) => [s.action, hovered && s.actionHover, pressed && { opacity: 0.75 }]}
          >
            <LogOut size={17} color={colors.muted} />
            <Txt style={[s.actionText, s.signOutText]}>Sair da conta</Txt>
          </Pressable>
        </View>
      </View>
    </Dialog>
  );
}
