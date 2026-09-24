import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, Polygon, Rect } from 'react-native-svg';
import { ArrowDown, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, CheckCircle2, FileText, Globe2, Headphones, Monitor, Plus, Send, ShieldCheck, Upload, X, Zap } from 'lucide-react-native';
import { Brand, Button, Txt, common } from '@/components/ui/primitives';
import { Dialog } from '@/components/ui/dialog';
import { useSession } from '@/features/auth/session';
import { colors, font } from '@/constants/design';
import { apiMode, selectDocuments, type Intake, type TranslationRequest } from '@/features/requests/service';
import { validateSelectedFiles } from '@/utils/file-validation';
import { SERVICOS, IDIOMAS } from "@/constants/laguagesAndMore";

const services = [
  { icon: FileText, title: 'Tradução de documentos', text: 'Documentos pessoais, acadêmicos e empresariais, com sentido e contexto preservados.' },
  { icon: BriefcaseBusiness, title: 'Tradução empresarial', text: 'Contratos, apresentações, relatórios e materiais corporativos.' },
  { icon: Monitor, title: 'Sites e conteúdo digital', text: 'Sites, aplicativos, materiais de marketing e conteúdo para redes sociais.' },
  { icon: Globe2, title: 'Tradução técnica', text: 'Manuais, documentação e conteúdos especializados em diversas áreas.' },
];

const API_URL = 'http://localhost:8000/api/upload';

function LanguageFlag({ code }: { code: 'br' | 'us' | 'es' | 'fr' | 'de' | 'it' }) {
  const clip = `flag-${code}`;
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44" aria-hidden>
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
    </Svg>
  );
}

// Componente de Autocomplete para Seleção de Idiomas
function LanguageSelect({ label, placeholder, value, onChange, error }: { label: string; placeholder: string; value: string; onChange: (val: string) => void; error?: boolean }) {
  const [open, setOpen] = useState(false);

  const filtered = IDIOMAS.filter(item =>
    item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .includes((value || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  return (
    <View style={{ flex: 1, position: 'relative', marginBottom: 18, zIndex: 1000 }}>
      <Txt style={s.label}>{label}</Txt>
      <TextInput
        style={[s.input, error && { borderColor: colors.red }]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <View style={s.dropdownList}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
            {filtered.map(item => (
              <Pressable key={item} style={s.dropdownItem} onPress={() => { onChange(item); setOpen(false); }}>
                <Txt style={{ fontSize: 14, color: '#fff' }}>{item}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const blank: Intake = { name: '', email: '', company: '', title: '', service: 'Tradução técnica', source: 'Português (Brasil)', target: 'Inglês (EUA)', deadline: '', message: '', consent: false, attachments: [] };

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

  function change(key: keyof Intake, value: string | boolean) {
    setData(current => ({ ...current, [key]: value }));
    setInvalid(current => current.filter(item => item !== key));
    setError('');
  }

  async function attach() {
    setError('');
    setUploading(true);
    try {
      const files = await selectDocuments();
      if (files.length) {
        const { validFiles, error: validationError } = validateSelectedFiles(files);
        if (validationError) setError(validationError);
        if (validFiles.length > 0) setData(current => ({ ...current, attachments: validFiles }));
      }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (busy) return;

    const missing = (['name', 'email', 'title', 'source', 'target'] as const).filter(
      key => !data[key]?.trim()
    );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) && !missing.includes('email')) {
      missing.push('email');
    }

    if (!data.attachments || data.attachments.length === 0) {
      setError('Por favor, anexe pelo menos um arquivo (PDF, DOC ou DOCX).');
      return;
    }

    if (missing.length || !data.consent) {
      setInvalid(missing);
      setError('Preencha os campos obrigatórios e autorize o recebimento de comunicações por e-mail.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const formData = new FormData();

      formData.append('name', data.name.trim());
      formData.append('email', data.email.trim());
      formData.append('phone', data.deadline ? data.deadline.trim() : '');
      formData.append('company', data.company ? data.company.trim() : '');
      formData.append('service', data.title.trim());
      formData.append('source_lang', data.source.trim());
      formData.append('target_lang', data.target.trim());
      formData.append('message', data.message ? data.message.trim() : '');
      formData.append('consent', String(data.consent));

      const selectedItem = data.attachments[0];
      const fileName = selectedItem.name || 'documento.pdf';
      const mimeType = selectedItem.mimeType || selectedItem.type || 'application/pdf';

      if (Platform.OS === 'web') {
        let blob: Blob;

        if (selectedItem.content) {
          const byteCharacters = atob(selectedItem.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: mimeType });
        } else if (selectedItem.file instanceof Blob || selectedItem.file instanceof File) {
          blob = selectedItem.file;
        } else if (selectedItem instanceof Blob || selectedItem instanceof File) {
          blob = selectedItem;
        } else if (selectedItem.uri) {
          const res = await fetch(selectedItem.uri);
          blob = await res.blob();
        } else {
          throw new Error('Não foi possível ler o arquivo selecionado.');
        }

        const fileToUpload = new File([blob], fileName, { type: blob.type || mimeType });
        formData.append('file', fileToUpload, fileName);
      } else {
        const fileToUpload = {
          uri: selectedItem.uri,
          name: fileName,
          type: mimeType,
        };
        formData.append('file', fileToUpload as any);
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (__DEV__) console.error('--- LOG DE ERRO (MODO DEV) ---', errorData);
        if (Array.isArray(errorData.detail)) throw new Error('Por favor, verifique se todos os campos foram preenchidos corretamente.');
        if (response.status >= 500) throw new Error('Ocorreu uma instabilidade em nossos servidores. Tente novamente em alguns instantes.');
        throw new Error(errorData.detail || 'Não foi possível enviar sua solicitação. Tente novamente.');
      }

      const result = await response.json();
      setReceipt({ id: String(result.id), email: data.email, demo: false });
      go('quote');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function field(key: 'name' | 'email' | 'company' | 'title' | 'source' | 'target' | 'deadline' | 'message', label: string, placeholder: string, multiline = false) {
    return (
      <View testID="landing-field" style={[s.field, width < 600 && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}>
        <Txt style={s.label}>{label}</Txt>
        <TextInput
          ref={element => { inputs.current[key] = element; }}
          accessibilityLabel={label}
          aria-invalid={invalid.includes(key)}
          editable={!busy}
          value={data[key]}
          onChangeText={value => change(key, value)}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[s.input, multiline && s.textarea, invalid.includes(key) && { borderColor: colors.red }]}
          multiline={multiline}
          autoCapitalize={key === 'email' ? 'none' : 'sentences'}
          keyboardType={key === 'email' ? 'email-address' : 'default'}
          autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : 'off'}
          maxLength={multiline ? 3000 : 160}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: mobile ? 20 : 48 }}>
        <View style={s.container}>
          <View style={[s.header, mobile && { height: 88 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Echo Ring, início" onPress={() => go('top')} style={s.companyBrand}>
              <Brand compact={mobile} />
            </Pressable>
            <View style={s.headerLinks}>
              {!mobile && (
                <>
                  <Pressable accessibilityRole="button" onPress={() => go('services')}><Txt style={s.navLink}>Serviços</Txt></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => go('languages')}><Txt style={s.navLink}>Idiomas</Txt></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => go('process')}><Txt style={s.navLink}>Sobre</Txt></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => go('quote')}><Txt style={s.navLink}>Contato</Txt></Pressable>
                </>
              )}
              <Pressable accessibilityRole="button" onPress={() => router.push(session ? '/dashboard' : '/login')} style={[s.portal, width < 360 && { paddingHorizontal: 12, gap: 6 }]}>
                <Txt style={[s.portalText, width < 360 && { fontSize: 12 }]}>{mobile ? 'Área da equipe' : 'Entrar no portal'}</Txt>
                <ArrowUpRight size={16} color={colors.ink} />
              </Pressable>
            </View>
          </View>

          <View testID="landing-hero-globe" onLayout={event => { sections.current.top = event.nativeEvent.layout.y; }} style={[s.hero, mobile && s.heroMobile]}>
            <Image source={require('@/assets/images/hero-globe.png')} resizeMode="cover" style={[s.heroImage, mobile && { opacity: 0.62 }]} />
            <View pointerEvents="none" style={s.heroShade} />
            <View style={[s.heroCopy, mobile && { maxWidth: '100%' }]}>
              <View style={s.heroTag}><Txt style={s.heroTagText}>TRADUÇÕES QUE</Txt></View>
              <Txt accessibilityRole="header" style={[s.heroTitle, heroType]}>
                Conectam{`\n`}<Txt style={[s.heroTitle, { color: colors.accent }, heroType]}>o mundo.</Txt>
              </Txt>
              <Txt style={s.heroDescription}>Mais que palavras, conexões entre pessoas, culturas e oportunidades.</Txt>
              <View style={s.heroActions}>
                <Button icon={ArrowUpRight} onPress={() => go('quote')}>Solicitar orçamento</Button>
                <Pressable accessibilityRole="button" onPress={() => go('services')} style={s.discover}>
                  <Txt style={{ color: colors.muted, fontSize: 15 }}>Conheça nossas soluções</Txt>
                  <ArrowDown size={17} color={colors.muted} />
                </Pressable>
              </View>
              <View style={s.heroKeywords}>
                <Txt style={s.heroKeyword}>IDIOMAS</Txt><View style={s.keywordRule} /><Txt style={s.heroKeyword}>PESSOAS</Txt><View style={s.keywordRule} /><Txt style={s.heroKeyword}>NOVAS POSSIBILIDADES</Txt>
              </View>
            </View>
          </View>

          <View testID="landing-services" onLayout={event => { sections.current.services = event.nativeEvent.layout.y; }} style={s.section}>
            <Txt style={s.eyebrow}>NOSSOS SERVIÇOS</Txt>
            <View style={[s.sectionHeading, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Soluções para{`\n`}<Txt style={[s.sectionTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>cada necessidade.</Txt></Txt>
              <Txt style={s.sectionDescription}>Traduções profissionais para diferentes contextos, sempre preservando o significado da sua mensagem.</Txt>
            </View>
            <View style={[s.services, !wide && { flexWrap: 'wrap' }, mobile && { flexDirection: 'column' }]}>
              {services.map(service => (
                <Pressable key={service.title} accessibilityRole="button" accessibilityLabel={`Solicitar ${service.title}`} onPress={() => { change('title', service.title); go('quote'); }} style={({ hovered }) => [s.service, hovered && { backgroundColor: colors.elevated, borderColor: '#4B2C35' }, !wide && { minWidth: mobile ? 0 : 280 }, mobile && { padding: 24, flex: 0, flexShrink: 0, flexBasis: 'auto' }]}>
                  <View style={s.serviceTop}><View style={s.serviceIcon}><service.icon size={28} color={colors.accent} strokeWidth={1.6} /></View></View>
                  <Txt style={s.serviceTitle}>{service.title}</Txt>
                  <Txt style={s.serviceText}>{service.text}</Txt>
                  <View style={s.serviceBottom}><View /><View style={s.serviceArrow}><ArrowRight size={20} color={colors.accent} /></View></View>
                </Pressable>
              ))}
            </View>
          </View>

          <View onLayout={event => { sections.current.languages = event.nativeEvent.layout.y; }} style={[s.languagesSection, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={s.languagesCopy}>
              <Txt style={s.eyebrow}>IDIOMAS</Txt>
              <Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Falamos a língua{`\n`}<Txt style={[s.sectionTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>do seu público.</Txt></Txt>
            </View>
            <View style={s.languageGrid}>
              {([['br', 'Português'], ['us', 'Inglês'], ['es', 'Espanhol'], ['fr', 'Francês'], ['de', 'Alemão'], ['it', 'Italiano']] as const).map(([code, language]) => (
                <View key={language} style={s.language}><LanguageFlag code={code} /><Txt style={s.languageName}>{language}</Txt></View>
              ))}
            </View>
          </View>

          <View onLayout={event => { sections.current.process = event.nativeEvent.layout.y; }} style={s.section}>
            <Txt style={s.eyebrow}>DO PRIMEIRO OLÁ À ENTREGA</Txt>
            <Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Simples para você.{'\n'}Cuidadoso em cada detalhe.</Txt>
            <View style={[s.steps, mobile && { flexDirection: 'column', gap: 32 }]}>
              {[
                ['Conte o que precisa', 'Escolha os idiomas, descreva o projeto e anexe seus documentos.'],
                ['Receba uma proposta', 'Nossa equipe analisa o material e envia prazo e orçamento por e-mail.'],
                ['Dê o próximo passo', 'Após a aprovação, alinhamos o início e a entrega da tradução.'],
              ].map(([title, text], index) => (
                <View key={title} style={[s.step, mobile && { flex: 0, flexShrink: 0, flexBasis: 'auto' }]}>
                  <View style={s.stepLine}><Txt style={s.stepNumber}>0{index + 1}</Txt><View style={s.stepRule} /></View>
                  <Txt style={s.stepTitle}>{title}</Txt>
                  <Txt style={s.stepText}>{text}</Txt>
                </View>
              ))}
            </View>
          </View>

          <View onLayout={event => { sections.current.quote = event.nativeEvent.layout.y; }} style={[s.quoteSection, !wide && { flexDirection: 'column' }]}>
            <View style={s.quoteIntro}>
              <View style={s.quoteAccent} />
              <Txt style={s.quoteTagText}>SOLICITE SEU ORÇAMENTO</Txt>
              <Txt accessibilityRole="header" style={[s.quoteTitle, mobile && s.sectionTitleSmall]}>Vamos traduzir{`\n`}<Txt style={[s.quoteTitle, mobile && s.sectionTitleSmall, { color: colors.accent }]}>suas ideias?</Txt></Txt>
              <Txt style={s.quoteDescription}>Preencha as informações e receba um orçamento rápido e sem compromisso.</Txt>
              <View style={s.quoteBenefits}>
                {[
                  { icon: Zap, title: 'Resposta rápida', text: 'Receba seu orçamento em pouco tempo.' },
                  { icon: ShieldCheck, title: 'Seus dados seguros', text: 'Total confidencialidade das suas informações.' },
                  { icon: Headphones, title: 'Atendimento humano', text: 'Fale com nossa equipe sempre que precisar.' },
                ].map(item => (
                  <View key={item.title} style={s.quoteBenefit}>
                    <View style={s.benefitIcon}><item.icon size={25} color={colors.accent} /></View>
                    <Txt style={s.benefitTitle}>{item.title}</Txt>
                    <Txt style={s.benefitText}>{item.text}</Txt>
                  </View>
                ))}
              </View>
            </View>

            {/* FORMULÁRIO */}
            <View testID="landing-quote-form" style={[s.form, !wide && { width: '100%', maxWidth: 680 }, mobile && { padding: 22, borderRadius: 18 }]}>
              {receipt ? (
                <View style={s.receipt}>
                  <CheckCircle2 size={46} color={colors.accent} strokeWidth={1.5} />
                  <Txt accessibilityRole="header" style={s.receiptTitle}>{receipt.demo ? 'Pedido salvo na prévia.' : 'Recebido. Agora é com a gente.'}</Txt>
                  <Txt style={s.serviceText}>{receipt.demo ? 'Este pedido está salvo neste navegador para testar o fluxo no portal. Ele não foi enviado à empresa e nenhum e-mail será enviado.' : `Nossa equipe vai analisar seu projeto e responder com o orçamento para ${receipt.email}.`}</Txt>
                  <View style={s.receiptCode}>
                    <Txt style={common.caption}>SEU PROTOCOLO</Txt>
                    <Txt selectable style={{ fontWeight: '600', fontSize: 18 }}>{receipt.id}</Txt>
                  </View>
                  <Button variant="secondary" onPress={() => { setReceipt(null); setData({ ...blank }); }}>Fazer outra solicitação</Button>
                  {receipt.demo && <Button variant="ghost" onPress={() => router.push('/solicitacoes')}>Ver no portal da equipe</Button>}
                </View>
              ) : (
                <>
                  <View style={{ marginBottom: 24 }}>
                    <Txt accessibilityRole="header" style={[s.formTitle, { textTransform: 'uppercase' }]}>
                      PREENCHA OS DADOS PARA SOLICITAR UM ORÇAMENTO
                    </Txt>
                  </View>

                  <View style={s.formStage}>
                    {field('name', 'Nome *', 'Nome')}
                    {field('email', 'E-mail *', 'E-mail')}
                    {field('deadline', 'Telefone *', 'Telefone')}
                    {field('company', 'Empresa', 'Empresa')}

                    {/* SELECT DE SERVIÇOS (DROPDOWN) */}
                    <View style={{ marginBottom: 18 }}>
                      <Txt style={s.label}>Serviço: *</Txt>
                      {Platform.OS === 'web' ? (
                        <select
                          value={data.title}
                          onChange={(e) => change('title', e.target.value)}
                          style={{
                            height: '48px',
                            width: '100%',
                            borderRadius: '12px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: invalid.includes('title') ? colors.red : '#353539',
                            paddingLeft: '15px',
                            backgroundColor: '#1B1B1E',
                            color: colors.ink,
                            fontSize: '15px',
                            outline: 'none',
                          }}
                        >
                          <option value="" style={{ backgroundColor: '#1B1B1E', color: '#fff' }}>Selecione o serviço</option>
                          {SERVICOS.map(servico => (
                            <option key={servico} value={servico} style={{ backgroundColor: '#1B1B1E', color: '#fff' }}>{servico}</option>
                          ))}
                        </select>
                      ) : (
                        field('title', 'Serviço: *', 'Selecione o serviço')
                      )}
                    </View>

                    {/* AUTOCOMPLETE DE IDIOMAS COM CONTEXTO DE EMPILHAMENTO Z-INDEX CORRIGIDO */}
                    <View style={[s.formRow, { zIndex: 99, elevation: 99 }, width < 600 && { flexDirection: 'column' }]}>
                      <LanguageSelect
                        label="Tradução de: *"
                        placeholder="Digite o idioma"
                        value={data.source}
                        onChange={(val) => change('source', val)}
                        error={invalid.includes('source')}
                      />
                      <LanguageSelect
                        label="Tradução para: *"
                        placeholder="Digite o idioma"
                        value={data.target}
                        onChange={(val) => change('target', val)}
                        error={invalid.includes('target')}
                      />
                    </View>

                    {field('message', 'Observações gerais', 'Observações gerais', true)}

                    <View style={{ marginTop: 12, marginBottom: 20, gap: 12 }}>
                      <Txt style={[common.caption, { lineHeight: 20 }]}>
                        Adicione o(s) seu(s) arquivo(s) (Max. 25MB) | Para o envio de arquivos acima de 25MB, favor enviar sua solicitação através do endereço de e-mail <Txt style={{ color: colors.accent }}>atendimento@EchoRing.com.br</Txt>
                      </Txt>

                      <Button variant="secondary" icon={Upload} disabled={uploading} onPress={attach} style={{ alignSelf: 'flex-start' }}>
                        {uploading ? 'Carregando…' : 'Selecionar arquivos'}
                      </Button>

                      {data.attachments.map(file => (
                        <View key={file.name} style={s.fileRow}>
                          <View style={s.fileIcon}><FileText size={20} color={colors.accent} /></View>
                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '500' }}>{file.name}</Txt>
                            <Txt style={common.caption}>{Math.ceil(file.size / 1024)} KB · Pronto para análise</Txt>
                          </View>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${file.name}`} onPress={() => setData(current => ({ ...current, attachments: current.attachments.filter(item => item !== file) }))} style={{ padding: 12 }}>
                            <X size={16} color={colors.muted} />
                          </Pressable>
                        </View>
                      ))}
                    </View>

                    <View style={s.consentRow}>
                      <Pressable disabled={busy} accessibilityRole="checkbox" accessibilityLabel="Eu concordo em receber comunicações por e-mail." aria-checked={data.consent} accessibilityState={{ checked: data.consent }} onPress={() => change('consent', !data.consent)} style={[s.consentCheck, data.consent && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                        {data.consent && <Check size={15} color={colors.canvas} strokeWidth={3} />}
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Txt style={common.caption}>Eu concordo em receber comunicações por e-mail.</Txt>
                      </View>
                    </View>

                    <Txt style={[common.caption, { marginBottom: 16 }]}>
                      Ao enviar seus dados, você concorda com a nossa{' '}
                      <Txt onPress={() => setPrivacy(true)} style={{ color: colors.accent, textDecorationLine: 'underline' }}>
                        Política de Segurança
                      </Txt>.
                    </Txt>
                  </View>

                  {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}

                  <View style={{ marginTop: 12 }}>
                    <Button icon={Send} onPress={submit} loading={busy}>
                      ENVIAR
                    </Button>
                  </View>
                </>
              )}
            </View>
          </View>

          <View testID="landing-faq" style={s.faqSection}>
            <Txt accessibilityRole="header" style={[s.sectionTitle, mobile && s.sectionTitleSmall]}>Antes do primeiro olá.</Txt>
            {[
              ['Como é calculado o orçamento?', 'A proposta considera os idiomas, o tipo de conteúdo, o volume e o prazo. Nossa equipe analisa a solicitação antes de informar o valor.'],
              ['Preciso anexar o documento agora?', 'Você pode começar descrevendo o projeto. Para um orçamento mais preciso, anexe o material ou informe o número de páginas e palavras.'],
              ['E se meu idioma não estiver na página?', 'Informe o idioma de origem e de destino no formulário. A equipe verifica a disponibilidade e retorna por e-mail.'],
            ].map(([question, answer], index) => (
              <View key={question} style={s.faq}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: faq === index }} aria-expanded={faq === index} onPress={() => setFaq(faq === index ? null : index)} style={s.faqQuestion}>
                  <Txt style={s.faqTitle}>{question}</Txt>
                  {faq === index ? <X size={19} color={colors.accent} /> : <Plus size={19} color={colors.accent} />}
                </Pressable>
                {faq === index && <Txt style={s.faqAnswer}>{answer}</Txt>}
              </View>
            ))}
          </View>

          <View style={[s.footer, mobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Brand />
            <View style={s.footerLinks}>
              <Pressable onPress={() => go('services')}><Txt style={s.footerLink}>Serviços</Txt></Pressable>
              <Pressable onPress={() => go('languages')}><Txt style={s.footerLink}>Idiomas</Txt></Pressable>
              <Pressable onPress={() => go('process')}><Txt style={s.footerLink}>Sobre</Txt></Pressable>
              <Pressable onPress={() => go('quote')}><Txt style={s.footerLink}>Contato</Txt></Pressable>
            </View>
            <Txt style={{ fontSize: 12, color: colors.muted }}>© {new Date().getFullYear()} Echo Ring</Txt>
          </View>
        </View>
      </ScrollView>
      <Dialog open={privacy} onClose={() => setPrivacy(false)} title="Seus dados, com propósito">
        <Txt>Nome, e-mail, informações do projeto e documentos são usados para avaliar o pedido e responder sobre o orçamento.</Txt>
        <Txt style={common.caption}>{apiMode ? 'A solicitação é armazenada no servidor e consultada pela equipe autorizada. Os documentos não são publicados no site nem anexados automaticamente ao e-mail de orçamento.' : 'Nesta prévia, os dados ficam apenas no armazenamento deste navegador. Use documentos fictícios. Você pode removê-los limpando os dados do site.'}</Txt>
        <Txt style={common.caption}>O consentimento não autoriza campanhas de marketing. Não inclua senhas ou informações que não sejam necessárias à tradução.</Txt>
        <Button variant="secondary" onPress={() => setPrivacy(false)}>Entendi</Button>
      </Dialog>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  header: { height: 108, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  companyBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerLinks: { flexDirection: 'row', alignItems: 'center', gap: 34 },
  navLink: { fontSize: 15, color: colors.muted },
  portal: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 18, minHeight: 44, backgroundColor: colors.surface },
  portalText: { fontSize: 13, fontWeight: '500' },
  hero: { minHeight: 680, justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 56, paddingVertical: 80, backgroundColor: '#070707' },
  heroMobile: { minHeight: 600, paddingHorizontal: 22, paddingVertical: 56, justifyContent: 'flex-start' },
  heroImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 2 },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.16)' },
  heroCopy: { width: '100%', maxWidth: 610, zIndex: 1 },
  heroTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  heroTagText: { fontSize: 13, letterSpacing: 6, color: '#B4AFB3', fontWeight: '500' },
  heroTitle: { fontSize: 82, lineHeight: 88, fontWeight: '700', letterSpacing: -3.4 },
  heroDescription: { fontSize: 21, lineHeight: 31, color: '#B5B1B4', maxWidth: 520, marginTop: 24 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 22, marginTop: 34 },
  discover: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  heroKeywords: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 92 },
  heroKeyword: { fontSize: 10, letterSpacing: 3, color: '#AAA3A8' },
  keywordRule: { width: 32, height: 1, backgroundColor: '#64575D' },
  section: { paddingVertical: 88, paddingHorizontal: 16 },
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 4, fontWeight: '600', color: colors.accent, marginBottom: 18 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 36 },
  sectionTitle: { fontSize: 54, lineHeight: 58, letterSpacing: -2, fontWeight: '700' },
  sectionTitleSmall: { fontSize: 37, lineHeight: 42, letterSpacing: -1.2 },
  sectionDescription: { maxWidth: 440, fontSize: 18, lineHeight: 28, color: colors.muted },
  services: { flexDirection: 'row', gap: 14 },
  service: { flex: 1, minHeight: 250, padding: 26, borderRadius: 18, backgroundColor: '#101011', borderWidth: 1, borderColor: colors.line },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  serviceIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#211218', borderWidth: 1, borderColor: '#3F202A' },
  serviceTitle: { fontSize: 21, lineHeight: 27, fontWeight: '600', marginBottom: 12, letterSpacing: -0.4 },
  serviceText: { fontSize: 15, lineHeight: 23, color: colors.muted },
  serviceBottom: { flex: 1, minHeight: 46, marginTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'end' },
  serviceArrow: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#5D5559', alignItems: 'center', justifyContent: 'center' },
  languagesSection: { flexDirection: 'row', alignItems: 'center', gap: 54, paddingHorizontal: 16, paddingVertical: 76, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  languagesCopy: { flex: 0.8, minWidth: 280 },
  languageGrid: { flex: 1.2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 },
  language: { minWidth: 82, alignItems: 'center', gap: 9 },
  languageName: { fontSize: 14, color: colors.ink },
  steps: { flexDirection: 'row', gap: 40, marginTop: 42 },
  step: { flex: 1 },
  stepLine: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  stepNumber: { color: colors.accent, fontSize: 22, fontWeight: '600' },
  stepRule: { flex: 1, height: 1, backgroundColor: colors.line },
  stepTitle: { fontSize: 22, fontWeight: '600', lineHeight: 30, marginBottom: 10 },
  stepText: { fontSize: 15, lineHeight: 24, color: colors.muted, maxWidth: 320 },
  quoteSection: { flexDirection: 'row', alignItems: 'center', gap: 56, paddingHorizontal: 16, paddingVertical: 96, borderTopWidth: 1, borderTopColor: colors.line },
  quoteIntro: { flex: 1, width: '100%', maxWidth: 590, alignItems: 'flex-start', gap: 15 },
  quoteAccent: { width: 42, height: 3, backgroundColor: colors.accent, marginBottom: 3 },
  quoteTagText: { fontSize: 11, letterSpacing: 4, color: '#B6AFB3' },
  quoteTitle: { fontSize: 58, lineHeight: 62, letterSpacing: -2, fontWeight: '700' },
  quoteDescription: { fontSize: 18, lineHeight: 27, color: colors.muted, maxWidth: 520 },
  quoteBenefits: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 24 },
  quoteBenefit: { flex: 1, minWidth: 140, gap: 7 },
  benefitIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#211218', borderWidth: 1, borderColor: '#3F202A', alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  benefitTitle: { fontSize: 15, fontWeight: '600' },
  benefitText: { fontSize: 13, lineHeight: 20, color: colors.muted },
  form: { width: '54%', maxWidth: 680, backgroundColor: '#111112', borderWidth: 1, borderColor: '#34272C', borderRadius: 18, padding: 32 },
  formTitle: { fontSize: 27, lineHeight: 34, fontWeight: '600', letterSpacing: -0.6 },
  formStage: { minHeight: 280 },
  formRow: { flexDirection: 'row', gap: 16 },
  field: { flex: 1, minWidth: 0, gap: 8, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  input: { minHeight: 48, borderRadius: 12, backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#353539', fontFamily: font, color: colors.ink, fontSize: 15, paddingHorizontal: 15 },
  textarea: { minHeight: 94, paddingTop: 13, paddingBottom: 13, textAlignVertical: 'top' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 15, marginTop: 12 },
  fileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginTop: 4, marginBottom: 14 },
  consentCheck: { width: 24, height: 24, marginTop: 2, borderWidth: 1, borderColor: colors.muted, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  error: { color: colors.red, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  receipt: { gap: 22, paddingVertical: 20 },
  receiptTitle: { fontSize: 30, lineHeight: 37, fontWeight: '600', letterSpacing: -0.7 },
  receiptCode: { backgroundColor: colors.canvas, padding: 18, borderRadius: 16, gap: 8 },
  faqSection: { paddingVertical: 64, maxWidth: 850, width: '100%', alignSelf: 'center' },
  faq: { borderBottomWidth: 1, borderBottomColor: colors.line },
  faqQuestion: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  faqTitle: { fontSize: 18, lineHeight: 25, flex: 1 },
  faqAnswer: { fontSize: 15, lineHeight: 25, color: colors.muted, marginBottom: 26, paddingRight: 30 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 28, marginTop: 34, paddingHorizontal: 16, paddingVertical: 42, borderTopWidth: 1, borderTopColor: colors.line },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 },
  footerLink: { fontSize: 14, color: colors.muted },
  dropdownList: { position: 'absolute', top: 78, left: 0, right: 0, backgroundColor: '#1B1B1E', borderWidth: 1, borderColor: '#353539', borderRadius: 12, zIndex: 9999, elevation: 10, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#28282C' },
});