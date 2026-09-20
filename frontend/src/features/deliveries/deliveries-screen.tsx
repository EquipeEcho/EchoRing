import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AlertCircle, CheckCircle2, Clock3, FileCheck2, FileText, RefreshCw, UploadCloud } from 'lucide-react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Badge, Button, EmptyState, PageHeading, Txt, common } from '@/components/ui/primitives';
import { colors } from '@/constants/design';
import { useSession } from '@/features/auth/session';
import { formatBytes, getAssignedServices, selectTranslationDocument, uploadTranslation, type ServiceStatus, type TranslationService } from './service';

const statusTone: Record<ServiceStatus, 'blue' | 'green' | 'amber' | 'neutral'> = {
  'Em tradução': 'blue', 'Em revisão': 'green', 'Ajuste solicitado': 'amber', Aprovado: 'neutral',
};

export function DeliveriesScreen() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const token = session?.token;
  const [services, setServices] = useState<TranslationService[]>([]);
  const [selected, setSelected] = useState<{ serviceId: string; asset: DocumentPickerAsset } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setServices(await getAssignedServices(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(initial);
  }, [refresh]);

  async function choose(serviceId: string) {
    setError(''); setNotice('');
    try {
      const asset = await selectTranslationDocument();
      if (asset) setSelected({ serviceId, asset });
    } catch (failure) { setError((failure as Error).message); }
  }
  async function send() {
    if (!selected || !token || busy) return;
    setBusy(selected.serviceId); setError(''); setNotice('');
    try {
      const delivery = await uploadTranslation(selected.serviceId, selected.asset, token);
      setSelected(null);
      setNotice(`${delivery.name} foi enviado como versão ${delivery.version} e está em revisão.`);
      await refresh();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }

  return <ScrollView contentContainerStyle={[s.page, width < 700 && { padding: 20, paddingTop: 26 }]}>
    <View style={s.inner}>
      <PageHeading title="Entregas" subtitle="Envie a tradução concluída para a equipe revisar." action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
      {!!notice && <View style={s.notice}><CheckCircle2 size={20} color={colors.green} /><Txt accessibilityLiveRegion="polite" testID="delivery-notice" style={{ color: colors.green, flex: 1 }}>{notice}</Txt></View>}
      {!!error && <View style={s.error}><AlertCircle size={20} color={colors.red} /><Txt accessibilityRole="alert" style={{ color: colors.red, flex: 1 }}>{error}</Txt></View>}
      {services.map(service => {
        const available = service.status === 'Em tradução' || service.status === 'Ajuste solicitado';
        const file = selected?.serviceId === service.id ? selected.asset : null;
        return <View key={service.id} style={s.card}>
          <View style={[s.cardHeader, width < 650 && { alignItems: 'flex-start' }]}>
            <View style={s.fileIcon}><FileCheck2 size={24} color={colors.accent} /></View>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Txt style={s.title}>{service.title}</Txt><Txt style={common.caption}>{service.id}{service.requestId ? ` · ${service.requestId}` : ''}</Txt></View>
            <Badge tone={statusTone[service.status]}>{service.status}</Badge>
          </View>
          <View style={s.metadata}><View style={common.row}><Clock3 size={15} color={colors.muted} /><Txt style={common.caption}>Prazo: {service.deadline || 'Não informado'}</Txt></View><Txt style={common.caption}>{service.lastVersion ? `Última versão: ${service.lastVersion}` : 'Nenhuma entrega enviada'}</Txt></View>
          {service.status === 'Ajuste solicitado' && <View style={s.feedback}><Txt style={{ color: colors.amber, fontWeight: '600' }}>Ajuste solicitado pela equipe</Txt><Txt style={common.caption}>{service.lastFeedback || 'Revise o documento e envie uma nova versão.'}</Txt></View>}
          {file && <View style={s.selectedFile}><FileText size={20} color={colors.accent} /><View style={{ flex: 1 }}><Txt numberOfLines={1} style={{ fontWeight: '600' }}>{file.name}</Txt><Txt style={common.caption}>{formatBytes(file.size)}</Txt></View><Button variant="ghost" disabled={!!busy} onPress={() => setSelected(null)}>Remover</Button></View>}
          {available ? <View style={s.actions}><Button variant="secondary" icon={FileText} disabled={!!busy} onPress={() => void choose(service.id)}>{file ? 'Trocar documento' : 'Selecionar documento'}</Button>{file && <Button icon={UploadCloud} loading={busy === service.id} onPress={() => void send()}>Enviar para revisão</Button>}</View>
            : <Txt style={common.caption}>{service.status === 'Em revisão' ? 'A equipe está revisando a última versão enviada.' : 'Esta entrega foi aprovada e não aceita novos envios.'}</Txt>}
        </View>;
      })}
      {!services.length && !loading && !error && <EmptyState icon={UploadCloud} title="Nenhum serviço atribuído" text="Os serviços aparecem aqui depois que a equipe responsável faz a alocação do tradutor." />}
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { padding: 40, paddingTop: 28, paddingBottom: 40, flexGrow: 1 },
  inner: { width: '100%', maxWidth: 1000, alignSelf: 'center' },
  notice: { flexDirection: 'row', gap: 10, padding: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft },
  error: { flexDirection: 'row', gap: 10, padding: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.redSoft },
  card: { gap: 18, padding: 22, marginBottom: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fileIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  feedback: { gap: 6, padding: 16, borderRadius: 16, backgroundColor: colors.amberSoft, borderWidth: 1, borderColor: colors.amber },
  selectedFile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
