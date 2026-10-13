import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Headphones,
  LockKeyhole,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { languageOptions } from '@/components/ui/fields/constants';
import { DateSelectField } from '@/components/ui/fields/date-select-field';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { Txt } from '@/components/ui/text';
import { QuoteField } from '@/features/landing/components/quote-field';
import { initialIntake, landingServices } from '@/features/landing/constants';
import type { QuoteForm } from '@/features/landing/hooks/use-quote-form';
import { useStyles } from '@/features/landing/styles/landing.styles';
import type { LandingSectionProps } from '@/features/landing/types';
import { apiMode } from '@/features/requests/constants/request-mode';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function QuoteSection({
  layout,
  onLayout,
  form,
}: LandingSectionProps & { form: QuoteForm }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const { width, mobile, narrow, wide } = layout;
  const {
    step,
    setStep,
    data,
    setData,
    error,
    setError,
    invalid,
    busy,
    uploading,
    receipt,
    setReceipt,
    setPrivacy,
    change,
    attach,
    advance,
    submit,
  } = form;
  function field(
    key: 'name' | 'email' | 'company' | 'title' | 'message',
    label: string,
    placeholder: string,
    multiline = false,
  ) {
    return (
      <QuoteField
        form={form}
        width={width}
        fieldKey={key}
        label={label}
        placeholder={placeholder}
        multiline={multiline}
      />
    );
  }
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.quoteSection,
        !wide && { flexDirection: 'column' },
        mobile && styles.quoteSectionMobile,
      ]}
    >
      <View style={styles.quoteIntro}>
        <View style={styles.quoteAccent} />
        <Txt style={styles.quoteTagText}>SOLICITE SEU ORÇAMENTO</Txt>
        <Txt
          accessibilityRole="header"
          style={[
            styles.quoteTitle,
            mobile && styles.sectionTitleSmall,
            narrow && styles.sectionTitleNarrow,
          ]}
        >
          Vamos traduzir{`\n`}
          <Txt
            style={[
              styles.quoteTitle,
              mobile && styles.sectionTitleSmall,
              narrow && styles.sectionTitleNarrow,
              { color: colors.accent },
            ]}
          >
            suas ideias?
          </Txt>
        </Txt>
        <Txt style={styles.quoteDescription}>
          Preencha as informações e receba um orçamento rápido e sem compromisso.
        </Txt>
        <View style={styles.quoteBenefits}>
          {[
            { icon: Zap, title: 'Resposta rápida', text: 'Receba seu orçamento em pouco tempo.' },
            {
              icon: ShieldCheck,
              title: 'Seus dados seguros',
              text: 'Total confidencialidade das suas informações.',
            },
            {
              icon: Headphones,
              title: 'Atendimento humano',
              text: 'Fale com nossa equipe sempre que precisar.',
            },
          ].map((item) => (
            <View key={item.title} style={styles.quoteBenefit}>
              <View style={styles.benefitIcon}>
                <item.icon size={25} color={colors.accent} />
              </View>
              <Txt style={styles.benefitTitle}>{item.title}</Txt>
              <Txt style={styles.benefitText}>{item.text}</Txt>
            </View>
          ))}
        </View>
      </View>
      <View
        testID="landing-quote-form"
        style={[
          styles.form,
          !wide && { width: '100%', maxWidth: 680 },
          mobile && { padding: 22, borderRadius: 18 },
        ]}
      >
        {receipt ? (
          <View style={styles.receipt}>
            <CheckCircle2 size={46} color={colors.accent} strokeWidth={1.5} />
            <Txt accessibilityRole="header" style={styles.receiptTitle}>
              {receipt.demo ? 'Pedido salvo na prévia.' : 'Recebido. Agora é com a gente.'}
            </Txt>
            <Txt style={styles.serviceText}>
              {receipt.demo
                ? 'Este pedido está salvo neste navegador para testar o fluxo no portal. Ele não foi enviado à empresa e nenhum e-mail será enviado.'
                : `Nossa equipe vai analisar seu projeto e responder com o orçamento para ${receipt.email}.`}
            </Txt>
            <View style={styles.receiptCode}>
              <Txt style={common.caption}>SEU PROTOCOLO</Txt>
              <Txt selectable style={{ fontWeight: '600', fontSize: 18 }}>
                {receipt.id}
              </Txt>
            </View>
            <Button
              variant="secondary"
              onPress={() => {
                setReceipt(null);
                setData({ ...initialIntake });
                setStep(0);
              }}
            >
              Fazer outra solicitação
            </Button>
            {receipt.demo && (
              <Button variant="ghost" onPress={() => router.push('/solicitacoes')}>
                Ver no portal da equipe
              </Button>
            )}
          </View>
        ) : (
          <>
            <View style={styles.formStepper}>
              {['Projeto', 'Documentos', 'Contato'].map((title, index) => (
                <Pressable
                  key={title}
                  accessibilityRole="button"
                  accessibilityLabel={`Etapa ${index + 1}: ${title}`}
                  aria-current={step === index ? 'step' : undefined}
                  disabled={index > step || busy}
                  onPress={() => {
                    setStep(index);
                    setError('');
                  }}
                  style={[styles.formStep, mobile && { flexDirection: 'column', gap: 6 }]}
                >
                  <View
                    style={[
                      styles.formStepNumber,
                      step === index && styles.formStepCurrent,
                      index < step && styles.formStepDone,
                    ]}
                  >
                    {index < step ? (
                      <Check size={14} color={colors.accent} />
                    ) : (
                      <Txt
                        style={{
                          fontSize: 12,
                          color: step === index ? colors.onAccent : colors.muted,
                          fontWeight: '600',
                        }}
                      >
                        {index + 1}
                      </Txt>
                    )}
                  </View>
                  <Txt style={[styles.formStepLabel, step === index && { color: colors.ink }]}>
                    {title}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <View style={styles.formStageHeader}>
              <Txt
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
                style={styles.formTitle}
              >
                {
                  [
                    'Vamos conhecer seu projeto.',
                    'O material faz a diferença.',
                    'Para onde vai a proposta?',
                  ][step]
                }
              </Txt>
              <Txt style={common.caption}>
                {
                  [
                    'Escolha o serviço e os idiomas. Campos com * são obrigatórios.',
                    'Anexe o conteúdo para uma análise mais precisa. Esta etapa é opcional.',
                    'Só precisamos de um contato para responder ao seu pedido.',
                  ][step]
                }
              </Txt>
            </View>
            <View key={step} testID="quote-stage" style={styles.formStage}>
              {step === 0 && (
                <>
                  <View style={styles.serviceChoices}>
                    {[...landingServices, { icon: Sparkles, title: 'Outro', text: '' }].map(
                      (service) => (
                        <Pressable
                          key={service.title}
                          accessibilityRole="radio"
                          accessibilityLabel={service.title}
                          accessibilityState={{ checked: data.service === service.title }}
                          aria-checked={data.service === service.title}
                          onPress={() => change('service', service.title)}
                          style={({ hovered }) => [
                            styles.choice,
                            mobile && { flexBasis: '44%' },
                            data.service === service.title && styles.choiceActive,
                            hovered && { borderColor: colors.accent },
                          ]}
                        >
                          <service.icon
                            size={17}
                            color={data.service === service.title ? colors.accent : colors.muted}
                            strokeWidth={1.7}
                          />
                          <Txt
                            style={[
                              styles.choiceText,
                              data.service === service.title && { color: colors.accent },
                            ]}
                          >
                            {service.title}
                          </Txt>
                        </Pressable>
                      ),
                    )}
                  </View>
                  <View style={[styles.formRow, width < 600 && { flexDirection: 'column' }]}>
                    {field('title', 'Nome do projeto *', 'Ex.: Manual de um equipamento')}
                    <DateSelectField
                      compact={width < 600}
                      label="Prazo desejado"
                      value={data.deadline}
                      onChange={(value) => change('deadline', value)}
                      disabled={busy}
                      invalid={invalid.includes('deadline')}
                    />
                  </View>
                  <View style={[styles.formRow, width < 600 && { flexDirection: 'column' }]}>
                    <OptionSelectField
                      compact={width < 600}
                      label="Idioma de origem *"
                      value={data.source}
                      onChange={(value) => change('source', value)}
                      options={languageOptions}
                      dialogTitle="Idioma de origem"
                      description="Selecione o idioma atual do material."
                      disabled={busy}
                      invalid={invalid.includes('source')}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Inverter idiomas"
                      onPress={() =>
                        setData((current) => ({
                          ...current,
                          source: current.target,
                          target: current.source,
                        }))
                      }
                      style={[
                        styles.swapLanguages,
                        width < 600 && { alignSelf: 'center', marginTop: -12, marginBottom: 8 },
                      ]}
                    >
                      <ArrowLeftRight size={17} color={colors.accent} />
                    </Pressable>
                    <OptionSelectField
                      compact={width < 600}
                      label="Idioma de destino *"
                      value={data.target}
                      onChange={(value) => change('target', value)}
                      options={languageOptions}
                      dialogTitle="Idioma de destino"
                      description="Selecione o idioma em que o conteúdo será entregue."
                      disabled={busy}
                      invalid={invalid.includes('target')}
                    />
                  </View>
                  {field(
                    'message',
                    'Sobre o projeto *',
                    'Que conteúdo você quer traduzir? Conte o objetivo e o volume aproximado.',
                    true,
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Anexar documentos"
                    disabled={uploading}
                    onPress={attach}
                    style={({ hovered }) => [
                      styles.upload,
                      hovered && { borderColor: colors.accent, backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <View style={styles.uploadIcon}>
                      <Upload size={27} color={colors.accent} strokeWidth={1.5} />
                    </View>
                    <Txt style={styles.uploadTitle}>
                      {uploading
                        ? 'Lendo documentos…'
                        : data.attachments.length
                          ? 'Trocar os documentos do projeto'
                          : 'Seu documento começa a viagem aqui.'}
                    </Txt>
                    <Txt style={[common.caption, { textAlign: 'center', maxWidth: 350 }]}>
                      Selecione PDF, DOCX ou TXT. Até 3 arquivos de 2 MB, com 5 MB no total.
                    </Txt>
                    <View style={styles.uploadPicker}>
                      <Plus size={15} color={colors.ink} />
                      <Txt style={{ fontSize: 13, fontWeight: '600' }}>
                        {data.attachments.length ? 'Substituir arquivos' : 'Escolher arquivos'}
                      </Txt>
                    </View>
                  </Pressable>
                  {data.attachments.map((file) => (
                    <View key={file.name} style={styles.fileRow}>
                      <View style={styles.fileIcon}>
                        <FileText size={20} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>
                          {file.name}
                        </Txt>
                        <Txt style={common.caption}>
                          {Math.ceil(file.size / 1024)} KB · Pronto para análise
                        </Txt>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${file.name}`}
                        onPress={() =>
                          setData((current) => ({
                            ...current,
                            attachments: current.attachments.filter((item) => item !== file),
                          }))
                        }
                        style={{ padding: 12 }}
                      >
                        <X size={16} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.documentNote}>
                    <LockKeyhole size={17} color={colors.muted} />
                    <Txt style={[common.caption, { flex: 1 }]}>
                      Você também pode seguir sem anexos. Descreva o volume do material no projeto
                      para ajudar na análise.
                    </Txt>
                  </View>
                </>
              )}
              {step === 2 && (
                <>
                  <View style={styles.projectSummary}>
                    <View style={styles.fileIcon}>
                      <FileText size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Txt numberOfLines={1} style={{ fontSize: 17, fontWeight: '600' }}>
                        {data.title}
                      </Txt>
                      <Txt style={common.caption}>
                        {data.source} → {data.target} · {data.attachments.length}{' '}
                        {data.attachments.length === 1 ? 'documento' : 'documentos'}
                      </Txt>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Editar projeto"
                      onPress={() => setStep(0)}
                      style={{ padding: 8 }}
                    >
                      <Txt style={{ fontSize: 13, color: colors.accent }}>Editar</Txt>
                    </Pressable>
                  </View>
                  <View style={[styles.formRow, width < 600 && { flexDirection: 'column' }]}>
                    {field('name', 'Seu nome *', 'Como podemos chamar você?')}
                    {field('email', 'E-mail *', 'voce@empresa.com')}
                  </View>
                  {field('company', 'Empresa', 'Nome da empresa, se houver')}
                  <View style={styles.consentRow}>
                    <Pressable
                      disabled={busy}
                      accessibilityRole="checkbox"
                      accessibilityLabel="Autorizar contato para orçamento"
                      aria-checked={data.consent}
                      accessibilityState={{ checked: data.consent }}
                      onPress={() => change('consent', !data.consent)}
                      style={[
                        styles.consentCheck,
                        data.consent && {
                          backgroundColor: colors.accent,
                          borderColor: colors.accent,
                        },
                      ]}
                    >
                      {data.consent && <Check size={15} color={colors.onAccent} strokeWidth={3} />}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Txt style={common.caption}>
                        Autorizo o uso dos dados e documentos para analisar a solicitação e entrar
                        em contato sobre o orçamento.
                      </Txt>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setPrivacy(true)}
                        style={{ paddingVertical: 8 }}
                      >
                        <Txt style={{ fontSize: 13, color: colors.accent }}>
                          Como seus dados são usados
                        </Txt>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>
            {!!error && (
              <Txt accessibilityRole="alert" style={styles.error}>
                {error}
              </Txt>
            )}
            <View
              style={[
                styles.formActions,
                width < 360 && { flexDirection: 'column-reverse', alignItems: 'stretch' },
              ]}
            >
              {step > 0 ? (
                <Button
                  variant="ghost"
                  icon={ArrowLeft}
                  disabled={busy || uploading}
                  onPress={() => {
                    setStep((current) => current - 1);
                    setError('');
                  }}
                >
                  Voltar
                </Button>
              ) : (
                <Txt style={common.caption}>Sem compromisso.</Txt>
              )}
              {step < 2 ? (
                <Button icon={ArrowRight} disabled={uploading} onPress={advance}>
                  Continuar
                </Button>
              ) : (
                <Button icon={Send} onPress={submit} loading={busy}>
                  {apiMode ? 'Enviar solicitação' : 'Testar solicitação'}
                </Button>
              )}
            </View>
            {!apiMode && (
              <View style={styles.previewNote}>
                <View style={styles.dot} />
                <Txt style={[common.caption, { flex: 1 }]}>
                  Prévia local · use dados fictícios. O pedido fica neste navegador, sem envio à
                  empresa.
                </Txt>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
