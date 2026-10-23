import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Clock3, ExternalLink, GraduationCap, Languages, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound, Wrench } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { useTranslatorProfile } from '@/features/translators/hooks/use-translator-profile';
import { useStyles } from '@/features/translators/styles/profile.styles';
import { profileCompleteness, profileLink } from '@/features/translators/utils/profile-summary';
import { useTheme } from '@/theme/theme-context';

export function MyTranslatorProfileScreen() {
  const { session } = useSession();
  if (session?.role !== 'translator') return <Redirect href="/dashboard" />;
  return <ProfilePage />;
}

export function TeamTranslatorProfileScreen() {
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (session?.role === 'translator') return <Redirect href="/perfil" />;
  return <ProfilePage key={id} translatorId={id} />;
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return <View style={[styles.card, width < 600 && styles.cardSmall]}>
    <View style={styles.cardHeader}><Icon size={19} color={colors.muted} /><Txt accessibilityRole="header" style={styles.sectionTitle}>{title}</Txt></View>
    {children}
  </View>;
}

function TextDetail({ label, value }: { label: string; value?: string }) {
  const styles = useStyles();
  return <View style={styles.section}><Txt style={styles.label}>{label}</Txt>
    <Txt style={value ? styles.text : styles.muted}>{value || 'Ainda não informado.'}</Txt></View>;
}

function Tags({ values }: { values: string[] }) {
  const styles = useStyles();
  return values.length ? <View style={styles.chips}>{values.map(value => <View key={value} style={styles.chip}><Txt style={styles.chipText}>{value}</Txt></View>)}</View>
    : <Txt style={styles.muted}>Ainda não informado.</Txt>;
}

function ProfilePage({ translatorId }: { translatorId?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(width);
  const compact = contentWidth < 900;
  const { session } = useSession();
  const own = !translatorId;
  const { atualizado } = useLocalSearchParams<{ atualizado?: string }>();
  const { record, loading, error, retry } = useTranslatorProfile(translatorId);
  const [linkError, setLinkError] = useState('');
  async function openLink(value: string) {
    setLinkError('');
    try { await Linking.openURL(value); }
    catch { setLinkError('Não foi possível abrir o link. Tente novamente ou use outro aplicativo.'); }
  }
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.accent} accessibilityLabel="Carregando perfil do tradutor" /></View>;
  if (!record || error) return <ScrollView contentContainerStyle={styles.page}><EmptyState icon={UserRound} title="Não foi possível carregar o perfil" text={error || 'Perfil indisponível.'}
    action={<Button onPress={retry}>Tentar novamente</Button>} /></ScrollView>;
  const { profile: data, account, activity } = record;
  const completeness = profileCompleteness(data);
  const initials = (data.fullName || account.name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const location = [data.city, data.country].filter(Boolean).join(', ');
  const updated = record.updatedAt ? new Date(record.updatedAt) : null;
  const pageAction = own && !session?.demo ? <Button icon={Pencil} onPress={() => router.push('/perfil/editar')}>Editar perfil</Button>
    : !own ? <Button variant="secondary" icon={ArrowLeft} onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')}>Voltar</Button> : undefined;
  return <ScrollView contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]} keyboardShouldPersistTaps="handled">
    <View style={styles.container} onLayout={event => setContentWidth(event.nativeEvent.layout.width)}>
      <PageHeading spacing="flush" title={own ? 'Meu perfil profissional' : 'Perfil do tradutor'} subtitle={own ? 'Seu trabalho, sua trajetória e suas informações em um só lugar.' : 'Conheça a experiência e as áreas de atuação deste profissional.'}
        action={width >= 700 ? pageAction : undefined} />
      {session?.demo && <View style={styles.notice}><Txt style={styles.noticeText}>Demonstração · dados fictícios. A edição está disponível no acesso autenticado.</Txt></View>}
      {own && atualizado === '1' && <View style={styles.notice}><Txt accessibilityLiveRegion="polite" style={styles.noticeText}>Perfil atualizado com sucesso.</Txt></View>}
      <View style={styles.hero}>
        <View style={[styles.heroBody, width < 600 && styles.heroSmall]}>
          <View style={styles.identity}>
            <View style={styles.avatar}><Txt style={styles.avatarText}>{initials}</Txt></View>
            <View style={styles.heroCopy}><Txt style={styles.eyebrow}>TRADUTOR ECHO RING</Txt>
              <Txt accessibilityRole="header" style={[styles.name, width < 600 && styles.nameSmall]}>{data.fullName || account.name}</Txt>
              <Txt style={styles.title}>{data.professionalTitle || 'Profissional de tradução'}</Txt>
              <View style={styles.row}>
                {location ? <><MapPin size={15} color={colors.muted} /><Txt style={styles.muted}>{location}</Txt></> : null}
                <Badge tone={account.onboardingRequired ? 'amber' : record.completedAt ? 'green' : 'neutral'}>{account.onboardingRequired ? 'Cadastro pendente' : record.completedAt ? 'Cadastro concluído' : 'Perfil em construção'}</Badge>
              </View>
            </View>
          </View>
          <View style={styles.chips}>
            <Badge tone="neutral">{data.languages.length} {data.languages.length === 1 ? 'idioma' : 'idiomas'}</Badge>
            {data.experienceYears !== null && <Badge tone="neutral">{data.experienceYears === 0 ? 'Em início de carreira' : `${data.experienceYears} ${data.experienceYears === 1 ? 'ano' : 'anos'} de experiência`}</Badge>}
          </View>
          <View style={styles.heroFooter}>{width < 700 && pageAction}<View style={styles.privacy}><ShieldCheck size={16} color={colors.muted} /><Txt style={[styles.muted, { flex: 1 }]}>Perfil interno, visível ao tradutor e à equipe do EchoRing.</Txt></View>
            {updated && !Number.isNaN(updated.getTime()) && <Txt style={styles.muted}>Atualizado em {updated.toLocaleDateString('pt-BR')}</Txt>}
          </View>
        </View>
      </View>
      {!!linkError && <Txt accessibilityRole="alert" style={styles.error}>{linkError}</Txt>}
      <View style={[styles.layout, compact && styles.layoutSmall]}>
        <View style={[styles.main, compact && styles.mainSmall]}>
          <Card title="Sobre o profissional" icon={UserRound}><Txt style={data.bio ? styles.text : styles.muted}>{data.bio || 'Este profissional ainda não adicionou uma apresentação.'}</Txt></Card>
          <Card title="Idiomas" icon={Languages}>
            {data.languages.length ? data.languages.map(language => <View key={language.name} style={styles.language}><Txt style={styles.text}>{language.name}</Txt><Badge tone="blue">{language.level}</Badge></View>) : <Txt style={styles.muted}>Nenhum idioma informado.</Txt>}
          </Card>
          <Card title="Especializações e serviços" icon={BriefcaseBusiness}><Txt style={styles.label}>Áreas de atuação</Txt><Tags values={data.specializations} />
            <Txt style={styles.label}>Serviços oferecidos</Txt><Tags values={data.services} /></Card>
          <Card title="Formação e trajetória" icon={GraduationCap}><TextDetail label="Formação" value={data.education} /><TextDetail label="Experiência profissional" value={data.experienceSummary} /><TextDetail label="Certificações e cursos complementares" value={data.certifications} /></Card>
          <Card title="Ferramentas e recursos" icon={Wrench}><Tags values={data.tools} />{!!data.otherInformation && <TextDetail label="Outras informações" value={data.otherInformation} />}</Card>
          <Card title="Portfólio e links profissionais" icon={ExternalLink}>
            {data.portfolioLinks.length ? data.portfolioLinks.map((value, index) => {
              const url = profileLink(value);
              return url ? <Pressable key={value} accessibilityRole="link" accessibilityLabel={`Abrir portfólio ${index + 1}: ${url.hostname}`} onPress={() => void openLink(url.href)} style={({ hovered, pressed }) => [styles.link, hovered && styles.linkHover, pressed && { opacity: 0.75 }]}>
                <View style={{ flex: 1, minWidth: 0 }}><Txt style={styles.linkText}>{url.hostname}</Txt><Txt numberOfLines={1} style={styles.muted}>{value}</Txt></View><ArrowUpRight size={18} color={colors.accent} />
              </Pressable> : null;
            }) : <Txt style={styles.muted}>Nenhum trabalho ou link profissional adicionado.</Txt>}
          </Card>
        </View>
        <View style={[styles.aside, compact && styles.asideSmall]}>
          <Card title="Contato" icon={Mail}>
            <TextDetail label="E-mail da conta" value={account.email} /><TextDetail label="Telefone" value={data.phone} />
            {data.whatsapp && !!data.phone && <Badge tone="green">Este número tem WhatsApp</Badge>}
            {!session?.demo && <View style={styles.row}><Button variant="secondary" icon={Mail} onPress={() => void openLink(`mailto:${encodeURIComponent(account.email)}`)}>E-mail</Button>
              {!!data.phone && <Button variant="secondary" icon={Phone} onPress={() => void openLink(`tel:${data.phone.replace(/[^+\d]/g, '')}`)}>Ligar</Button>}</View>}
          </Card>
          <Card title="Disponibilidade" icon={Clock3}>
            <TextDetail label="Disponibilidade semanal" value={data.availabilityHours === null ? undefined : `${data.availabilityHours} horas por semana`} />
            <TextDetail label="Fuso horário" value={data.timezone} /><TextDetail label="Horários e observações" value={data.availabilityNotes} />
          </Card>
          {activity && <Card title="Atividade no EchoRing" icon={BriefcaseBusiness}><View style={styles.metricGrid}>
            {[[activity.totalProjects, 'Projetos atribuídos'], [activity.activeProjects, 'Em andamento'], [activity.awaitingReview, 'Em avaliação'], [activity.completedProjects, 'Finalizados']].map(([value, label]) => <View key={label} style={styles.metric}><Txt style={styles.metricValue}>{value}</Txt><Txt style={styles.muted}>{label}</Txt></View>)}
          </View>{own && <Button variant="secondary" onPress={() => router.push('/operacao')}>Ver meus projetos</Button>}</Card>}
          {own && !session?.demo && <Card title="Informações do perfil" icon={UserRound}>
            <Txt style={styles.muted}>{completeness.filled} de {completeness.total} informações preenchidas</Txt>
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: completeness.percent }} style={styles.progressTrack}><View style={[styles.progress, { width: `${completeness.percent}%` }]} /></View>
            <Txt style={styles.muted}>Uma apresentação, serviços e exemplos de trabalho ajudam a equipe a conhecer melhor sua atuação. Os campos complementares são opcionais.</Txt>
            <Button variant="secondary" onPress={() => router.push('/perfil/editar')}>Atualizar informações</Button>
          </Card>}
        </View>
      </View>
    </View>
  </ScrollView>;
}
