import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowLeftRight, ArrowUpRight, Check, CheckCircle2, FileText, Globe2, LockKeyhole, Orbit, Plus, Scale, Sparkles, Send, Upload, X } from 'lucide-react-native';
import { Button, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { useSession } from '@/features/auth/session';
import { HeroWorld } from './hero-world';
import { colors, font } from '@/constants/design';
import { apiMode, selectDocuments, submitIntake, type Intake, type TranslationRequest } from '@/features/requests/service';

const services = [
  { icon: FileText, title: 'Tradução técnica', text: 'Manuais, relatórios e documentos que precisam falar a linguagem do seu setor.' },
  { icon: Scale, title: 'Documentos jurídicos', text: 'Contratos e documentos legais, com atenção ao contexto e à terminologia.' },
  { icon: Globe2, title: 'Conteúdo empresarial', text: 'Apresentações, sites e materiais que levam a sua mensagem a novos públicos.' },
];
const blank: Intake = { name: '', email: '', company: '', title: '', service: 'Tradução técnica', source: 'Português', target: 'Inglês', deadline: '', message: '', consent: false, attachments: [] };
export function LandingScreen() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const wide = width >= 1000;
  const heroType = {
    fontSize: width < 360 ? 36 : mobile ? 44 : wide && width < 1200 ? 58 : wide ? 80 : 68,
    lineHeight: width < 360 ? 42 : mobile ? 50 : wide && width < 1200 ? 65 : wide ? 87 : 75,
    letterSpacing: width < 360 ? -1.3 : mobile ? -1.5 : -3.4,
  };
  const [step, setStep] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const sections = useRef<Record<string, number>>({});
  const inputs = useRef<Record<string, TextInput | null>>({});
  const [data, setData] = useState<Intake>({ ...blank });
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<TranslationRequest | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const [faq, setFaq] = useState<number | null>(null);
  function go(section: string) {
    const reduced = Platform.OS === 'web' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroll.current?.scrollTo({ y: sections.current[section] ?? 0, animated: !reduced });
  }
  function change(key: keyof Intake, value: string | boolean) { setData(current => ({ ...current, [key]: value })); setInvalid(current => current.filter(item => item !== key)); setError(''); }
  async function attach() {
    setError(''); setUploading(true);
    try { const files = await selectDocuments(); if (files.length) setData(current => ({ ...current, attachments: files })); }
    catch (failure) { setError((failure as Error).message); }
    finally { setUploading(false); }
  }
  function advance() {
    if (step === 0) {
      const missing = (['title', 'source', 'target', 'message'] as const).filter(key => !data[key].trim());
      if (missing.length) { setInvalid([...missing]); setError('Preencha os campos obrigatórios para continuar.'); inputs.current[missing[0]]?.focus(); return; }
      if (data.source.trim().toLowerCase() === data.target.trim().toLowerCase()) { setInvalid(['target']); setError('Escolha um idioma de destino diferente do idioma de origem.'); inputs.current.target?.focus(); return; }
    }
    setInvalid([]); setError(''); setStep(current => Math.min(current + 1, 2)); go('quote');
  }
  async function submit() {
    if (busy) return;
    const missing = (['name', 'email', 'title', 'source', 'target', 'message'] as const).filter(key => !data[key].trim());
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) && !missing.includes('email')) missing.push('email');
    if (missing.length || !data.consent) {
      setInvalid(missing); setError('Preencha os campos obrigatórios, confira seu e-mail e autorize o contato para receber o orçamento.');
      inputs.current[missing[0]]?.focus(); return;
    }
    if (data.source.trim().toLowerCase() === data.target.trim().toLowerCase()) { setInvalid(['target']); setError('Escolha um idioma de destino diferente do idioma de origem.'); inputs.current.target?.focus(); return; }
    setBusy(true); setError('');
    try {
      const result = await submitIntake({ ...data, name: data.name.trim(), email: data.email.trim(), title: data.title.trim(), source: data.source.trim(), target: data.target.trim(), message: data.message.trim() });
      setReceipt(result); go('quote');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function field(key: 'name' | 'email' | 'company' | 'title' | 'source' | 'target' | 'deadline' | 'message', label: string, placeholder: string, multiline = false) {
    return <View testID="landing-field" style={[s.field, width < 600 && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><Txt style={s.label}>{label}</Txt><TextInput ref={element => { inputs.current[key] = element; }} accessibilityLabel={label} aria-invalid={invalid.includes(key)}
      editable={!busy} value={data[key]} onChangeText={value => change(key, value)} placeholder={placeholder} placeholderTextColor={colors.muted}
      style={[s.input, multiline && s.textarea, invalid.includes(key) && { borderColor: colors.red }]} multiline={multiline}
      autoCapitalize={key === 'email' ? 'none' : 'sentences'} keyboardType={key === 'email' ? 'email-address' : 'default'} autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'} maxLength={multiline ? 3000 : 160} /></View>;
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: mobile ? 20 : 48 }}>
      <View style={s.container}>
        <View style={[s.header, mobile && { height: 88 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Aliança Traduções, início" onPress={() => go('top')} style={s.companyBrand}><Orbit size={32} color={colors.accent} strokeWidth={1.6} /><View><Txt style={[s.companyName, width < 360 && { fontSize: 27, lineHeight: 30 }]}>aliança<Txt style={{ color: colors.accent }}>.</Txt></Txt><Txt style={s.companyCaption}>TRADUÇÕES</Txt></View></Pressable>
          <View style={s.headerLinks}>{!mobile && <><Pressable accessibilityRole="button" onPress={() => go('services')}><Txt style={s.navLink}>Soluções</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => go('process')}><Txt style={s.navLink}>Como funciona</Txt></Pressable></>}
            <Pressable accessibilityRole="button" onPress={() => router.push(session ? '/dashboard' : '/login')} style={[s.portal, width < 360 && { paddingHorizontal: 12, gap: 6 }]}><Txt style={[s.portalText, width < 360 && { fontSize: 12 }]}>{mobile ? 'Área da equipe' : 'Entrar no portal'}</Txt><ArrowUpRight size={16} color={colors.ink} /></Pressable>
          </View>
        </View>
        <View onLayout={event => { sections.current.top = event.nativeEvent.layout.y; }} style={[s.hero, !wide && { flexDirection: 'column', paddingTop: mobile ? 35 : 55, gap: 20 }]}>
          <View style={s.heroCopy}>
            <View style={s.heroTag}><View style={s.dot} /><Txt style={s.heroTagText}>PALAVRAS QUE CONECTAM</Txt></View>
            <Txt accessibilityRole="header" style={[s.heroTitle, heroType]}>
              Sua mensagem.{'\n'}Sem <Txt style={[s.heroTitle, { color: colors.accent }, heroType]}>fronteiras.</Txt>
            </Txt>
            <Txt style={s.heroDescription}>Traduções que preservam o sentido, respeitam o contexto e aproximam você do mundo.</Txt>
            <View style={s.heroActions}><Button icon={ArrowUpRight} onPress={() => go('quote')}>Solicitar orçamento</Button><Pressable accessibilityRole="button" onPress={() => go('services')} style={s.discover}><Txt style={{ color: colors.muted, fontSize: 15 }}>Conheça nossas soluções</Txt><ArrowDown size={17} color={colors.muted} /></Pressable></View>
            <View style={s.heroNote}><LockKeyhole size={14} color={colors.muted} /><Txt style={common.caption}>Seu documento, tratado com atenção em cada etapa.</Txt></View>
          </View>
          <View style={[s.heroVisual, !wide && { width: '100%', maxWidth: 460, alignSelf: 'center' }]}><HeroWorld /></View>
        </View>
        <View style={s.languageStrip}>{['Português', 'English', 'Español', 'Français', 'Deutsch', 'Italiano'].map((language, index) => <View key={language} style={common.row}><Txt style={s.stripText}>{language}</Txt>{index < 5 && <Txt style={{ color: colors.accent }}>✳</Txt>}</View>)}</View>
        <View testID="landing-services" onLayout={event => { sections.current.services = event.nativeEvent.layout.y; }} style={s.section}>
          <Txt style={s.eyebrow}>O SENTIDO VEM PRIMEIRO</Txt><View style={[s.sectionHeading, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Muito além de{'\n'}trocar palavras.</Txt><Txt style={s.sectionDescription}>Cada texto tem um propósito. A tradução precisa ter o mesmo.</Txt></View>
          <View style={[s.services, mobile && { flexDirection: 'column' }]}>{services.map((service, index) => <Pressable key={service.title} accessibilityRole="button" accessibilityLabel={`Solicitar ${service.title}`} onPress={() => { change('service', service.title); setStep(0); go('quote'); }} style={({ hovered }) => [s.service, hovered && { backgroundColor: colors.elevated }, mobile && { padding: 24, flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><View style={s.serviceTop}><service.icon size={29} color={colors.accent} strokeWidth={1.5} /><Txt style={s.serviceNumber}>0{index + 1}</Txt></View><Txt style={s.serviceTitle}>{service.title}</Txt><Txt style={s.serviceText}>{service.text}</Txt><View style={s.serviceBottom}><Txt style={{ color: colors.accent, fontSize: 14 }}>Vamos conversar</Txt><ArrowUpRight size={19} color={colors.accent} /></View></Pressable>)}</View>
        </View>
        <View onLayout={event => { sections.current.process = event.nativeEvent.layout.y; }} style={s.section}>
          <Txt style={s.eyebrow}>DO PRIMEIRO OLÁ À ENTREGA</Txt><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Simples para você.{'\n'}Cuidadoso em cada detalhe.</Txt>
          <View style={[s.steps, mobile && { flexDirection: 'column', gap: 32 }]}>{[
            ['Conte o que precisa', 'Escolha os idiomas, descreva o projeto e anexe seus documentos.'],
            ['Receba uma proposta', 'Nossa equipe analisa o material e envia prazo e orçamento por e-mail.'],
            ['Dê o próximo passo', 'Após a aprovação, alinhamos o início e a entrega da tradução.'],
          ].map(([title, text], index) => <View key={title} style={[s.step, mobile && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><View style={s.stepLine}><Txt style={s.stepNumber}>0{index + 1}</Txt><View style={s.stepRule} /></View><Txt style={s.stepTitle}>{title}</Txt><Txt style={s.stepText}>{text}</Txt></View>)}</View>
        </View>
        <View onLayout={event => { sections.current.quote = event.nativeEvent.layout.y; }} style={s.quoteSection}>
          <View style={s.quoteIntro}><View style={s.quoteTag}><Sparkles size={14} color={colors.accent} /><Txt style={s.quoteTagText}>UMA NOVA CONEXÃO COMEÇA AQUI</Txt></View><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall, { textAlign: 'center' }]}>O próximo idioma da sua história.</Txt><Txt style={s.quoteDescription}>Conte sobre o projeto. Receba uma proposta pensada para você.</Txt></View>
          <View testID="landing-quote-form" style={[s.form, mobile && { padding: 22, borderRadius: 26 }]}>
            {receipt ? <View style={s.receipt}><CheckCircle2 size={46} color={colors.accent} strokeWidth={1.5} /><Txt accessibilityRole="header" style={s.receiptTitle}>{receipt.demo ? 'Pedido salvo na prévia.' : 'Recebido. Agora é com a gente.'}</Txt><Txt style={s.serviceText}>{receipt.demo ? 'Este pedido está salvo neste navegador para testar o fluxo no portal. Ele não foi enviado à empresa e nenhum e-mail será enviado.' : `Nossa equipe vai analisar seu projeto e responder com o orçamento para ${receipt.email}.`}</Txt><View style={s.receiptCode}><Txt style={common.caption}>SEU PROTOCOLO</Txt><Txt selectable style={{ fontWeight: '600', fontSize: 18 }}>{receipt.id}</Txt></View><Button variant="secondary" onPress={() => { setReceipt(null); setData({ ...blank }); setStep(0); }}>Fazer outra solicitação</Button>{receipt.demo && <Button variant="ghost" onPress={() => router.push('/solicitacoes')}>Ver no portal da equipe</Button>}</View> : <>
              <View style={s.formStepper}>{['Projeto', 'Documentos', 'Contato'].map((title, index) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={`Etapa ${index + 1}: ${title}`} aria-current={step === index ? 'step' : undefined} disabled={index > step || busy} onPress={() => { setStep(index); setError(''); }} style={[s.formStep, mobile && { flexDirection: 'column', gap: 6 }]}><View style={[s.formStepNumber, step === index && s.formStepCurrent, index < step && s.formStepDone]}>{index < step ? <Check size={14} color={colors.accent} /> : <Txt style={{ fontSize: 12, color: step === index ? colors.canvas : colors.muted, fontWeight: '600' }}>{index + 1}</Txt>}</View><Txt style={[s.formStepLabel, step === index && { color: colors.ink }]}>{title}</Txt></Pressable>)}</View>
              <View style={s.formStageHeader}><Txt accessibilityRole="header" accessibilityLiveRegion="polite" style={s.formTitle}>{['Vamos conhecer seu projeto.', 'O material faz a diferença.', 'Para onde vai a proposta?'][step]}</Txt><Txt style={common.caption}>{['Escolha o serviço e os idiomas. Campos com * são obrigatórios.', 'Anexe o conteúdo para uma análise mais precisa. Esta etapa é opcional.', 'Só precisamos de um contato para responder ao seu pedido.'][step]}</Txt></View>
              <View key={step} testID="quote-stage" style={s.formStage}>
                {step === 0 && <>
                  <View style={s.serviceChoices}>{[...services, { icon: Sparkles, title: 'Outro', text: '' }].map(service => <Pressable key={service.title} accessibilityRole="radio" accessibilityLabel={service.title} accessibilityState={{ checked: data.service === service.title }} aria-checked={data.service === service.title} onPress={() => change('service', service.title)} style={({ hovered }) => [s.choice, mobile && { flexBasis: '44%' }, data.service === service.title && s.choiceActive, hovered && { borderColor: '#895064' }]}><service.icon size={17} color={data.service === service.title ? colors.accent : colors.muted} strokeWidth={1.7} /><Txt style={[s.choiceText, data.service === service.title && { color: colors.accent }]}>{service.title}</Txt></Pressable>)}</View>
                  <View style={[s.formRow, width < 600 && { flexDirection: 'column' }]}>{field('title', 'Nome do projeto *', 'Ex.: Manual de um equipamento')}{field('deadline', 'Prazo desejado', 'Ex.: 30 de setembro')}</View>
                  <View style={[s.formRow, width < 600 && { flexDirection: 'column' }]}>{field('source', 'Idioma de origem *', 'Ex.: Português')}<Pressable accessibilityRole="button" accessibilityLabel="Inverter idiomas" onPress={() => setData(current => ({ ...current, source: current.target, target: current.source }))} style={[s.swapLanguages, width < 600 && { alignSelf: 'center', marginTop: -12, marginBottom: 8 }]}><ArrowLeftRight size={17} color={colors.accent} /></Pressable>{field('target', 'Idioma de destino *', 'Ex.: Inglês')}</View>
                  {field('message', 'Sobre o projeto *', 'Que conteúdo você quer traduzir? Conte o objetivo e o volume aproximado.', true)}
                </>}
                {step === 1 && <>
                  <Pressable accessibilityRole="button" accessibilityLabel="Anexar documentos" disabled={uploading} onPress={attach} style={({ hovered }) => [s.upload, hovered && { borderColor: colors.accent, backgroundColor: '#20141A' }]}><View style={s.uploadIcon}><Upload size={27} color={colors.accent} strokeWidth={1.5} /></View><Txt style={{ fontSize: 21, fontWeight: '600' }}>{uploading ? 'Lendo documentos…' : data.attachments.length ? 'Trocar os documentos do projeto' : 'Seu documento começa a viagem aqui.'}</Txt><Txt style={[common.caption, { textAlign: 'center', maxWidth: 350 }]}>Selecione PDF, DOCX ou TXT. Até 3 arquivos de 2 MB, com 5 MB no total.</Txt><View style={s.uploadPicker}><Plus size={15} color={colors.ink} /><Txt style={{ fontSize: 13, fontWeight: '600' }}>{data.attachments.length ? 'Substituir arquivos' : 'Escolher arquivos'}</Txt></View></Pressable>
                  {data.attachments.map(file => <View key={file.name} style={s.fileRow}><View style={s.fileIcon}><FileText size={20} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 3 }}><Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>{file.name}</Txt><Txt style={common.caption}>{Math.ceil(file.size / 1024)} KB · Pronto para análise</Txt></View><Pressable accessibilityRole="button" accessibilityLabel={`Remover ${file.name}`} onPress={() => setData(current => ({ ...current, attachments: current.attachments.filter(item => item !== file) }))} style={{ padding: 12 }}><X size={16} color={colors.muted} /></Pressable></View>)}
                  <View style={s.documentNote}><LockKeyhole size={17} color={colors.muted} /><Txt style={[common.caption, { flex: 1 }]}>Você também pode seguir sem anexos. Descreva o volume do material no projeto para ajudar na análise.</Txt></View>
                </>}
                {step === 2 && <>
                  <View style={s.projectSummary}><View style={s.fileIcon}><FileText size={22} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><Txt numberOfLines={1} style={{ fontSize: 17, fontWeight: '600' }}>{data.title}</Txt><Txt style={common.caption}>{data.source} → {data.target} · {data.attachments.length} {data.attachments.length === 1 ? 'documento' : 'documentos'}</Txt></View><Pressable accessibilityRole="button" accessibilityLabel="Editar projeto" onPress={() => setStep(0)} style={{ padding: 8 }}><Txt style={{ fontSize: 13, color: colors.accent }}>Editar</Txt></Pressable></View>
                  <View style={[s.formRow, width < 600 && { flexDirection: 'column' }]}>{field('name', 'Seu nome *', 'Como podemos chamar você?')}{field('email', 'E-mail *', 'voce@empresa.com')}</View>
                  {field('company', 'Empresa', 'Nome da empresa, se houver')}
                  <View style={s.consentRow}><Pressable disabled={busy} accessibilityRole="checkbox" accessibilityLabel="Autorizar contato para orçamento" aria-checked={data.consent} accessibilityState={{ checked: data.consent }} onPress={() => change('consent', !data.consent)} style={[s.consentCheck, data.consent && { backgroundColor: colors.accent, borderColor: colors.accent }]}>{data.consent && <Check size={15} color={colors.canvas} strokeWidth={3} />}</Pressable><View style={{ flex: 1 }}><Txt style={common.caption}>Autorizo o uso dos dados e documentos para analisar a solicitação e entrar em contato sobre o orçamento.</Txt><Pressable accessibilityRole="button" onPress={() => setPrivacy(true)} style={{ paddingVertical: 8 }}><Txt style={{ fontSize: 13, color: colors.accent }}>Como seus dados são usados</Txt></Pressable></View></View>
                </>}
              </View>
              {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
              <View style={[s.formActions, width < 360 && { flexDirection: 'column-reverse', alignItems: 'stretch' }]}>{step > 0 ? <Button variant="ghost" icon={ArrowLeft} disabled={busy || uploading} onPress={() => { setStep(current => current - 1); setError(''); }}>Voltar</Button> : <Txt style={common.caption}>Sem compromisso.</Txt>}{step < 2 ? <Button icon={ArrowRight} disabled={uploading} onPress={advance}>Continuar</Button> : <Button icon={Send} onPress={submit} loading={busy}>{apiMode ? 'Enviar solicitação' : 'Testar solicitação'}</Button>}</View>
              {!apiMode && <View style={s.previewNote}><View style={s.dot} /><Txt style={[common.caption, { flex: 1 }]}>Prévia local · use dados fictícios. O pedido fica neste navegador, sem envio à empresa.</Txt></View>}
            </>}
          </View>
          <View style={s.quoteAssurances}><View style={common.row}><LockKeyhole size={14} color={colors.muted} /><Txt style={common.caption}>Documentos para análise</Txt></View><View style={common.row}><Send size={14} color={colors.muted} /><Txt style={common.caption}>Proposta por e-mail</Txt></View><View style={common.row}><Check size={14} color={colors.muted} /><Txt style={common.caption}>Você decide o próximo passo</Txt></View></View>
        </View>
        <View testID="landing-faq" style={s.faqSection}><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Antes do primeiro olá.</Txt>{[
          ['Como é calculado o orçamento?', 'A proposta considera os idiomas, o tipo de conteúdo, o volume e o prazo. Nossa equipe analisa a solicitação antes de informar o valor.'],
          ['Preciso anexar o documento agora?', 'Você pode começar descrevendo o projeto. Para um orçamento mais preciso, anexe o material ou informe o número de páginas e palavras.'],
          ['E se meu idioma não estiver na página?', 'Informe o idioma de origem e de destino no formulário. A equipe verifica a disponibilidade e retorna por e-mail.'],
        ].map(([question, answer], index) => <View key={question} style={s.faq}><Pressable accessibilityRole="button" accessibilityState={{ expanded: faq === index }} aria-expanded={faq === index} onPress={() => setFaq(faq === index ? null : index)} style={s.faqQuestion}><Txt style={s.faqTitle}>{question}</Txt>{faq === index ? <X size={19} color={colors.accent} /> : <Plus size={19} color={colors.accent} />}</Pressable>{faq === index && <Txt style={s.faqAnswer}>{answer}</Txt>}</View>)}</View>
        <View style={[s.footer, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}><View><Txt style={s.companyName}>aliança<Txt style={{ color: colors.accent }}>.</Txt></Txt><Txt style={common.caption}>Conectando sentidos. Aproximando mundos.</Txt></View><View style={{ gap: 12, alignItems: mobile ? 'flex-start' : 'flex-end' }}><Pressable accessibilityRole="button" onPress={() => go('quote')} style={common.row}><Txt style={{ fontSize: 14 }}>Vamos traduzir sua próxima ideia?</Txt><ArrowUpRight size={17} color={colors.accent} /></Pressable><Txt style={{ fontSize: 12, color: colors.muted }}>© {new Date().getFullYear()} Aliança Traduções · Echo Ring</Txt></View></View>
      </View>
    </ScrollView>
    <Dialog open={privacy} onClose={() => setPrivacy(false)} title="Seus dados, com propósito"><Txt>Nome, e-mail, informações do projeto e documentos são usados para avaliar o pedido e responder sobre o orçamento.</Txt><Txt style={common.caption}>{apiMode ? 'A solicitação é armazenada no servidor e consultada pela equipe autorizada. Os documentos não são publicados no site nem anexados automaticamente ao e-mail de orçamento.' : 'Nesta prévia, os dados ficam apenas no armazenamento deste navegador. Use documentos fictícios. Você pode removê-los limpando os dados do site.'}</Txt><Txt style={common.caption}>O consentimento não autoriza campanhas de marketing. Não inclua senhas ou informações que não sejam necessárias à tradução.</Txt><Button variant="secondary" onPress={() => setPrivacy(false)}>Entendi</Button></Dialog>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  container: { width: '100%', maxWidth: 1280, alignSelf: 'center' },
  header: { height: 112, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  companyBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, companyName: { fontSize: 31, lineHeight: 33, fontWeight: '700', letterSpacing: -1.2 }, companyCaption: { fontSize: 9, letterSpacing: 3.5, lineHeight: 16, color: colors.muted },
  headerLinks: { flexDirection: 'row', alignItems: 'center', gap: 32 }, navLink: { fontSize: 14, color: colors.muted },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 30, paddingHorizontal: 18, minHeight: 44, backgroundColor: colors.surface }, portalText: { fontSize: 13, fontWeight: '500' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 35, paddingTop: 70, paddingBottom: 64 }, heroCopy: { flex: 1, minWidth: 0 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 }, dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.accent }, heroTagText: { fontSize: 11, letterSpacing: 2, color: colors.muted, fontWeight: '600' },
  heroTitle: { fontSize: 82, lineHeight: 88, fontWeight: '700', letterSpacing: -3.4 }, heroDescription: { fontSize: 19, lineHeight: 29, color: colors.muted, maxWidth: 470, marginTop: 26 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, marginTop: 32 }, discover: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, heroNote: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 26, maxWidth: 470 },
  heroVisual: { width: 460, minWidth: 0 },


  languageStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, paddingVertical: 28, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, stripText: { fontSize: 19, color: colors.muted, letterSpacing: -0.3 },
  section: { paddingVertical: 72 }, eyebrow: { fontSize: 10, lineHeight: 17, letterSpacing: 2, fontWeight: '600', color: colors.accent, marginBottom: 18 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 32 }, sectionTitle: { fontSize: 46, lineHeight: 51, letterSpacing: -1.5, fontWeight: '700' }, sectionTitleSmall: { fontSize: 36, lineHeight: 41, letterSpacing: -1 }, sectionDescription: { maxWidth: 340, fontSize: 17, lineHeight: 26, color: colors.muted },
  services: { flexDirection: 'row', gap: 16 }, service: { flex: 1, padding: 30, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }, serviceNumber: { fontSize: 12, color: colors.muted }, serviceTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600', marginBottom: 12, letterSpacing: -0.5 }, serviceText: { fontSize: 15, lineHeight: 24, color: colors.muted }, serviceBottom: { marginTop: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  steps: { flexDirection: 'row', gap: 40, marginTop: 42 }, step: { flex: 1 }, stepLine: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }, stepNumber: { color: colors.accent, fontSize: 22, fontWeight: '600' }, stepRule: { flex: 1, height: 1, backgroundColor: colors.line }, stepTitle: { fontSize: 22, fontWeight: '600', lineHeight: 30, marginBottom: 10 }, stepText: { fontSize: 15, lineHeight: 24, color: colors.muted, maxWidth: 320 },
  quoteSection: { paddingVertical: 80, alignItems: 'center', gap: 30, borderTopWidth: 1, borderTopColor: colors.line }, quoteIntro: { width: '100%', maxWidth: 820, alignItems: 'center', gap: 15 }, quoteTag: { flexDirection: 'row', alignItems: 'center', gap: 8 }, quoteTagText: { fontSize: 10, letterSpacing: 1.6, color: colors.accent }, quoteDescription: { fontSize: 17, lineHeight: 26, color: colors.muted, textAlign: 'center' }, quoteAssurances: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 22 },
  form: { width: '100%', maxWidth: 860, backgroundColor: '#121214', borderWidth: 1, borderColor: '#353036', borderRadius: 32, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }, formTitle: { fontSize: 27, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6 }, previewNote: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 22, marginTop: 22, borderTopWidth: 1, borderTopColor: colors.line },
  formStepper: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 22, marginBottom: 24 }, formStep: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, formStepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, formStepCurrent: { backgroundColor: colors.accent, borderColor: colors.accent }, formStepDone: { backgroundColor: colors.accentSoft, borderColor: '#5C283A' }, formStepLabel: { fontSize: 13, color: colors.muted, fontWeight: '500' }, formStageHeader: { gap: 7, marginBottom: 24 }, formStage: { minHeight: 280 }, formActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 10 }, swapLanguages: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center', marginTop: 36 },
  formRow: { flexDirection: 'row', gap: 16 }, field: { flex: 1, minWidth: 0, gap: 8, marginBottom: 18 }, label: { fontSize: 13, fontWeight: '500', lineHeight: 19 }, input: { minHeight: 48, borderRadius: 12, backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#353539', fontFamily: font, color: colors.ink, fontSize: 15, paddingHorizontal: 15, outlineWidth: 0 }, textarea: { minHeight: 94, paddingTop: 13, paddingBottom: 13, textAlignVertical: 'top' },
  serviceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, choice: { flexGrow: 1, flexBasis: '20%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, backgroundColor: colors.surface }, choiceActive: { backgroundColor: colors.accentSoft, borderColor: '#9C3D59' }, choiceText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17, color: colors.muted },
  upload: { alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: '#61404E', borderRadius: 22, backgroundColor: '#1C1319' }, uploadIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, uploadPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: colors.elevated, paddingHorizontal: 18, paddingVertical: 11, marginTop: 3 }, fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 15, marginTop: 12 }, fileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, documentNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 18 }, projectSummary: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, marginBottom: 24 }, consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 4, marginBottom: 14 }, consentCheck: { width: 24, height: 24, marginTop: 2, borderWidth: 1, borderColor: colors.muted, borderRadius: 7, justifyContent: 'center', alignItems: 'center' }, error: { color: colors.red, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  receipt: { gap: 22, paddingVertical: 20 }, receiptTitle: { fontSize: 30, lineHeight: 37, fontWeight: '600', letterSpacing: -0.7 }, receiptCode: { backgroundColor: colors.canvas, padding: 18, borderRadius: 16, gap: 8 },
  faqSection: { paddingVertical: 48, maxWidth: 850, width: '100%', alignSelf: 'center' }, faq: { borderBottomWidth: 1, borderBottomColor: colors.line }, faqQuestion: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, faqTitle: { fontSize: 18, lineHeight: 25, flex: 1 }, faqAnswer: { fontSize: 15, lineHeight: 25, color: colors.muted, marginBottom: 26, paddingRight: 30 }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 28, marginTop: 54, paddingVertical: 36, borderTopWidth: 1, borderTopColor: colors.line },
});
