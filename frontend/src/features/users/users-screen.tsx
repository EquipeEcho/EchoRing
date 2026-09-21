import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Eye, EyeOff, UserPlus, UsersRound } from 'lucide-react-native';
import { Badge, Button, EmptyState, IconButton, PageHeading, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { colors, font } from '@/constants/design';
import { roleLabel, useSession } from '@/features/auth/session';
import { createUser, getUsers, type ManagedRole, type ManagedUser } from './service';

const roles: { value: ManagedRole; title: string; description: string }[] = [
  { value: 'translator', title: 'Tradutor', description: 'Acompanha projetos, tarefas e entregas atribuídas.' },
  { value: 'employee', title: 'Funcionário', description: 'Atua na operação, solicitações e gestão de projetos.' },
  { value: 'hr', title: 'Recursos Humanos', description: 'Acessa informações e áreas relacionadas às pessoas.' },
];
const blank = { name: '', email: '', password: '', role: 'translator' as ManagedRole };

function Field({ label, value, onChange, placeholder, secure, visible, onToggle }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string;
  secure?: boolean; visible?: boolean; onToggle?: () => void;
}) {
  return <View style={s.field}><Txt style={s.label}>{label}</Txt><View style={s.inputWrap}><TextInput
    accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted}
    autoCapitalize={label === 'E-mail' ? 'none' : 'words'} autoCorrect={false} keyboardType={label === 'E-mail' ? 'email-address' : 'default'}
    secureTextEntry={secure && !visible} style={s.input} />
    {secure && onToggle && <IconButton icon={visible ? EyeOff : Eye} label={visible ? 'Ocultar senha inicial' : 'Mostrar senha inicial'} onPress={onToggle} />}
  </View></View>;
}

export function UsersScreen() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ ...blank });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const token = session?.token;
  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try { setUsers(await getUsers(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    return () => clearTimeout(initial);
  }, [load]);
  function change<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData(current => ({ ...current, [key]: value }));
    setError('');
  }
  function begin() { setData({ ...blank }); setVisible(false); setError(''); setOpen(true); }
  async function submit() {
    if (busy || !token) return;
    const email = data.email.trim().toLowerCase();
    if (data.name.trim().length < 2) { setError('Informe o nome completo.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um e-mail válido.'); return; }
    if (data.password.length < 12) { setError('A senha inicial deve ter pelo menos 12 caracteres.'); return; }
    setBusy(true);
    try {
      const created = await createUser({ ...data, name: data.name.trim(), email }, token);
      setUsers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setOpen(false);
      setNotice(`${created.name} já pode acessar a plataforma como ${roleLabel[created.role]}.`);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.page, width < 700 && s.pageSmall]}>
    <View style={s.inner}>
      <PageHeading title="Usuários" subtitle="Cadastre pessoas e defina como cada uma acessa a plataforma." action={<Button icon={UserPlus} onPress={begin}>Adicionar usuário</Button>} />
      {!!notice && <View style={s.notice}><Txt accessibilityLiveRegion="polite" style={{ color: colors.green }}>{notice}</Txt></View>}
      {!!error && !open && <View style={s.errorBox}><Txt accessibilityRole="alert" style={s.error}>{error}</Txt><Button variant="secondary" onPress={() => void load()}>Tentar novamente</Button></View>}
      <View style={s.summary}><View><Txt style={common.caption}>CONTAS CADASTRADAS</Txt><Txt style={s.total}>{users.length}</Txt></View><Badge tone="neutral">Somente administrador geral</Badge></View>
      {!loading && !error && !users.length ? <EmptyState icon={UsersRound} title="Nenhum usuário cadastrado" text="Adicione a primeira pessoa que utilizará a plataforma." action={<Button icon={UserPlus} onPress={begin}>Adicionar usuário</Button>} /> : <View style={s.userList}>
        {users.map(user => <View key={user.id} style={[s.userRow, width < 650 && s.userRowSmall]}>
          <View style={s.avatar}><Txt style={s.avatarText}>{user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</Txt></View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt numberOfLines={1} style={s.userName}>{user.name}</Txt><Txt numberOfLines={1} style={common.caption}>{user.email}</Txt></View>
          <Badge tone={user.role === 'admin' ? 'red' : user.role === 'translator' ? 'blue' : user.role === 'hr' ? 'amber' : 'green'}>{roleLabel[user.role]}</Badge>
          <Txt style={[common.caption, { color: user.active ? colors.green : colors.red }]}>{user.active ? 'Ativo' : 'Inativo'}</Txt>
        </View>)}
      </View>}
    </View>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} title="Adicionar usuário">
      <Txt style={common.caption}>A pessoa usará o e-mail e a senha inicial para entrar. O perfil determina as áreas disponíveis.</Txt>
      <Field label="Nome completo" value={data.name} onChange={value => change('name', value)} placeholder="Ex.: Marina Costa" />
      <Field label="E-mail" value={data.email} onChange={value => change('email', value)} placeholder="nome@empresa.com" />
      <View style={s.field}><Txt style={s.label}>Perfil de acesso</Txt><View style={s.roles}>{roles.map(role => <Pressable key={role.value} accessibilityRole="radio" accessibilityState={{ checked: data.role === role.value }} aria-checked={data.role === role.value} onPress={() => change('role', role.value)} style={[s.role, data.role === role.value && s.roleActive]}><Txt style={[s.roleTitle, data.role === role.value && { color: colors.accent }]}>{role.title}</Txt><Txt style={common.caption}>{role.description}</Txt></Pressable>)}</View></View>
      <Field label="Senha inicial" value={data.password} onChange={value => change('password', value)} placeholder="Mínimo de 12 caracteres" secure visible={visible} onToggle={() => setVisible(current => !current)} />
      {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
      <View style={s.actions}><Button variant="ghost" disabled={busy} onPress={() => setOpen(false)}>Cancelar</Button><Button icon={UserPlus} loading={busy} onPress={submit}>Criar acesso</Button></View>
    </Dialog>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { padding: 40, paddingTop: 28, paddingBottom: 48, flexGrow: 1 },
  pageSmall: { padding: 20, paddingTop: 26 },
  inner: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
  notice: { backgroundColor: colors.greenSoft, borderWidth: 1, borderColor: '#29533F', borderRadius: 16, padding: 16, marginBottom: 24 },
  errorBox: { backgroundColor: colors.redSoft, borderRadius: 16, padding: 16, gap: 12, marginBottom: 24 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 20, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  total: { fontSize: 38, lineHeight: 45, fontWeight: '700', marginTop: 4 },
  userList: { gap: 12 },
  userRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18 },
  userRowSmall: { flexWrap: 'wrap' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  userName: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  field: { gap: 8 },
  label: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  inputWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingLeft: 15, paddingRight: 3, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  input: { flex: 1, minWidth: 0, minHeight: 48, color: colors.ink, fontFamily: font, fontSize: 15, outlineWidth: 0 },
  roles: { gap: 8 },
  role: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13, gap: 3, backgroundColor: colors.canvas },
  roleActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  roleTitle: { fontSize: 14, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
});
