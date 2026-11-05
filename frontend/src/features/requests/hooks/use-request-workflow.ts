import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { currencyInputFromDecimal, currencyToDecimal } from '@/utils/input-formatters';
import { requestTargets } from '@/features/requests/utils/quote-scope';

import { useSession } from '@/features/auth/contexts/session-context';
import { emptyQuote } from '@/features/requests/constants/quote';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { useRequestList } from '@/features/requests/hooks/use-request-list';
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
  const { received } = useInbox();
  const view: 'active' | 'completed' = params.view === 'completed' ? 'completed' : 'active';
  const setView = (view: 'active' | 'completed') => router.setParams({ view, status: 'Todos' });
  const setFilter = (status: string) => router.setParams({ status });
  const search = params.search || '';
  const setSearch = (search: string) => router.setParams({ search });
  const list = useRequestList({ view, filter: params.status || 'Todos', search, token, enabled: !requestId });
  const { filter, refresh } = list;
  const [record, setSelected] = useState<TranslationRequest | null>(null);
  const selected = record?.id === requestId ? record : null;
  const [detailLoading, setDetailLoading] = useState(!!requestId);
  const [quote, setQuote] = useState<Quote>({ ...emptyQuote });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const locked = !!selected && !['Recebido', 'Em análise'].includes(selected.status);
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
        const proposal = detail.quote ? { ...detail.quote, amount: currencyInputFromDecimal(detail.quote.amount) } : { ...emptyQuote };
        if (proposal.items?.length || (requestTargets(detail).length > 1 && ['Recebido', 'Em análise'].includes(detail.status))) {
          proposal.items = requestTargets(detail).map(target => {
            const item = proposal.items?.find(item => item.target === target);
            return { target, amount: item ? currencyInputFromDecimal(item.amount) : '', delivery: item?.delivery || '' };
          });
        }
        setQuote(proposal);
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
    if (quote.items?.some(item => !currencyToDecimal(item.amount) || Number(currencyToDecimal(item.amount)) <= 0 || !item.delivery.trim())) {
      setError('Informe um valor positivo e o prazo de cada idioma.');
      return false;
    }
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
              ...(quote.items?.length ? { items: quote.items.map(item => ({ ...item, amount: currencyToDecimal(item.amount), delivery: item.delivery.trim() })) } : {}),
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
    list,
    received,
    loading: list.loading,
    refresh,
    loadError: list.error,
    token,
    view,
    setView,
    setFilter,
    search,
    setSearch,
    filter,
    error,
    selected,
    busy,
    open,
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
