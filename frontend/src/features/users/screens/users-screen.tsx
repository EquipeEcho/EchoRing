import { Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { roleLabel } from '@/features/auth/constants';
import { UserField } from '@/features/users/components/user-field';
import { roles } from '@/features/users/constants';
import { useUserManagement } from '@/features/users/hooks/use-user-management';
import { useStyles } from '@/features/users/styles/users.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function UsersScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const {
    begin,
    notice,
    error,
    open,
    load,
    users,
    search,
    setSearch,
    roleFilters,
    roleFilter,
    setRoleFilter,
    loading,
    visibleUsers,
    busy,
    setOpen,
    data,
    change,
    visible,
    setVisible,
    submit,
  } = useUserManagement();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <PageHeading
          title="Usuários"
          subtitle="Cadastre pessoas e defina como cada uma acessa a plataforma."
          action={
            <Button icon={UserPlus} onPress={begin}>
              Adicionar usuário
            </Button>
          }
        />
        {!!notice && (
          <View style={styles.notice}>
            <Txt accessibilityLiveRegion="polite" style={{ color: colors.green }}>
              {notice}
            </Txt>
          </View>
        )}
        {!!error && !open && (
          <View style={styles.errorBox}>
            <Txt accessibilityRole="alert" style={styles.error}>
              {error}
            </Txt>
            <Button variant="secondary" onPress={() => void load()}>
              Tentar novamente
            </Button>
          </View>
        )}
        <View style={[styles.overview, compact && styles.overviewSmall]}>
          <View style={styles.overviewLead}>
            <View style={styles.overviewAccent} />
            <View>
              <Txt style={styles.overviewEyebrow}>DIRETÓRIO DA EQUIPE</Txt>
              <View style={styles.totalLine}>
                <Txt style={styles.total}>{users.length}</Txt>
                <Txt style={styles.totalLabel}>
                  {users.length === 1 ? 'acesso ativo' : 'acessos ativos'}
                </Txt>
              </View>
            </View>
          </View>
          <View style={styles.roleStats}>
            {[
              ['Administradores', users.filter((user) => user.role === 'admin').length, colors.red],
              [
                'Funcionários',
                users.filter((user) => user.role === 'employee').length,
                colors.green,
              ],
              [
                'Tradutores',
                users.filter((user) => user.role === 'translator').length,
                colors.blue,
              ],
              ['RH', users.filter((user) => user.role === 'hr').length, colors.amber],
            ].map(([label, value, color]) => (
              <View key={String(label)} style={styles.roleStat}>
                <View style={[styles.roleDot, { backgroundColor: color as string }]} />
                <View>
                  <Txt style={styles.roleStatValue}>{String(value)}</Txt>
                  <Txt style={styles.roleStatLabel}>{String(label)}</Txt>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.toolbar, compact && styles.toolbarSmall]}>
          <View testID="search-field" style={[styles.search, compact && { width: '100%' }]}>
            <Search size={18} color={colors.muted} />
            <TextInput
              accessibilityLabel="Buscar usuários"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nome ou e-mail"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {roleFilters.map((filter) => (
              <Pressable
                key={filter.value}
                accessibilityRole="tab"
                accessibilityState={{ selected: roleFilter === filter.value }}
                onPress={() => setRoleFilter(filter.value)}
                style={[styles.filter, roleFilter === filter.value && styles.filterActive]}
              >
                <Txt
                  style={[
                    styles.filterText,
                    roleFilter === filter.value && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {!loading && !error && !users.length ? (
          <EmptyState
            icon={UsersRound}
            title="Nenhum usuário cadastrado"
            text="Adicione a primeira pessoa que utilizará a plataforma."
            action={
              <Button icon={UserPlus} onPress={begin}>
                Adicionar usuário
              </Button>
            }
          />
        ) : (
          <View style={styles.directory}>
            {!compact && (
              <View style={styles.tableHead}>
                <Txt style={[styles.columnLabel, { flex: 1 }]}>Pessoa</Txt>
                <Txt style={[styles.columnLabel, styles.roleColumn]}>Perfil de acesso</Txt>
                <Txt style={[styles.columnLabel, styles.statusColumn]}>Situação</Txt>
              </View>
            )}
            {visibleUsers.map((user) => (
              <View key={user.id} style={[styles.userRow, compact && styles.userRowSmall]}>
                <View style={styles.identity}>
                  <View style={styles.avatar}>
                    <Txt style={styles.avatarText}>
                      {user.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()}
                    </Txt>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Txt numberOfLines={1} style={styles.userName}>
                      {user.name}
                    </Txt>
                    <Txt numberOfLines={1} style={styles.userEmail}>
                      {user.email}
                    </Txt>
                  </View>
                </View>
                <View style={[styles.roleColumn, compact && styles.mobileMeta]}>
                  <Badge
                    tone={
                      user.role === 'admin'
                        ? 'red'
                        : user.role === 'translator'
                          ? 'blue'
                          : user.role === 'hr'
                            ? 'amber'
                            : 'green'
                    }
                  >
                    {roleLabel[user.role]}
                  </Badge>
                  {compact && (
                    <View style={styles.status}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: !user.active ? colors.red : user.onboardingRequired ? colors.amber : colors.green },
                        ]}
                      />
                      <Txt style={styles.statusText}>{!user.active ? 'Inativo' : user.onboardingRequired ? 'Cadastro pendente' : 'Ativo'}</Txt>
                    </View>
                  )}
                </View>
                {!compact && (
                  <View style={[styles.statusColumn, styles.status]}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: !user.active ? colors.red : user.onboardingRequired ? colors.amber : colors.green },
                      ]}
                    />
                    <Txt style={styles.statusText}>{!user.active ? 'Inativo' : user.onboardingRequired ? 'Cadastro pendente' : 'Ativo'}</Txt>
                  </View>
                )}
              </View>
            ))}
            {!loading && !!users.length && !visibleUsers.length && (
              <EmptyState
                icon={Search}
                title="Nenhuma pessoa encontrada"
                text="Tente outro termo ou perfil de acesso."
              />
            )}
            {loading && (
              <View style={styles.loading}>
                <Txt style={common.caption}>Carregando diretório...</Txt>
              </View>
            )}
            <View style={styles.directoryFooter}>
              <ShieldCheck size={16} color={colors.muted} />
              <Txt style={common.caption}>
                Apenas administradores gerais podem criar novos acessos.
              </Txt>
            </View>
          </View>
        )}
      </View>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        mobileSheet
        eyebrow="GESTÃO DE ACESSOS"
        title="Adicionar usuário"
        description="Crie as credenciais iniciais e defina as permissões."
      >
        <Txt style={common.caption}>
          A pessoa usará o e-mail e a senha inicial para entrar. O perfil determina as áreas
          disponíveis.
        </Txt>
        <UserField
          label="Nome completo"
          value={data.name}
          onChange={(value) => change('name', value)}
          placeholder="Ex.: Marina Costa"
        />
        <UserField
          label="E-mail"
          value={data.email}
          onChange={(value) => change('email', value)}
          placeholder="nome@empresa.com"
        />
        <View style={styles.field}>
          <Txt style={styles.label}>Perfil de acesso</Txt>
          <View style={styles.roles}>
            {roles.map((role) => (
              <Pressable
                key={role.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: data.role === role.value }}
                aria-checked={data.role === role.value}
                onPress={() => change('role', role.value)}
                style={[styles.role, data.role === role.value && styles.roleActive]}
              >
                <Txt
                  style={[styles.roleTitle, data.role === role.value && { color: colors.accent }]}
                >
                  {role.title}
                </Txt>
                <Txt style={common.caption}>{role.description}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <UserField
          label="Senha inicial"
          value={data.password}
          onChange={(value) => change('password', value)}
          placeholder="Mínimo de 12 caracteres"
          secure
          visible={visible}
          onToggle={() => setVisible((current) => !current)}
        />
        {!!error && (
          <Txt accessibilityRole="alert" style={styles.error}>
            {error}
          </Txt>
        )}
        <View style={styles.actions}>
          <Button variant="ghost" disabled={busy} onPress={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button icon={UserPlus} loading={busy} onPress={submit}>
            Criar acesso
          </Button>
        </View>
      </Dialog>
    </ScrollView>
  );
}
