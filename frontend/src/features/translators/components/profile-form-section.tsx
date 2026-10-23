import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { ProfileField } from '@/features/translators/components/profile-field';
import { ProfileLanguages } from '@/features/translators/components/profile-languages';
import { ProfileTagsField } from '@/features/translators/components/profile-tags-field';
import { serviceOptions, specializationOptions } from '@/features/translators/constants';
import { useStyles } from '@/features/translators/styles/onboarding.styles';
import { type ProfileErrors, type TranslatorProfile } from '@/features/translators/types';
import { useTheme } from '@/theme/theme-context';

export function ProfileFormSection({ data, email, step, disabled = false, errors, change, review = false }: {
  data: TranslatorProfile; email: string; step: number; disabled?: boolean; errors: ProfileErrors; review?: boolean;
  change: <Key extends keyof TranslatorProfile>(key: Key, value: TranslatorProfile[Key]) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const busy = disabled;
  const textField = (key: 'fullName' | 'phone' | 'country' | 'city' | 'timezone' | 'professionalTitle' | 'bio' | 'education' | 'experienceSummary' | 'certifications' | 'availabilityNotes' | 'otherInformation', label: string, placeholder: string, multiline = false, hint?: string) => <ProfileField
    key={key} label={label} value={data[key]} onChange={value => change(key, value)} placeholder={placeholder}
    multiline={multiline} hint={hint} error={errors[key]} disabled={busy}
    keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
    maxLength={['bio', 'experienceSummary'].includes(key) ? 4000 : ['education', 'certifications', 'otherInformation'].includes(key) ? 3000 : key === 'availabilityNotes' ? 1000 : key === 'phone' ? 40 : ['country', 'city'].includes(key) ? 100 : key === 'timezone' ? 80 : 160}
  />;
  return (<>
                {step === 0 && <View style={styles.section}>
                  {textField('fullName', 'Nome completo *', 'Como a equipe deve chamar você?')}
                  <ProfileField label="E-mail da conta" value={email ?? ''} readOnly hint="Este é o e-mail informado pelo administrador." />
                  {textField('phone', 'Telefone *', '+55 (11) 99999-9999')}
                  <Pressable accessibilityRole="checkbox" accessibilityLabel="Este telefone também tem WhatsApp" aria-checked={data.whatsapp}
                    accessibilityState={{ checked: data.whatsapp, disabled: busy }} disabled={busy} onPress={() => change('whatsapp', !data.whatsapp)} style={styles.checkRow}>
                    <View style={[styles.checkbox, data.whatsapp && styles.checked]}>{data.whatsapp && <Check size={15} color={colors.onAccent} strokeWidth={3} />}</View>
                    <Txt style={{ fontSize: 13, flex: 1 }}>Este telefone também tem WhatsApp</Txt>
                  </Pressable>
                  {textField('country', 'País *', 'País onde você mora')}
                  {textField('city', 'Cidade *', 'Sua cidade')}
                  {textField('timezone', 'Fuso horário (opcional)', 'Seu fuso ou horário local')}
                </View>}
                {step === 1 && <ProfileLanguages data={data} change={change} disabled={busy} errors={errors} />}
                {step === 2 && <View style={styles.section}>
                  {textField('education', 'Formação *', 'Cursos, instituições, formação acadêmica ou autodidata...', true, 'Inclua o que contribuiu para sua atuação como tradutor.')}
                  <ProfileField label="Anos de experiência *" value={data.experienceYears === null ? '' : String(data.experienceYears)} placeholder="Ex.: 0, 3, 10" keyboardType="numeric" maxLength={2}
                    disabled={busy} error={errors.experienceYears} hint="Se está começando, informe 0."
                    onChange={value => { if (/^\d{0,2}$/.test(value)) change('experienceYears', value ? Number(value) : null); }} />
                  {textField('experienceSummary', 'Experiência e trajetória *', 'Conte sobre os projetos, trabalhos ou estudos que marcaram sua trajetória...', true, 'Você também pode contar sobre estágios, projetos de estudo ou início de carreira.')}
                  <ProfileTagsField label="Especializações *" values={data.specializations} options={specializationOptions} placeholder="Outra área de atuação" disabled={busy} error={errors.specializations} onChange={values => change('specializations', values)} />
                </View>}
                {step === 3 && <View style={styles.section}>
                  {textField('professionalTitle', 'Título profissional (opcional)', 'Como você descreve seu trabalho?')}
                  {textField('bio', 'Sobre você (opcional)', 'Sua apresentação, seus interesses e diferenciais...', true)}
                  <ProfileTagsField label="Serviços" values={data.services} options={serviceOptions} placeholder="Outro serviço" disabled={busy} onChange={values => change('services', values)} />
                  <ProfileTagsField label="Ferramentas" values={data.tools} placeholder="Ferramentas de tradução, revisão ou edição" disabled={busy} limit={30} onChange={values => change('tools', values)} />
                  {textField('certifications', 'Certificações e cursos complementares (opcional)', 'Certificações, instituições e ano de conclusão...', true)}
                  <ProfileTagsField label="Portfólio" values={data.portfolioLinks} placeholder="https://..." disabled={busy} limit={10} links onChange={values => change('portfolioLinks', values)} />
                  <ProfileField label="Disponibilidade semanal (opcional)" value={data.availabilityHours === null ? '' : String(data.availabilityHours)} placeholder="Horas por semana, de 0 a 80" keyboardType="numeric" maxLength={2} disabled={busy} error={errors.availabilityHours}
                    onChange={value => { if (/^\d{0,2}$/.test(value)) change('availabilityHours', value ? Number(value) : null); }} />
                  {textField('availabilityNotes', 'Sobre sua disponibilidade (opcional)', 'Horários preferidos, formatos de trabalho ou observações...', true)}
                  {textField('otherInformation', 'Outras informações (opcional)', 'Projetos relevantes ou algo mais que gostaria de compartilhar...', true)}
                  {review && <View style={styles.review}>
                    <Txt style={styles.sectionLabel}>Confira seu cadastro</Txt>
                    <Txt style={styles.summary}>{data.fullName}{`\n`}{email}{`\n`}{data.phone} · {data.city}, {data.country}</Txt>
                    <Txt style={styles.summary}>{data.languages.map(language => `${language.name} (${language.level})`).join(' · ')}</Txt>
                    <Txt style={styles.summary}>{data.experienceYears} anos de experiência · {data.specializations.join(', ')}</Txt>
                    <Txt style={styles.summary}>Formação: {data.education}</Txt>
                    <Txt style={styles.summary}>Trajetória: {data.experienceSummary}</Txt>
                  </View>}
                </View>}
  </>);
}
