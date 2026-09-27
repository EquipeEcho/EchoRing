import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { FileText, Plus } from 'lucide-react-native';
import { Dialog } from '@/components/ui/dialog';
import { Badge, Button, Txt, common } from '@/components/ui/primitives';
import { OptionSelectField, languageOptions } from '@/components/ui/selection-fields';
import { colors, font } from '@/constants/design';
import { statusTone, useWorkspace } from './data';

export function WorkspaceDialogs() {
  const { selected, setSelected, newRequest, setNewRequest, addRequest } = useWorkspace();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!newRequest) return;
    const reset = setTimeout(() => { setTitle(''); setClient(''); setSource(''); setTarget(''); setError(''); }, 0);
    return () => clearTimeout(reset);
  }, [newRequest]);
  function submit() {
    if (![title, client, source, target].every(value => value.trim())) { setError('Preencha o título, o cliente e os idiomas.'); return; }
    if (source === target) { setError('Escolha idiomas de origem e destino diferentes.'); return; }
    addRequest({ title: title.trim(), client: client.trim(), languages: `${source} → ${target}` });
  }
  return <>
    <Dialog open={!!selected} onClose={() => setSelected(null)} eyebrow={selected?.id} title="Detalhes do projeto" description="Acompanhamento operacional e responsáveis.">
      {selected && <>
        <View style={s.projectHero}><View style={s.projectIcon}><FileText size={25} color={colors.accent} /></View><View style={{ flex: 1, minWidth: 0, gap: 7 }}><Txt style={s.projectTitle}>{selected.title}</Txt><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></View></View>
        <View style={s.detailGrid}>{[['Cliente', selected.client], ['Idiomas', selected.languages], ['Responsável', selected.owner], ['Prazo', selected.deadline]].map(([label, value]) => <View key={label} style={s.detailCell}><Txt style={s.detailLabel}>{label}</Txt><Txt style={s.detailValue}>{value}</Txt></View>)}</View>
        <View style={s.progressSection}><View style={s.detailRow}><View><Txt style={s.detailLabel}>PROGRESSO DO PROJETO</Txt><Txt style={s.progressCaption}>{selected.progress === 100 ? 'Fluxo concluído' : 'Etapas em andamento'}</Txt></View><Txt style={s.progressValue}>{selected.progress}%</Txt></View><View style={s.track}><View style={[s.progress, { width: `${selected.progress}%` }]} /></View></View>
        <View style={s.demoNote}><View style={s.noteDot} /><Txt style={[common.caption, { flex: 1 }]}>Registro demonstrativo. Nenhum documento real de cliente está armazenado aqui.</Txt></View>
        <View style={s.footerActions}><Button variant="secondary" onPress={() => setSelected(null)}>Fechar detalhes</Button></View>
      </>}
    </Dialog>
    <Dialog open={newRequest} onClose={() => setNewRequest(false)} eyebrow="REGISTRO INTERNO" title="Nova requisição" description="Crie uma entrada rápida para iniciar o fluxo operacional.">
      <View style={s.formIntro}><View style={s.formIntroIcon}><Plus size={21} color={colors.amber} /></View><View style={{ flex: 1, gap: 4 }}><Badge tone="amber">Demonstração</Badge><Txt style={common.caption}>O registro ficará disponível apenas durante esta sessão e não será enviado à empresa.</Txt></View></View>
      <View style={s.formFields}>{[{ number: '01', label: 'Título do projeto', value: title, set: setTitle, placeholder: 'Ex.: Tradução de contrato' }, { number: '02', label: 'Cliente', value: client, set: setClient, placeholder: 'Nome do cliente ou empresa' }].map(field => <View key={field.label} style={s.field}><View style={s.fieldHeading}><Txt style={s.fieldNumber}>{field.number}</Txt><Txt style={s.label}>{field.label}</Txt></View><TextInput accessibilityLabel={field.label} style={s.input} placeholder={field.placeholder} placeholderTextColor={colors.muted} value={field.value} onChangeText={field.set} maxLength={120} /></View>)}
        <View style={s.languageFields}><OptionSelectField prefix="03" label="Idioma de origem" value={source} onChange={setSource} options={languageOptions} dialogTitle="Idioma de origem" description="Selecione o idioma atual do material." /><OptionSelectField prefix="04" label="Idioma de destino" value={target} onChange={setTarget} options={languageOptions} dialogTitle="Idioma de destino" description="Selecione o idioma da entrega." /></View>
      </View>
      {!!error && <Txt accessibilityRole="alert" style={{ color: colors.red, fontSize: 12 }}>{error}</Txt>}
      <View style={s.footerActions}><Button variant="ghost" onPress={() => setNewRequest(false)}>Cancelar</Button><Button onPress={submit} icon={Plus}>Criar requisição</Button></View>
    </Dialog>
  </>;
}
const s = StyleSheet.create({
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, alignItems: 'center' },
  projectHero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: colors.line }, projectIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, projectTitle: { fontSize: 22, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.line }, detailCell: { width: '50%', minHeight: 86, gap: 5, justifyContent: 'center', padding: 15, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, detailLabel: { fontSize: 9, lineHeight: 15, letterSpacing: 1.5, color: colors.muted, fontWeight: '600' }, detailValue: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  progressSection: { gap: 14, paddingVertical: 4 }, progressCaption: { marginTop: 3, fontSize: 13, color: colors.muted }, progressValue: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.accent }, track: { height: 7, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' }, progress: { height: 7, backgroundColor: colors.accent, borderRadius: 4 },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.amber },
  formIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, backgroundColor: colors.amberSoft, borderLeftWidth: 3, borderLeftColor: colors.amber }, formIntroIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#6A5126' },
  formFields: { gap: 20 }, field: { gap: 9 }, fieldHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, fieldNumber: { fontSize: 9, letterSpacing: 1.3, color: colors.accent, fontWeight: '600' }, label: { fontSize: 13, fontWeight: '600' }, input: { minHeight: 52, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#38383D', borderRadius: 12, paddingHorizontal: 16, fontFamily: font, fontSize: 15, color: colors.ink, outlineWidth: 0 }, languageFields: { gap: 2 },
  footerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, paddingTop: 4 },
});
