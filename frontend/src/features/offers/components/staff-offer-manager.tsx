import { RefreshCw, Send } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateSelectField } from '@/components/ui/fields/date-select-field';
import { OptionSelectField } from '@/components/ui/fields/option-select-field';
import { Txt } from '@/components/ui/text';
import { cancelOffer, compatibleTranslators, listRequestOffers, sendOffers } from '@/features/offers/services/offer-service';
import { useOfferStyles } from '@/features/offers/styles/offers.styles';
import { type CompatibleTranslator, type Offer, offerLabels } from '@/features/offers/types';
import { type TranslationRequest } from '@/features/requests/types';
import { useTheme } from '@/theme/theme-context';
import { money } from '@/utils/formatters';
import { currencyInputFromDecimal, currencyToDecimal, formatCurrencyInput } from '@/utils/input-formatters';
import { workflowTemplates } from '@/features/workflows/data/workflow-templates';

export function StaffOfferManager({ request, token, onChanged }: {
  request: TranslationRequest; token: string; onChanged: () => void;
}) {
  const s = useOfferStyles();
  const { colors } = useTheme();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [translators, setTranslators] = useState<CompatibleTranslator[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [audience, setAudience] = useState<'selected' | 'all'>('selected');
  const [workflowTitle, setWorkflowTitle] = useState(workflowTemplates[0].title);
  const [compensation, setCompensation] = useState('');
  const [deadline, setDeadline] = useState(/^\d{4}-\d{2}-\d{2}$/.test(request.quote?.delivery || '') ? request.quote!.delivery : '');
  const [hours, setHours] = useState('48');
  const [volume, setVolume] = useState('');
  const [description, setDescription] = useState(request.message);
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const requestRef = useRef(request);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { requestRef.current = request; onChangedRef.current = onChanged; }, [request, onChanged]);
  const refresh = useCallback(async () => {
    try {
      const [history, candidates] = await Promise.all([
        listRequestOffers(request.id, token), compatibleTranslators(request.id, token),
      ]);
      setOffers(history); setTranslators(candidates);
      if (history.some(offer => offer.status === 'accepted') && !requestRef.current.task) onChangedRef.current();
    } catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [request.id, token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 30000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);
  const assigned = !!request.task || offers.some(offer => offer.status === 'accepted');
  const canSend = request.status === 'Orçamento aprovado' && !assigned;
  const pendingIds = new Set(offers.filter(offer => offer.status === 'pending').map(offer => offer.translator!.id));
  function prepare() {
    setError(''); setNotice('');
    if ((audience === 'selected' && !recipients.length) || !currencyToDecimal(compensation) || Number(currencyToDecimal(compensation)) <= 0 ||
        !deadline || !description.trim() || !volume.trim() || !/^\d+$/.test(hours) || Number(hours) < 1 || Number(hours) > 720) {
      setError('Selecione tradutores e informe remuneração positiva, prazo, volume, descrição e validade de 1 a 720 horas.'); return;
    }
    setReview(true);
  }
  async function send() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await sendOffers(request.id, {
        translatorIds: audience === 'all' ? [] : recipients, audience,
        workflowTemplateId: workflowTemplates.find(template => template.title === workflowTitle)!.id,
        compensation: currencyToDecimal(compensation), deadline,
        expiresAt: new Date(Date.now() + Number(hours) * 3600000).toISOString(),
        description: description.trim(), requirements: requirements.trim(), volume: volume.trim(),
      }, token);
      setReview(false); setRecipients([]); setNotice('Ofertas enviadas. Os tradutores foram notificados no portal.');
      await refresh(); onChangedRef.current();
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!cancelId || busy) return;
    setBusy(true); setError('');
    try {
      await cancelOffer(cancelId, token); setCancelId(null); setNotice('Oferta cancelada. Você pode disponibilizar o trabalho novamente.');
      await refresh(); onChangedRef.current();
    } catch (failure) { setError((failure as Error).message); await refresh(); }
    finally { setBusy(false); }
  }
  function reuse(offer: Offer) {
    setAudience('selected');
    setWorkflowTitle(workflowTemplates.find(template => template.id === offer.workflowTemplateId)?.title || workflowTemplates[0].title);
    setRecipients([offer.translator!.id]); setCompensation(currencyInputFromDecimal(offer.compensation)); setDeadline(offer.deadline);
    setVolume(offer.volume); setDescription(offer.description); setRequirements(offer.requirements);
    setReview(false); setNotice('Condições recuperadas. Confira os dados e envie uma nova oferta.');
  }
  const field = (label: string, value: string, change: (text: string) => void, multiline = false, numeric = false, currency = false) =>
    <View><Txt style={s.label}>{label}</Txt><TextInput accessibilityLabel={label} value={value} onChangeText={change}
      editable={!busy && !review} style={[s.input, multiline && { minHeight: 88, textAlignVertical: 'top' }]}
      placeholderTextColor={colors.muted} multiline={multiline} maxLength={multiline ? 3000 : 160}
      onBlur={currency ? () => change(currencyInputFromDecimal(value)) : undefined}
      keyboardType={numeric ? currency ? 'decimal-pad' : 'number-pad' : 'default'} /></View>;
  return <View style={s.divider}>
    <View style={s.row}><Txt style={[s.title, { flex: 1 }]}>Ofertas de trabalho</Txt>
      <Button variant="ghost" icon={RefreshCw} disabled={busy} onPress={() => void refresh()}>Atualizar ofertas</Button></View>
    <Txt style={s.caption}>Defina a remuneração do profissional. O primeiro aceite válido cria a tarefa e encerra os demais convites.</Txt>
    {loading && <ActivityIndicator accessibilityLabel="Carregando ofertas" color={colors.accent} />}
    {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
    {!!notice && <Txt accessibilityLiveRegion="polite" style={s.notice}>{notice}</Txt>}
    {request.task?.id && <Button variant="secondary" onPress={() => router.push({ pathname: '/workflows', params: { task: request.task!.id } })}>Acompanhar workflow do trabalho</Button>}
    {canSend && !loading && <View style={s.stack}>
      <OptionSelectField compact label="Visibilidade da oportunidade" value={audience === 'all' ? 'Todos os tradutores' : 'Selecionar tradutores compatíveis'}
        options={['Selecionar tradutores compatíveis', 'Todos os tradutores']} disabled={busy || review}
        onChange={value => { setAudience(value === 'Todos os tradutores' ? 'all' : 'selected'); setRecipients([]); }} />
      {audience === 'all' ? <Txt style={s.caption}>A oportunidade será enviada a todos os tradutores ativos com cadastro concluído neste momento. Quem já recebeu um convite pendente não receberá outro. O aceite exige o par {request.source} → {request.target} no perfil.</Txt> : <>
      <Txt style={s.label}>Tradutores compatíveis · {request.source} → {request.target}</Txt>
      {!translators.length && <Txt style={s.caption}>Nenhum tradutor ativo possui os dois idiomas deste trabalho cadastrados. Atualize os cadastros profissionais para enviar ofertas.</Txt>}
      {translators.map(translator => <Pressable key={translator.id} accessibilityRole="checkbox" aria-checked={recipients.includes(translator.id)}
        accessibilityLabel={`Oferecer para ${translator.name}`} accessibilityState={{ checked: recipients.includes(translator.id), disabled: busy || review || pendingIds.has(translator.id) }}
        disabled={busy || review || pendingIds.has(translator.id)} onPress={() => setRecipients(current => current.includes(translator.id) ? current.filter(id => id !== translator.id) : [...current, translator.id])}
        style={[s.recipient, recipients.includes(translator.id) && s.active]}>
        <Txt>{recipients.includes(translator.id) ? '✓ ' : ''}{translator.name}</Txt><Txt style={s.caption}>{translator.email}{pendingIds.has(translator.id) ? ' · Oferta pendente' : ''}</Txt>
        {!!translator.languages?.length && <Txt style={s.caption}>Idiomas: {translator.languages.map(language => `${language.name} (${language.level})`).join(' · ')}</Txt>}
      </Pressable>)}
      </>}
      <OptionSelectField compact label="Workflow do trabalho" value={workflowTitle} options={workflowTemplates.map(template => template.title)}
        onChange={setWorkflowTitle} disabled={busy || review} />
      <Txt style={s.caption}>O processo será vinculado à tarefa assim que o tradutor aceitar. Responsáveis e etapas podem ser acompanhados na aba Workflows.</Txt>
      {field('Remuneração do tradutor (R$)', compensation, value => setCompensation(formatCurrencyInput(value)), false, true, true)}
      <Txt style={s.caption}>O tradutor recebe apenas este valor; o preço do orçamento pertence à gestão do cliente.</Txt>
      <DateSelectField compact label="Prazo do trabalho" value={deadline} onChange={setDeadline} disabled={busy || review} />
      {field('Validade da oferta (horas)', hours, value => setHours(value.replace(/\D/g, '').slice(0, 3)), false, true)}
      {field('Volume do trabalho', volume, setVolume)}
      {field('Descrição do trabalho', description, setDescription, true)}
      {field('Requisitos do trabalho', requirements, setRequirements, true)}
      {review ? <View style={s.card}>
        <Txt style={s.title}>Conferir envio</Txt>
        <Txt>{audience === 'all' ? 'Todos os tradutores ativos' : `${recipients.length} tradutor(es)`} · {money(compensation)} por trabalho</Txt>
        <Txt style={s.caption}>Workflow: {workflowTitle}</Txt>
        <Txt style={s.caption}>Validade: {hours} horas. O aceite de um profissional encerra os demais convites.</Txt>
        <Button loading={busy} icon={Send} onPress={() => void send()}>Confirmar envio das ofertas</Button>
        <Button variant="ghost" disabled={busy} onPress={() => setReview(false)}>Editar condições</Button>
      </View> : <Button icon={Send} disabled={(audience === 'selected' && !translators.length) || busy} onPress={prepare}>Revisar ofertas</Button>}
    </View>}
    {!loading && !offers.length && <Txt style={s.caption}>Ainda não foram enviadas ofertas para este orçamento.</Txt>}
    {offers.map(offer => <View key={offer.id} style={s.card}>
      <View style={s.row}><Txt style={{ flex: 1, fontWeight: '600' }}>{offer.translator?.name}</Txt>
        <Badge tone={offer.status === 'accepted' ? 'green' : offer.status === 'pending' ? 'blue' : 'neutral'}>{offerLabels[offer.status]}</Badge></View>
      <Txt>{money(offer.compensation)} · {offer.volume}</Txt>
      {offer.audience === 'all' && <Txt style={s.caption}>Publicação para todos os tradutores</Txt>}
      {offer.workflowTemplateId && <Txt style={s.caption}>Workflow: {workflowTemplates.find(template => template.id === offer.workflowTemplateId)?.title}</Txt>}
      <Txt style={s.caption}>Prazo: {offer.deadline} · Validade: {new Date(offer.expiresAt).toLocaleString('pt-BR')}</Txt>
      {offer.status === 'accepted' && <Txt style={s.notice}>Responsável: {offer.translator?.name} · Tarefa {offer.serviceId}</Txt>}
      {offer.history.map((event, index) => <Txt key={index} style={s.caption}>{offerLabels[event.status]} · {new Date(event.createdAt).toLocaleString('pt-BR')}{event.note ? ` · ${event.note}` : ''}</Txt>)}
      {offer.status === 'pending' && <Button variant="secondary" disabled={busy} onPress={() => setCancelId(offer.id)}>Cancelar oferta para {offer.translator?.name}</Button>}
      {canSend && ['declined', 'expired', 'cancelled'].includes(offer.status) && !pendingIds.has(offer.translator!.id) && translators.some(item => item.id === offer.translator!.id) &&
        <Button variant="secondary" disabled={busy} onPress={() => reuse(offer)}>Preparar reenvio para {offer.translator?.name}</Button>}
      {cancelId === offer.id && <View style={s.stack}><Txt>Cancelar este convite? O tradutor perderá a possibilidade de aceitá-lo.</Txt>
        <Button loading={busy} onPress={() => void cancel()}>Confirmar cancelamento da oferta</Button>
        <Button variant="ghost" disabled={busy} onPress={() => setCancelId(null)}>Manter oferta</Button></View>}
    </View>)}
  </View>;
}
