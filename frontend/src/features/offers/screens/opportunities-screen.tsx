import { router, useLocalSearchParams } from 'expo-router';
import { BriefcaseBusiness, Download, RefreshCw, Search } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';

import { Button } from '@/components/ui/button';
import { RecordPage } from '@/features/workspace/components/record-page';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { OfferSummary } from '@/features/offers/components/offer-summary';
import { decideOpportunity, getOpportunity, listOpportunities } from '@/features/offers/services/offer-service';
import { useOfferStyles } from '@/features/offers/styles/offers.styles';
import { type Offer, type OfferStatus, offerLabels } from '@/features/offers/types';
import { downloadProtectedDocument } from '@/lib/documents/download';
import { useTheme } from '@/theme/theme-context';
import { formatBytes } from '@/utils/formatters';

export function OpportunitiesScreen() {
  const params = useLocalSearchParams<{ id?: string; status?: string; search?: string }>();
  const offerId = params.id;
  const [detailRevision, setDetailRevision] = useState(0);
  const { session } = useSession();
  const token = session?.token;
  const s = useOfferStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const search = params.search || '';
  const setSearch = (search: string) => router.setParams({ search });
  const filter: 'all' | OfferStatus = ['all', 'pending', 'accepted', 'declined', 'expired', 'cancelled'].includes(params.status || '') ? params.status as 'all' | OfferStatus : 'pending';
  const setFilter = (status: 'all' | OfferStatus) => router.setParams({ status });
  const [record, setSelected] = useState<Offer | null>(null);
  const selected = record?.id === offerId ? record : null;
  const [detailLoading, setDetailLoading] = useState(!!offerId);
  const [confirm, setConfirm] = useState<'accept' | 'decline' | null>(null);
  const refresh = useCallback(async (showLoading = true) => {
    if (!token) { setLoading(false); return; }
    if (showLoading) setLoading(true);
    try {
      const result = await listOpportunities(token);
      setOffers(result);
      setSelected(current => current ? result.find(item => item.id === current.id) ?? null : null);
      setError('');
    } catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(false), 30000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);
  const listHref = { pathname: '/oportunidades' as const, params: { status: filter, search } };
  function open(offer: Offer) {
    router.push({ pathname: '/oportunidades/[id]', params: { id: offer.id, status: filter, search } });
  }
  useEffect(() => {
    if (!offerId) return;
    let active = true;
    const initial = setTimeout(async () => {
      setDetailLoading(true); setError(''); setNotice(''); setConfirm(null);
      try {
        if (!token) throw new Error('Entre com uma conta de tradutor para consultar este convite.');
        const detail = await getOpportunity(offerId, token);
        if (active) setSelected(detail);
      } catch (failure) { if (active) setError((failure as Error).message); }
      finally { if (active) setDetailLoading(false); }
    }, 0);
    return () => { active = false; clearTimeout(initial); };
  }, [offerId, token, detailRevision]);
  async function decide() {
    if (!selected || !confirm || !token || busy) return;
    setBusy(true); setError('');
    try {
      const result = await decideOpportunity(selected.id, confirm, token);
      setOffers(current => current.map(item => item.id === result.id ? result : item));
      setSelected(result); setConfirm(null);
      setNotice(result.status === 'accepted' ? 'Oportunidade aceita. O trabalho já está em Minhas tarefas.' : 'Oportunidade recusada. Sua decisão foi registrada.');
    } catch (failure) {
      const message = (failure as Error).message;
      await refresh(false); setConfirm(null); setError(message);
    } finally { setBusy(false); }
  }
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = offers.filter(item => (filter === 'all' || item.status === filter) &&
    normalize(`${item.title} ${item.source} ${item.target} ${item.service} ${item.id} ${item.volume}`).includes(normalize(search)));
  function close() { if (!busy) router.replace(listHref); }
  if (offerId) return <RecordPage key={offerId} title={confirm ? 'Confirmar decisão' : 'Detalhes da oportunidade'}
    eyebrow={offerId} backLabel="Voltar às oportunidades" backHref={listHref} onBack={close} busy={busy}
    loading={detailLoading} error={!selected ? error || (!detailLoading ? 'Oportunidade não encontrada.' : '') : undefined}
    onRetry={() => setDetailRevision(current => current + 1)}>
      {selected && <>
        <OfferSummary offer={selected} />
        <Txt style={s.caption}>{selected.id}</Txt>
        <View style={s.section}><Txt style={s.label}>Descrição</Txt><Txt>{selected.description}</Txt></View>
        <View style={s.section}><Txt style={s.label}>Requisitos</Txt><Txt>{selected.requirements || 'Nenhum requisito adicional.'}</Txt></View>
        {selected.attachments.map((file, index) => <View key={`${file.name}-${index}`} style={s.attachment}>
          <Txt style={[s.caption, { flex: 1 }]}>{file.name} · {formatBytes(file.size)}</Txt>
          {['pending', 'accepted'].includes(selected.status) && token && <Button variant="ghost" icon={Download}
            onPress={() => void downloadProtectedDocument(`/opportunities/${selected.id}/attachments/${index}`, file.name, token)}>Baixar</Button>}
        </View>)}
        {!!error && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
        {!!notice && <Txt accessibilityLiveRegion="polite" style={s.notice}>{notice}</Txt>}
        {selected.status === 'pending' && (confirm ? <View style={s.confirmation}>
          <Txt>{confirm === 'accept' ? 'Ao confirmar, você assume este trabalho nas condições e na remuneração acima. O primeiro aceite válido garante a atribuição.' : 'Deseja recusar este convite? A equipe será informada.'}</Txt>
          <Button loading={busy} onPress={() => void decide()}>{confirm === 'accept' ? 'Confirmar aceite' : 'Confirmar recusa'}</Button>
          <Button variant="ghost" disabled={busy} onPress={() => setConfirm(null)}>Voltar</Button>
        </View> : <View style={s.row}>
          <Button disabled={busy || selected.eligible === false} onPress={() => setConfirm('accept')}>Aceitar oportunidade</Button>
          <Button variant="secondary" disabled={busy} onPress={() => setConfirm('decline')}>Recusar oportunidade</Button>
        </View>)}
        {selected.status === 'accepted' && selected.serviceId && <Button onPress={() => {
          const task = selected.serviceId!; router.push({ pathname: '/entregas', params: { task } });
        }}>Ir para minhas tarefas</Button>}
        <View style={s.divider}><Txt style={s.label}>Histórico da oferta</Txt>
          {selected.history.map((event, index) => <Txt key={index} style={s.caption}>
            {offerLabels[event.status]} · {new Date(event.createdAt).toLocaleString('pt-BR')}{event.note ? ` · ${event.note}` : ''}
          </Txt>)}
        </View>
      </>}
  </RecordPage>;
  return <ScrollView contentContainerStyle={[s.page, width < 700 && { padding: 20 }]} keyboardShouldPersistTaps="handled">
    <PageHeading title="Oportunidades" subtitle="Convites de tradução, remuneração e histórico das suas decisões."
      action={<Button variant="secondary" icon={RefreshCw} loading={loading} onPress={() => void refresh()}>Atualizar</Button>} />
    <View style={s.toolbar}>
    <View style={s.search}>
      <Search size={18} color={colors.muted} />
      <TextInput accessibilityLabel="Buscar oportunidades" placeholder="Busque por projeto, idioma ou tipo de tradução"
        placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={s.searchInput} />
    </View>
    <View style={s.filters} role="tablist" accessibilityLabel="Status das oportunidades">
      {(['pending', 'all', 'accepted', 'declined', 'expired', 'cancelled'] as const).map(value =>
        <Pressable key={value} accessibilityRole="tab" aria-selected={filter === value} accessibilityState={{ selected: filter === value }}
          onPress={() => setFilter(value)} style={({ hovered, pressed }) => [s.filter, (hovered || pressed) && { backgroundColor: colors.surface }, filter === value && s.filterSelected]}>
          <Txt style={[s.filterText, filter === value && s.filterTextSelected]}>{value === 'all' ? 'Histórico completo' : offerLabels[value]}</Txt>
        </Pressable>)}
    </View>
    </View>
    {!!error && !selected && <Txt accessibilityRole="alert" style={s.error}>{error}</Txt>}
    {!!notice && !selected && <Txt accessibilityLiveRegion="polite" style={s.notice}>{notice}</Txt>}
    {!token && <Txt style={s.caption}>Entre com uma conta de tradutor para receber oportunidades.</Txt>}
    {loading && <ActivityIndicator accessibilityLabel="Carregando oportunidades" color={colors.accent} />}
    {!loading && !error && !visible.length && <EmptyState icon={BriefcaseBusiness} title="Nenhuma oportunidade por aqui"
      text={search || filter !== 'pending' ? 'Ajuste a busca ou os filtros para consultar seu histórico.' : 'Novos convites aparecerão aqui. A lista é atualizada automaticamente.'} />}
    <View style={s.grid}>
      {visible.map(offer => <View key={offer.id} style={[s.card, width < 700 && s.cardSmall, { width: width >= 1200 ? '48%' : '100%' }]}>
        <OfferSummary offer={offer} />
        <Button variant="secondary" disabled={busy} onPress={() => void open(offer)}>Ver oportunidade</Button>
      </View>)}
    </View>

  </ScrollView>;
}
