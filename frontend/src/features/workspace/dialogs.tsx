import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { FileText, Plus } from 'lucide-react-native';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Button, Txt, common } from '@/components/ui/primitives';
import { colors, font } from '@/constants/design';
import { statusTone, useWorkspace } from './data';

export function WorkspaceDialogs() {
  const { selected, setSelected, newRequest, setNewRequest, addRequest } = useWorkspace();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [languages, setLanguages] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (newRequest) { setTitle(''); setClient(''); setLanguages(''); setError(''); } }, [newRequest]);
  function submit() {
    if (![title, client, languages].every(value => value.trim())) { setError('Preencha o título, o cliente e os idiomas.'); return; }
    addRequest({ title: title.trim(), client: client.trim(), languages: languages.trim() });
  }
  return <>
    <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected?.id ?? 'Projeto'}>
      {selected && <>
        <View style={common.row}><FileText size={24} color={colors.green} /><Txt style={{ fontSize: 20, lineHeight: 27, fontWeight: '600', flex: 1 }}>{selected.title}</Txt></View>
        <Badge tone={statusTone[selected.status]}>{selected.status}</Badge>
        {[['Cliente', selected.client], ['Idiomas', selected.languages], ['Responsável', selected.owner], ['Prazo', selected.deadline]].map(([label, value]) => <View key={label} style={s.detailRow}><Txt style={common.caption}>{label}</Txt><Txt style={{ fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>{value}</Txt></View>)}
        <View style={{ gap: 8 }}><View style={s.detailRow}><Txt style={common.caption}>Progresso</Txt><Txt style={common.caption}>{selected.progress}%</Txt></View><View style={s.track}><View style={[s.progress, { width: `${selected.progress}%` }]} /></View></View>
        <Txt style={common.caption}>Registro demonstrativo. Nenhum documento de cliente está armazenado aqui.</Txt>
        <Button variant="secondary" onPress={() => setSelected(null)}>Fechar detalhes</Button>
      </>}
    </Dialog>
    <Dialog open={newRequest} onClose={() => setNewRequest(false)} title="Nova requisição">
      <Badge tone="amber">Demonstração</Badge>
      <Txt style={common.caption}>O registro ficará disponível apenas durante esta sessão, sem envio à empresa.</Txt>
      {[{ label: 'Título do projeto', value: title, set: setTitle, placeholder: 'Ex.: Tradução de contrato' }, { label: 'Cliente', value: client, set: setClient, placeholder: 'Nome do cliente ou empresa' }, { label: 'Idiomas', value: languages, set: setLanguages, placeholder: 'Ex.: Português → Inglês' }].map(field => <View key={field.label} style={{ gap: 7 }}><Txt style={s.label}>{field.label}</Txt><TextInput accessibilityLabel={field.label} style={s.input} placeholder={field.placeholder} placeholderTextColor={colors.muted} value={field.value} onChangeText={field.set} maxLength={120} /></View>)}
      {!!error && <Txt accessibilityRole="alert" style={{ color: colors.red, fontSize: 12 }}>{error}</Txt>}
      <Button onPress={submit} icon={Plus}>Criar requisição</Button>
    </Dialog>
  </>;
}
const s = StyleSheet.create({
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, alignItems: 'center' },
  track: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  progress: { height: 5, backgroundColor: colors.green, borderRadius: 3 },
  label: { fontSize: 14, fontWeight: '500' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#BDC2C7', borderRadius: 4, paddingHorizontal: 12, fontFamily: font, fontSize: 16, color: colors.ink },
});
