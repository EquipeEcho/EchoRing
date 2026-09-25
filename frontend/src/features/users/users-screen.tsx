import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Eye, EyeOff, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react-native';
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | ManagedRole>('all');
  const token = session?.token;
  const compact = width < 760;
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const visibleUsers = users.filter(user => (roleFilter === 'all' || user.role === roleFilter)
    && (!normalizedSearch || `${user.name} ${user.email}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)));
  const roleFilters: { value: 'all' | 'admin' | ManagedRole; label: string }[] = [
    { value: 'all', label: 'Todos' }, { value: 'admin', label: 'Administradores' },
    { value: 'employee', label: 'Funcionários' }, { value: 'translator', label: 'Tradutores' }, { value: 'hr', label: 'RH' },
  ];
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
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.page, width < 700 && s.pageSmall]} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.inner}>
      <PageHeading title="Usuários" subtitle="Cadastre pessoas e defina como cada uma acessa a plataforma." action={<Button icon={UserPlus} onPress={begin}>Adicionar usuário</Button>} />
      {!!notice && <View style={s.notice}><Txt accessibilityLiveRegion="polite" style={{ color: colors.green }}>{notice}</Txt></View>}
      {!!error && !open && <View style={s.errorBox}><Txt accessibilityRole="alert" style={s.error}>{error}</Txt><Button variant="secondary" onPress={() => void load()}>Tentar novamente</Button></View>}
      <View style={[s.overview, compact && s.overviewSmall]}>
        <View style={s.overviewLead}><View style={s.overviewAccent} /><View><Txt style={s.overviewEyebrow}>DIRETÓRIO DA EQUIPE</Txt><View style={s.totalLine}><Txt style={s.total}>{users.length}</Txt><Txt style={s.totalLabel}>{users.length === 1 ? 'acesso ativo' : 'acessos ativos'}</Txt></View></View></View>
        <View style={s.roleStats}>{[
          ['Administradores', users.filter(user => user.role === 'admin').length, colors.red],
          ['Funcionários', users.filter(user => user.role === 'employee').length, colors.green],
          ['Tradutores', users.filter(user => user.role === 'translator').length, colors.blue],
          ['RH', users.filter(user => user.role === 'hr').length, colors.amber],
        ].map(([label, value, color]) => <View key={String(label)} style={s.roleStat}><View style={[s.roleDot, { backgroundColor: color as string }]} /><View><Txt style={s.roleStatValue}>{String(value)}</Txt><Txt style={s.roleStatLabel}>{String(label)}</Txt></View></View>)}</View>
      </View>
      <View style={[s.toolbar, compact && s.toolbarSmall]}>
        <View style={[s.search, compact && { width: '100%' }]}><Search size={18} color={colors.muted} /><TextInput accessibilityLabel="Buscar usuários" value={search} onChangeText={setSearch} placeholder="Buscar por nome ou e-mail" placeholderTextColor={colors.muted} style={s.searchInput} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.filters}>{roleFilters.map(filter => <Pressable key={filter.value} accessibilityRole="tab" accessibilityState={{ selected: roleFilter === filter.value }} onPress={() => setRoleFilter(filter.value)} style={[s.filter, roleFilter === filter.value && s.filterActive]}><Txt style={[s.filterText, roleFilter === filter.value && s.filterTextActive]}>{filter.label}</Txt></Pressable>)}</ScrollView>
      </View>
      {!loading && !error && !users.length ? <EmptyState icon={UsersRound} title="Nenhum usuário cadastrado" text="Adicione a primeira pessoa que utilizará a plataforma." action={<Button icon={UserPlus} onPress={begin}>Adicionar usuário</Button>} /> : <View style={s.directory}>
        {!compact && <View style={s.tableHead}><Txt style={[s.columnLabel, { flex: 1 }]}>Pessoa</Txt><Txt style={[s.columnLabel, s.roleColumn]}>Perfil de acesso</Txt><Txt style={[s.columnLabel, s.statusColumn]}>Situação</Txt></View>}
        {visibleUsers.map(user => <View key={user.id} style={[s.userRow, compact && s.userRowSmall]}>
          <View style={s.identity}><View style={s.avatar}><Txt style={s.avatarText}>{user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</Txt></View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt numberOfLines={1} style={s.userName}>{user.name}</Txt><Txt numberOfLines={1} style={s.userEmail}>{user.email}</Txt></View>
          </View>
          <View style={[s.roleColumn, compact && s.mobileMeta]}><Badge tone={user.role === 'admin' ? 'red' : user.role === 'translator' ? 'blue' : user.role === 'hr' ? 'amber' : 'green'}>{roleLabel[user.role]}</Badge>{compact && <View style={s.status}><View style={[s.statusDot, { backgroundColor: user.active ? colors.green : colors.red }]} /><Txt style={s.statusText}>{user.active ? 'Ativo' : 'Inativo'}</Txt></View>}</View>
          {!compact && <View style={[s.statusColumn, s.status]}><View style={[s.statusDot, { backgroundColor: user.active ? colors.green : colors.red }]} /><Txt style={s.statusText}>{user.active ? 'Ativo' : 'Inativo'}</Txt></View>}
        </View>)}
        {!loading && !!users.length && !visibleUsers.length && <EmptyState icon={Search} title="Nenhuma pessoa encontrada" text="Tente outro termo ou perfil de acesso." />}
        {loading && <View style={s.loading}><Txt style={common.caption}>Carregando diretório...</Txt></View>}
        <View style={s.directoryFooter}><ShieldCheck size={16} color={colors.muted} /><Txt style={common.caption}>Apenas administradores gerais podem criar novos acessos.</Txt></View>
      </View>}
    </View>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} eyebrow="GESTÃO DE ACESSOS" title="Adicionar usuário" description="Crie as credenciais iniciais e defina as permissões.">
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
  overview: { minHeight: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 28, paddingHorizontal: 28, paddingVertical: 24, marginBottom: 28, backgroundColor: '#0D0D0F', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  overviewSmall: { alignItems: 'stretch', flexDirection: 'column', paddingHorizontal: 18, gap: 24 },
  overviewLead: { flexDirection: 'row', alignItems: 'stretch', gap: 18 }, overviewAccent: { width: 3, borderRadius: 2, backgroundColor: colors.accent },
  overviewEyebrow: { fontSize: 10, lineHeight: 16, letterSpacing: 2.4, color: colors.muted, fontWeight: '600' }, totalLine: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 5 },
  total: { fontSize: 48, lineHeight: 53, fontWeight: '700', letterSpacing: -2 }, totalLabel: { fontSize: 14, color: colors.muted },
  roleStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 26 }, roleStat: { minWidth: 94, flexDirection: 'row', alignItems: 'center', gap: 11 },
  roleDot: { width: 7, height: 7, borderRadius: 4 }, roleStatValue: { fontSize: 22, lineHeight: 27, fontWeight: '600' }, roleStatLabel: { fontSize: 11, lineHeight: 17, color: colors.muted },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 22, marginBottom: 16 }, toolbarSmall: { alignItems: 'stretch', flexDirection: 'column', gap: 4 },
  search: { width: 320, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#48484F' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, color: colors.ink, fontFamily: font, fontSize: 14, outlineWidth: 0 }, filters: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7 },
  filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 10 }, filterActive: { backgroundColor: colors.accentSoft }, filterText: { fontSize: 13, color: colors.muted }, filterTextActive: { color: colors.accent, fontWeight: '600' },
  directory: { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  tableHead: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 22, backgroundColor: '#0B0B0D', borderBottomWidth: 1, borderBottomColor: colors.line }, columnLabel: { fontSize: 10, letterSpacing: 1.5, color: colors.muted, fontWeight: '600' },
  userRow: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  userRowSmall: { minHeight: 0, alignItems: 'stretch', flexDirection: 'column', gap: 12, paddingHorizontal: 18, paddingVertical: 18 }, identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: '#552132', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  userName: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  userEmail: { fontSize: 13, lineHeight: 19, color: colors.muted }, roleColumn: { width: 190, alignItems: 'flex-start' }, statusColumn: { width: 100 }, mobileMeta: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { color: colors.muted, fontSize: 13 },
  loading: { minHeight: 120, alignItems: 'center', justifyContent: 'center' }, directoryFooter: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22 },
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
