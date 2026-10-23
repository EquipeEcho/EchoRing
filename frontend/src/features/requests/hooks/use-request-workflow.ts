import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { currencyInputFromDecimal, currencyToDecimal } from '@/utils/input-formatters';

import { useSession } from '@/features/auth/contexts/session-context';
import { emptyQuote } from '@/features/requests/constants/quote';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import {
  getRequest,
  sendQuote,
  updateRequest,
} from '@/features/requests/services/request-service';
import {
  type Quote,
  type TranslationRequest,
} from '@/features/requests/types';

export function useRequestWorkflow() {
  const params = useLocalSearchParams<{ id?: string; view?: string; status?: string; search?: string }>();
  const requestId = params.id;
  const [detailRevision, setDetailRevision] = useState(0);
  const reloadDetail = () => setDetailRevision(current => current + 1);
  const { session } = useSession();
  const token = session?.token;
  const { requests, loading, error: loadError, refresh } = useInbox();
  const view = params.view === 'completed' ? 'completed' : 'active';
  const setView = (view: 'active' | 'completed') => router.setParams({ view, status: 'Todos' });
  const filter = params.status || 'Todos';
  const setFilter = (status: string) => router.setParams({ status });
  const search = params.search || '';
  const setSearch = (search: string) => router.setParams({ search });
  const [record, setSelected] = useState<TranslationRequest | null>(null);
  const selected = record?.id === requestId ? record : null;
  const [detailLoading, setDetailLoading] = useState(!!requestId);
  const [quote, setQuote] = useState<Quote>({ ...emptyQuote });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const locked = !!selected && !['Recebido', 'Em análise'].includes(selected.status);
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const completedStatuses = ['Pronta', 'Entregue', 'Orçamento recusado'];
  const activeRequests = requests.filter((item) => !completedStatuses.includes(item.status));
  const completedRequests = requests.filter((item) => completedStatuses.includes(item.status));
  const scopedRequests = view === 'active' ? activeRequests : completedRequests;
  const visible = scopedRequests.filter(
    (item) =>
      (filter === 'Todos' || item.status === filter) &&
      normalize(item.title + item.name + item.email + item.id).includes(normalize(search)),
  );
  const statusFilters =
    view === 'completed'
      ? ['Todos', 'Pronta', 'Entregue', 'Orçamento recusado']
      : [
          'Todos',
          'Recebido',
          'Em análise',
          token ? 'Orçamento enviado' : 'Orçamento simulado',
          ...(token ? ['Orçamento aprovado', 'Tradutor atribuído', 'Aguardando avaliação'] : []),
        ];
  const listHref = { pathname: '/solicitacoes' as const, params: { view, status: filter, search } };
  function open(request: TranslationRequest) {
    router.push({ pathname: '/solicitacoes/[id]', params: { id: request.id, view, status: filter, search } });
  }
  useEffect(() => {
    if (!requestId) return;
    let active = true;
    const initial = setTimeout(async () => {
      setDetailLoading(true); setError(''); setNotice(''); setConfirm(false);
      try {
        const detail = await getRequest(requestId, token);
        if (!active) return;
        setSelected(detail);
        setQuote(detail.quote ? { ...detail.quote, amount: currencyInputFromDecimal(detail.quote.amount) } : { ...emptyQuote });
      } catch (failure) {
        if (active) setError((failure as Error).message);
      } finally {
        if (active) setDetailLoading(false);
      }
    }, 0);
    return () => { active = false; clearTimeout(initial); };
  }, [requestId, token, detailRevision]);
  async function analyze() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      setSelected(await updateRequest(selected.id, { status: 'Em análise' }, token));
      await refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(): Promise<boolean> {
    if (!selected || busy) return false;
    if (
      !currencyToDecimal(quote.amount) ||
      Number(currencyToDecimal(quote.amount)) <= 0 ||
      Number(currencyToDecimal(quote.amount)) >= 100000000 ||
      !quote.delivery.trim()
    ) {
      setError('Informe um valor positivo e o prazo de entrega.');
      return false;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setSelected(
        await updateRequest(
          selected.id,
          {
            quote: {
              amount: currencyToDecimal(quote.amount),
              delivery: quote.delivery.trim(),
              message: quote.message.trim(),
            },
          },
          token,
        ),
      );
      setNotice('Rascunho salvo. O e-mail ainda não foi enviado.');
      await refresh();
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    if (await save()) setConfirm(true);
  }
  async function send() {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = token
        ? await sendQuote(selected.id, token)
        : await updateRequest(selected.id, { status: 'Orçamento simulado' });
      setSelected(result);
      setConfirm(false);
      setNotice(
        result.autoApproved
          ? 'Orçamento aprovado automaticamente para teste. Nenhum e-mail foi enviado.'
          : token
            ? 'Orçamento aceito pelo provedor de e-mail para envio ao cliente.'
            : 'Envio simulado. Nenhum e-mail foi enviado ao cliente.',
      );
      await refresh();
    } catch (failure) {
      setConfirm(false);
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (!busy) router.replace(listHref);
  }
  return {
    requestId, detailLoading, reloadDetail, listHref,
    loading,
    refresh,
    requests,
    token,
    view,
    setView,
    setFilter,
    activeRequests,
    completedRequests,
    search,
    setSearch,
    statusFilters,
    filter,
    loadError,
    error,
    selected,
    visible,
    busy,
    open,
    scopedRequests,
    confirm,
    setConfirm,
    close,
    locked,
    analyze,
    quote,
    setQuote,
    setNotice,
    notice,
    save,
    prepare,
    send,
  };
}
