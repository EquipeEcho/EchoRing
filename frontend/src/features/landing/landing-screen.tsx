import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, Polygon, Rect } from 'react-native-svg';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowLeftRight, ArrowUpRight, BriefcaseBusiness, Check, CheckCircle2, FileText, Globe2, Headphones, LockKeyhole, Monitor, Plus, Send, ShieldCheck, Sparkles, Upload, X, Zap } from 'lucide-react-native';
import { Brand, Button, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { DateSelectField, OptionSelectField, languageOptions } from '@/components/ui/selection-fields';
import { useSession } from '@/features/auth/session';
import { colors, font } from '@/constants/design';
import { apiMode, selectDocuments, submitIntake, type Intake, type TranslationRequest } from '@/features/requests/service';

const services = [
  { icon: FileText, title: 'Tradução de documentos', text: 'Documentos pessoais, acadêmicos e empresariais, com sentido e contexto preservados.' },
  { icon: BriefcaseBusiness, title: 'Tradução empresarial', text: 'Contratos, apresentações, relatórios e materiais corporativos.' },
  { icon: Monitor, title: 'Sites e conteúdo digital', text: 'Sites, aplicativos, materiais de marketing e conteúdo para redes sociais.' },
  { icon: Globe2, title: 'Tradução técnica', text: 'Manuais, documentação e conteúdos especializados em diversas áreas.' },
];
function LanguageFlag({ code }: { code: 'br' | 'us' | 'es' | 'fr' | 'de' | 'it' }) {
  const clip = `flag-${code}`;
  return <Svg width={44} height={44} viewBox="0 0 44 44" aria-hidden>
    <Defs><ClipPath id={clip}><Circle cx="22" cy="22" r="21" /></ClipPath></Defs>
    <Circle cx="22" cy="22" r="21" fill="#171719" stroke="#3A3A3E" />
    <>
      {code === 'br' && <G clipPath={`url(#${clip})`}><Rect width="44" height="44" fill="#168B46" /><Polygon points="22,8 39,22 22,36 5,22" fill="#F2CE3E" /><Circle cx="22" cy="22" r="8" fill="#21468B" /></G>}
      {code === 'us' && <G clipPath={`url(#${clip})`}><Rect width="44" height="44" fill="#F3F3F3" />{[0, 8, 16, 24, 32, 40].map(y => <Rect key={y} y={y} width="44" height="4" fill="#CF3048" />)}<Rect width="19" height="20" fill="#27477C" /><Circle cx="6" cy="6" r="1.2" fill="#FFF" /><Circle cx="13" cy="6" r="1.2" fill="#FFF" /><Circle cx="6" cy="13" r="1.2" fill="#FFF" /><Circle cx="13" cy="13" r="1.2" fill="#FFF" /></G>}
      {code === 'es' && <G clipPath={`url(#${clip})`}><Rect width="44" height="44" fill="#B92B35" /><Rect y="12" width="44" height="20" fill="#F1C445" /></G>}
      {code === 'fr' && <G clipPath={`url(#${clip})`}><Rect width="15" height="44" fill="#23458B" /><Rect x="15" width="14" height="44" fill="#F7F7F7" /><Rect x="29" width="15" height="44" fill="#D33249" /></G>}
      {code === 'de' && <G clipPath={`url(#${clip})`}><Rect width="44" height="15" fill="#171719" /><Rect y="15" width="44" height="14" fill="#C83A42" /><Rect y="29" width="44" height="15" fill="#E4BD42" /></G>}
      {code === 'it' && <G clipPath={`url(#${clip})`}><Rect width="15" height="44" fill="#238455" /><Rect x="15" width="14" height="44" fill="#F7F7F7" /><Rect x="29" width="15" height="44" fill="#CB3948" /></G>}
    </>
  </Svg>;
}
const blank: Intake = { name: '', email: '', company: '', title: '', service: 'Tradução técnica', source: 'Português', target: 'Inglês', deadline: '', message: '', consent: false, attachments: [] };
export function LandingScreen() {
  const { session } = useSession();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 760;
  const narrow = width < 380;
  const wide = width >= 1000;
  const headerHeight = mobile ? 76 : 96;
  const availableHeight = height - insets.top - insets.bottom;
  const heroHeight = Math.max(mobile ? 540 : 520, availableHeight - headerHeight);
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
  function field(key: 'name' | 'email' | 'company' | 'title' | 'message', label: string, placeholder: string, multiline = false) {
    return <View testID="landing-field" style={[s.field, width < 600 && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><Txt style={s.label}>{label}</Txt><TextInput ref={element => { inputs.current[key] = element; }} accessibilityLabel={label} aria-invalid={invalid.includes(key)}
      editable={!busy} value={data[key]} onChangeText={value => change(key, value)} placeholder={placeholder} placeholderTextColor={colors.muted}
      style={[s.input, multiline && s.textarea, invalid.includes(key) && { borderColor: colors.red }]} multiline={multiline}
      autoCapitalize={key === 'email' ? 'none' : 'sentences'} keyboardType={key === 'email' ? 'email-address' : 'default'} autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'} maxLength={multiline ? 3000 : 160} /></View>;
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: narrow ? 12 : mobile ? 20 : 48 }}>
      <View style={s.container}>
        <View style={[s.header, { height: headerHeight }, mobile && s.headerMobile]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Echo Ring, início" onPress={() => go('top')} style={s.companyBrand}><Brand compact={mobile} /></Pressable>
          <View style={s.headerLinks}>{!mobile && <><Pressable accessibilityRole="button" onPress={() => go('services')}><Txt style={s.navLink}>Serviços</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => go('languages')}><Txt style={s.navLink}>Idiomas</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => go('process')}><Txt style={s.navLink}>Sobre</Txt></Pressable><Pressable accessibilityRole="button" onPress={() => go('quote')}><Txt style={s.navLink}>Contato</Txt></Pressable></>}
            <Pressable accessibilityRole="button" onPress={() => router.push(session ? '/dashboard' : '/login')} style={[s.portal, mobile && s.portalMobile, narrow && s.portalNarrow]}><Txt style={[s.portalText, narrow && { fontSize: 12 }]}>{narrow ? 'Portal' : mobile ? 'Área da equipe' : 'Entrar no portal'}</Txt><ArrowUpRight size={16} color={colors.ink} /></Pressable>
          </View>
        </View>
        <View testID="landing-hero-globe" onLayout={event => { sections.current.top = event.nativeEvent.layout.y; }} style={[s.hero, { width, height: heroHeight }, mobile && s.heroMobile]}>
          <Image source={require('@/assets/images/hero-globe.png')} resizeMode="cover" style={[s.heroImage, mobile && s.heroImageMobile]} />
          <View pointerEvents="none" style={[s.heroShade, mobile && s.heroShadeMobile]} />
          <View style={[s.heroCopy, mobile && { maxWidth: '100%' }]}>
            <View style={[s.heroTag, mobile && s.heroTagMobile]}><Txt style={[s.heroTagText, mobile && s.heroTagTextMobile]}>TRADUÇÕES QUE</Txt></View>
            <Txt accessibilityRole="header" style={[s.heroTitle, heroType]}>
              Conectam{`\n`}<Txt style={[s.heroTitle, { color: colors.accent }, heroType]}>o mundo.</Txt>
            </Txt>
            <Txt style={[s.heroDescription, mobile && s.heroDescriptionMobile]}>Mais que palavras, conexões entre pessoas, culturas e oportunidades.</Txt>
            <View style={[s.heroActions, mobile && s.heroActionsMobile]}><Button style={mobile && s.heroButtonMobile} icon={ArrowUpRight} onPress={() => go('quote')}>Solicitar orçamento</Button><Pressable accessibilityRole="button" onPress={() => go('services')} style={[s.discover, mobile && s.discoverMobile]}><Txt style={{ color: colors.muted, fontSize: mobile ? 14 : 15 }}>Conheça nossas soluções</Txt><ArrowDown size={17} color={colors.muted} /></Pressable></View>
            <View style={[s.heroKeywords, mobile && s.heroKeywordsMobile]}><Txt style={s.heroKeyword}>IDIOMAS</Txt><View style={s.keywordRule} /><Txt style={s.heroKeyword}>PESSOAS</Txt><View style={s.keywordRule} /><Txt style={s.heroKeyword}>NOVAS POSSIBILIDADES</Txt></View>
          </View>
        </View>
        <View testID="landing-services" onLayout={event => { sections.current.services = event.nativeEvent.layout.y; }} style={s.section}>
          <Txt style={s.eyebrow}>NOSSOS SERVIÇOS</Txt><View style={[s.sectionHeading, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Soluções para{`\n`}<Txt style={[s.sectionTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>cada necessidade.</Txt></Txt><Txt style={s.sectionDescription}>Traduções profissionais para diferentes contextos, sempre preservando o significado da sua mensagem.</Txt></View>
          <View style={[s.services, !wide && { flexWrap: 'wrap' }, mobile && { flexDirection: 'column' }]}>{services.map((service, index) => <Pressable key={service.title} accessibilityRole="button" accessibilityLabel={`Solicitar ${service.title}`} onPress={() => { change('service', service.title); setStep(0); go('quote'); }} style={({ hovered, pressed }) => [s.service, hovered && s.serviceHover, pressed && { transform: [{ scale: 0.985 }] }, !wide && { minWidth: mobile ? 0 : 280 }, mobile && { padding: 24, flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><View pointerEvents="none" style={s.serviceGlow} /><View pointerEvents="none" style={s.serviceAccent} /><View style={s.serviceTop}><View style={s.serviceIcon}><service.icon size={29} color={colors.accent} strokeWidth={1.55} /></View><Txt style={s.serviceNumber}>{String(index + 1).padStart(2, '0')}</Txt></View><Txt style={s.serviceTitle}>{service.title}</Txt><Txt style={s.serviceText}>{service.text}</Txt><View style={s.serviceBottom}><Txt style={s.serviceCta}>EXPLORAR SOLUÇÃO</Txt><View style={s.serviceArrow}><ArrowRight size={18} color={colors.ink} /></View></View></Pressable>)}</View>
        </View>
        <View onLayout={event => { sections.current.languages = event.nativeEvent.layout.y; }} style={[s.languagesSection, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={s.languagesCopy}><Txt style={s.eyebrow}>IDIOMAS</Txt><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Falamos a língua{`\n`}<Txt style={[s.sectionTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>do seu público.</Txt></Txt></View>
          <View style={s.languageGrid}>{([['br', 'Português'], ['us', 'Inglês'], ['es', 'Espanhol'], ['fr', 'Francês'], ['de', 'Alemão'], ['it', 'Italiano']] as const).map(([code, language]) => <View key={language} style={s.language}><LanguageFlag code={code} /><Txt style={s.languageName}>{language}</Txt></View>)}</View>
        </View>
        <View onLayout={event => { sections.current.process = event.nativeEvent.layout.y; }} style={s.section}>
          <Txt style={s.eyebrow}>DO PRIMEIRO OLÁ À ENTREGA</Txt><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Simples para você.{'\n'}Cuidadoso em cada detalhe.</Txt>
          <View style={[s.steps, mobile && { flexDirection: 'column', gap: 32 }]}>{[
            ['Conte o que precisa', 'Escolha os idiomas, descreva o projeto e anexe seus documentos.'],
            ['Receba uma proposta', 'Nossa equipe analisa o material e envia prazo e orçamento por e-mail.'],
            ['Dê o próximo passo', 'Após a aprovação, alinhamos o início e a entrega da tradução.'],
          ].map(([title, text], index) => <View key={title} style={[s.step, mobile && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}><View style={s.stepLine}><Txt style={s.stepNumber}>0{index + 1}</Txt><View style={s.stepRule} /></View><Txt style={s.stepTitle}>{title}</Txt><Txt style={s.stepText}>{text}</Txt></View>)}</View>
        </View>
        <View onLayout={event => { sections.current.quote = event.nativeEvent.layout.y; }} style={[s.quoteSection, !wide && { flexDirection: 'column' }]}>
          <View style={s.quoteIntro}><View style={s.quoteAccent} /><Txt style={s.quoteTagText}>SOLICITE SEU ORÇAMENTO</Txt><Txt accessibilityRole="header" style={[s.quoteTitle, mobile && s.sectionTitleSmall]}>Vamos traduzir{`\n`}<Txt style={[s.quoteTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>suas ideias?</Txt></Txt><Txt style={s.quoteDescription}>Preencha as informações e receba um orçamento rápido e sem compromisso.</Txt>
            <View style={s.quoteBenefits}>{[
              { icon: Zap, title: 'Resposta rápida', text: 'Receba seu orçamento em pouco tempo.' },
              { icon: ShieldCheck, title: 'Seus dados seguros', text: 'Total confidencialidade das suas informações.' },
              { icon: Headphones, title: 'Atendimento humano', text: 'Fale com nossa equipe sempre que precisar.' },
            ].map(item => <View key={item.title} style={s.quoteBenefit}><View style={s.benefitIcon}><item.icon size={25} color={colors.accent} /></View><Txt style={s.benefitTitle}>{item.title}</Txt><Txt style={s.benefitText}>{item.text}</Txt></View>)}</View>
          </View>
          <View testID="landing-quote-form" style={[s.form, !wide && { width: '100%', maxWidth: 680 }, mobile && { padding: 22, borderRadius: 18 }]}>
            {receipt ? <View style={s.receipt}><CheckCircle2 size={46} color={colors.accent} strokeWidth={1.5} /><Txt accessibilityRole="header" style={s.receiptTitle}>{receipt.demo ? 'Pedido salvo na prévia.' : 'Recebido. Agora é com a gente.'}</Txt><Txt style={s.serviceText}>{receipt.demo ? 'Este pedido está salvo neste navegador para testar o fluxo no portal. Ele não foi enviado à empresa e nenhum e-mail será enviado.' : `Nossa equipe vai analisar seu projeto e responder com o orçamento para ${receipt.email}.`}</Txt><View style={s.receiptCode}><Txt style={common.caption}>SEU PROTOCOLO</Txt><Txt selectable style={{ fontWeight: '600', fontSize: 18 }}>{receipt.id}</Txt></View><Button variant="secondary" onPress={() => { setReceipt(null); setData({ ...blank }); setStep(0); }}>Fazer outra solicitação</Button>{receipt.demo && <Button variant="ghost" onPress={() => router.push('/solicitacoes')}>Ver no portal da equipe</Button>}</View> : <>
              <View style={s.formStepper}>{['Projeto', 'Documentos', 'Contato'].map((title, index) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={`Etapa ${index + 1}: ${title}`} aria-current={step === index ? 'step' : undefined} disabled={index > step || busy} onPress={() => { setStep(index); setError(''); }} style={[s.formStep, mobile && { flexDirection: 'column', gap: 6 }]}><View style={[s.formStepNumber, step === index && s.formStepCurrent, index < step && s.formStepDone]}>{index < step ? <Check size={14} color={colors.accent} /> : <Txt style={{ fontSize: 12, color: step === index ? colors.canvas : colors.muted, fontWeight: '600' }}>{index + 1}</Txt>}</View><Txt style={[s.formStepLabel, step === index && { color: colors.ink }]}>{title}</Txt></Pressable>)}</View>
              <View style={s.formStageHeader}><Txt accessibilityRole="header" accessibilityLiveRegion="polite" style={s.formTitle}>{['Vamos conhecer seu projeto.', 'O material faz a diferença.', 'Para onde vai a proposta?'][step]}</Txt><Txt style={common.caption}>{['Escolha o serviço e os idiomas. Campos com * são obrigatórios.', 'Anexe o conteúdo para uma análise mais precisa. Esta etapa é opcional.', 'Só precisamos de um contato para responder ao seu pedido.'][step]}</Txt></View>
              <View key={step} testID="quote-stage" style={s.formStage}>
                {step === 0 && <>
                  <View style={s.serviceChoices}>{[...services, { icon: Sparkles, title: 'Outro', text: '' }].map(service => <Pressable key={service.title} accessibilityRole="radio" accessibilityLabel={service.title} accessibilityState={{ checked: data.service === service.title }} aria-checked={data.service === service.title} onPress={() => change('service', service.title)} style={({ hovered }) => [s.choice, mobile && { flexBasis: '44%' }, data.service === service.title && s.choiceActive, hovered && { borderColor: '#895064' }]}><service.icon size={17} color={data.service === service.title ? colors.accent : colors.muted} strokeWidth={1.7} /><Txt style={[s.choiceText, data.service === service.title && { color: colors.accent }]}>{service.title}</Txt></Pressable>)}</View>
                  <View style={[s.formRow, width < 600 && { flexDirection: 'column' }]}>{field('title', 'Nome do projeto *', 'Ex.: Manual de um equipamento')}<DateSelectField compact={width < 600} label="Prazo desejado" value={data.deadline} onChange={value => change('deadline', value)} disabled={busy} invalid={invalid.includes('deadline')} /></View>
                  <View style={[s.formRow, width < 600 && { flexDirection: 'column' }]}><OptionSelectField compact={width < 600} label="Idioma de origem *" value={data.source} onChange={value => change('source', value)} options={languageOptions} dialogTitle="Idioma de origem" description="Selecione o idioma atual do material." disabled={busy} invalid={invalid.includes('source')} /><Pressable accessibilityRole="button" accessibilityLabel="Inverter idiomas" onPress={() => setData(current => ({ ...current, source: current.target, target: current.source }))} style={[s.swapLanguages, width < 600 && { alignSelf: 'center', marginTop: -12, marginBottom: 8 }]}><ArrowLeftRight size={17} color={colors.accent} /></Pressable><OptionSelectField compact={width < 600} label="Idioma de destino *" value={data.target} onChange={value => change('target', value)} options={languageOptions} dialogTitle="Idioma de destino" description="Selecione o idioma em que o conteúdo será entregue." disabled={busy} invalid={invalid.includes('target')} /></View>
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
        </View>
        <View testID="landing-faq" style={s.faqSection}><Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Antes do primeiro olá.</Txt>{[
          ['Como é calculado o orçamento?', 'A proposta considera os idiomas, o tipo de conteúdo, o volume e o prazo. Nossa equipe analisa a solicitação antes de informar o valor.'],
          ['Preciso anexar o documento agora?', 'Você pode começar descrevendo o projeto. Para um orçamento mais preciso, anexe o material ou informe o número de páginas e palavras.'],
          ['E se meu idioma não estiver na página?', 'Informe o idioma de origem e de destino no formulário. A equipe verifica a disponibilidade e retorna por e-mail.'],
        ].map(([question, answer], index) => <View key={question} style={s.faq}><Pressable accessibilityRole="button" accessibilityState={{ expanded: faq === index }} aria-expanded={faq === index} onPress={() => setFaq(faq === index ? null : index)} style={s.faqQuestion}><Txt style={s.faqTitle}>{question}</Txt>{faq === index ? <X size={19} color={colors.accent} /> : <Plus size={19} color={colors.accent} />}</Pressable>{faq === index && <Txt style={s.faqAnswer}>{answer}</Txt>}</View>)}</View>
        <View style={[s.footer, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}><Brand /><View style={s.footerLinks}><Pressable onPress={() => go('services')}><Txt style={s.footerLink}>Serviços</Txt></Pressable><Pressable onPress={() => go('languages')}><Txt style={s.footerLink}>Idiomas</Txt></Pressable><Pressable onPress={() => go('process')}><Txt style={s.footerLink}>Sobre</Txt></Pressable><Pressable onPress={() => go('quote')}><Txt style={s.footerLink}>Contato</Txt></Pressable></View><Txt style={{ fontSize: 12, color: colors.muted }}>© {new Date().getFullYear()} Echo Ring</Txt></View>
      </View>
    </ScrollView>
    <Dialog open={privacy} onClose={() => setPrivacy(false)} size="compact" eyebrow="PRIVACIDADE" title="Seus dados, com propósito"><Txt>Nome, e-mail, informações do projeto e documentos são usados para avaliar o pedido e responder sobre o orçamento.</Txt><Txt style={common.caption}>{apiMode ? 'A solicitação é armazenada no servidor e consultada pela equipe autorizada. Os documentos não são publicados no site nem anexados automaticamente ao e-mail de orçamento.' : 'Nesta prévia, os dados ficam apenas no armazenamento deste navegador. Use documentos fictícios. Você pode removê-los limpando os dados do site.'}</Txt><Txt style={common.caption}>O consentimento não autoriza campanhas de marketing. Não inclua senhas ou informações que não sejam necessárias à tradução.</Txt><Button variant="secondary" onPress={() => setPrivacy(false)}>Entendi</Button></Dialog>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  header: { height: 108, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  headerMobile: { paddingHorizontal: 0, gap: 10 },
  companyBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, companyName: { fontSize: 31, lineHeight: 33, fontWeight: '700', letterSpacing: -1.2 }, companyCaption: { fontSize: 9, letterSpacing: 3.5, lineHeight: 16, color: colors.muted },
  headerLinks: { flexDirection: 'row', alignItems: 'center', gap: 34 }, navLink: { fontSize: 15, color: colors.muted },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 18, minHeight: 44, backgroundColor: colors.surface }, portalText: { fontSize: 13, fontWeight: '500' },
  portalMobile: { paddingHorizontal: 14, minHeight: 42 }, portalNarrow: { paddingHorizontal: 11, gap: 5 },
  hero: { alignSelf: 'center', flexShrink: 0, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 56, paddingVertical: 48, backgroundColor: '#070707' },
  heroMobile: { paddingHorizontal: 22, paddingVertical: 30, justifyContent: 'center' },
  heroImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 2 }, heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.16)' }, heroCopy: { width: '100%', maxWidth: 610, zIndex: 1 },
  heroImageMobile: { opacity: 0.66, ...Platform.select({ web: { objectPosition: '64% center' } as any, default: {} }) }, heroShadeMobile: { backgroundColor: 'rgba(0,0,0,0.38)' },
  heroTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 }, dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.accent }, heroTagText: { fontSize: 13, letterSpacing: 6, color: '#B4AFB3', fontWeight: '500' },
  heroTagMobile: { marginBottom: 14 }, heroTagTextMobile: { fontSize: 11, letterSpacing: 4 },
  heroTitle: { fontSize: 82, lineHeight: 88, fontWeight: '700', letterSpacing: -3.4 }, heroDescription: { fontSize: 21, lineHeight: 31, color: '#B5B1B4', maxWidth: 520, marginTop: 24 },
  heroDescriptionMobile: { fontSize: 17, lineHeight: 25, marginTop: 18, maxWidth: 390 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, marginTop: 34 }, discover: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  heroActionsMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 24 }, heroButtonMobile: { width: '100%' }, discoverMobile: { justifyContent: 'center' },
  heroKeywords: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 92 }, heroKeyword: { fontSize: 10, letterSpacing: 3, color: '#AAA3A8' }, keywordRule: { width: 32, height: 1, backgroundColor: '#64575D' },
  heroKeywordsMobile: { justifyContent: 'center', gap: 10, marginTop: 28 },
  section: { paddingVertical: 88, paddingHorizontal: 16 }, eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 4, fontWeight: '600', color: colors.accent, marginBottom: 18 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 36 }, sectionTitle: { fontSize: 54, lineHeight: 58, letterSpacing: -2, fontWeight: '700' }, sectionTitleSmall: { fontSize: 37, lineHeight: 42, letterSpacing: -1.2 }, sectionDescription: { maxWidth: 440, fontSize: 18, lineHeight: 28, color: colors.muted },
  services: { flexDirection: 'row', gap: 14 }, service: { flex: 1, minHeight: 284, padding: 26, borderRadius: 22, backgroundColor: '#0E0E10', borderWidth: 1, borderColor: '#2B292D', overflow: 'hidden', ...Platform.select({ web: { transitionDuration: '220ms', transitionProperty: 'transform, border-color, box-shadow, background-color', boxShadow: '0 18px 50px rgba(0,0,0,0.28)' } as any, default: {} }) }, serviceHover: { backgroundColor: '#151216', borderColor: '#713044', transform: [{ translateY: -7 }, { scale: 1.008 }], ...Platform.select({ web: { boxShadow: '0 24px 70px rgba(255,54,91,0.12)' } as any, default: {} }) }, serviceGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -76, top: -86, backgroundColor: '#3B111E', opacity: 0.72 }, serviceAccent: { position: 'absolute', left: 26, right: 26, top: 0, height: 2, borderRadius: 2, backgroundColor: colors.accent, opacity: 0.82 }, serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }, serviceIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#251219', borderWidth: 1, borderColor: '#5B2636', ...Platform.select({ web: { boxShadow: '0 8px 30px rgba(255,54,91,0.12)' } as any, default: {} }) }, serviceNumber: { color: '#6D6267', fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 2 }, serviceTitle: { maxWidth: 220, fontSize: 22, lineHeight: 28, fontWeight: '600', marginBottom: 12, letterSpacing: -0.5 }, serviceText: { fontSize: 15, lineHeight: 23, color: colors.muted }, serviceBottom: { flex: 1, minHeight: 48, marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#262428', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, serviceCta: { color: '#B8ADB1', fontSize: 10, lineHeight: 15, fontWeight: '600', letterSpacing: 1.4 }, serviceArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(255,54,91,0.22)' } as any, default: {} }) },
  languagesSection: { flexDirection: 'row', alignItems: 'center', gap: 54, paddingHorizontal: 16, paddingVertical: 76, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, languagesCopy: { flex: 0.8, minWidth: 280 }, languageGrid: { flex: 1.2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }, language: { minWidth: 82, alignItems: 'center', gap: 9 }, languageName: { fontSize: 14, color: colors.ink },
  steps: { flexDirection: 'row', gap: 40, marginTop: 42 }, step: { flex: 1 }, stepLine: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }, stepNumber: { color: colors.accent, fontSize: 22, fontWeight: '600' }, stepRule: { flex: 1, height: 1, backgroundColor: colors.line }, stepTitle: { fontSize: 22, fontWeight: '600', lineHeight: 30, marginBottom: 10 }, stepText: { fontSize: 15, lineHeight: 24, color: colors.muted, maxWidth: 320 },
  quoteSection: { flexDirection: 'row', alignItems: 'center', gap: 56, paddingHorizontal: 16, paddingVertical: 96, borderTopWidth: 1, borderTopColor: colors.line }, quoteIntro: { flex: 1, width: '100%', maxWidth: 590, alignItems: 'flex-start', gap: 15 }, quoteAccent: { width: 42, height: 3, backgroundColor: colors.accent, marginBottom: 3 }, quoteTagText: { fontSize: 11, letterSpacing: 4, color: '#B6AFB3' }, quoteTitle: { fontSize: 58, lineHeight: 62, letterSpacing: -2, fontWeight: '700' }, quoteDescription: { fontSize: 18, lineHeight: 27, color: colors.muted, maxWidth: 520 }, quoteBenefits: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 24 }, quoteBenefit: { flex: 1, minWidth: 140, gap: 7 }, benefitIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#211218', borderWidth: 1, borderColor: '#3F202A', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }, benefitTitle: { fontSize: 15, fontWeight: '600' }, benefitText: { fontSize: 13, lineHeight: 20, color: colors.muted },
  form: { width: '54%', maxWidth: 680, backgroundColor: '#111112', borderWidth: 1, borderColor: '#34272C', borderRadius: 18, padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.38)' }, formTitle: { fontSize: 27, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6 }, previewNote: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 22, marginTop: 22, borderTopWidth: 1, borderTopColor: colors.line },
  formStepper: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 22, marginBottom: 24 }, formStep: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, formStepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, formStepCurrent: { backgroundColor: colors.accent, borderColor: colors.accent }, formStepDone: { backgroundColor: colors.accentSoft, borderColor: '#5C283A' }, formStepLabel: { fontSize: 13, color: colors.muted, fontWeight: '500' }, formStageHeader: { gap: 7, marginBottom: 24 }, formStage: { minHeight: 280 }, formActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 10 }, swapLanguages: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center', marginTop: 36 },
  formRow: { flexDirection: 'row', gap: 16 }, field: { flex: 1, minWidth: 0, gap: 8, marginBottom: 18 }, label: { fontSize: 13, fontWeight: '500', lineHeight: 19 }, input: { minHeight: 48, borderRadius: 12, backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#353539', fontFamily: font, color: colors.ink, fontSize: 15, paddingHorizontal: 15, outlineWidth: 0 }, textarea: { minHeight: 94, paddingTop: 13, paddingBottom: 13, textAlignVertical: 'top' },
  serviceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }, choice: { flexGrow: 1, flexBasis: '20%', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, backgroundColor: colors.surface }, choiceActive: { backgroundColor: colors.accentSoft, borderColor: '#9C3D59' }, choiceText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17, color: colors.muted },
  upload: { alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 30, borderWidth: 1, borderStyle: 'dashed', borderColor: '#61404E', borderRadius: 22, backgroundColor: '#1C1319' }, uploadIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, uploadPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: colors.elevated, paddingHorizontal: 18, paddingVertical: 11, marginTop: 3 }, fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 15, marginTop: 12 }, fileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, documentNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 18 }, projectSummary: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, marginBottom: 24 }, consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 4, marginBottom: 14 }, consentCheck: { width: 24, height: 24, marginTop: 2, borderWidth: 1, borderColor: colors.muted, borderRadius: 7, justifyContent: 'center', alignItems: 'center' }, error: { color: colors.red, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  receipt: { gap: 22, paddingVertical: 20 }, receiptTitle: { fontSize: 30, lineHeight: 37, fontWeight: '600', letterSpacing: -0.7 }, receiptCode: { backgroundColor: colors.canvas, padding: 18, borderRadius: 16, gap: 8 },
  faqSection: { paddingVertical: 64, maxWidth: 850, width: '100%', alignSelf: 'center' }, faq: { borderBottomWidth: 1, borderBottomColor: colors.line }, faqQuestion: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, faqTitle: { fontSize: 18, lineHeight: 25, flex: 1 }, faqAnswer: { fontSize: 15, lineHeight: 25, color: colors.muted, marginBottom: 26, paddingRight: 30 }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 28, marginTop: 34, paddingHorizontal: 16, paddingVertical: 42, borderTopWidth: 1, borderTopColor: colors.line }, footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 }, footerLink: { fontSize: 14, color: colors.muted },
});
