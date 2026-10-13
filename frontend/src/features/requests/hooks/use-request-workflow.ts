import { useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { emptyQuote } from '@/features/requests/constants/quote';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import {
  assignTranslator,
  getRequest,
  getTranslators,
  sendQuote,
  updateRequest,
} from '@/features/requests/services/request-service';
import {
  type Quote,
  type TranslationRequest,
  type TranslatorOption,
} from '@/features/requests/types';

export function useRequestWorkflow() {
  const { session } = useSession();
  const token = session?.token;
  const { requests, loading, error: loadError, refresh } = useInbox();
  const [view, setView] = useState<'active' | 'completed'>('active');
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TranslationRequest | null>(null);
  const [quote, setQuote] = useState<Quote>({ ...emptyQuote });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [translators, setTranslators] = useState<TranslatorOption[]>([]);
  const [assignment, setAssignment] = useState({
    translatorId: '',
    deadline: '',
    observations: '',
  });
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
  async function open(request: TranslationRequest) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const detail = await getRequest(request.id, token);
      const available =
        token && detail.status === 'Orçamento aprovado' ? await getTranslators(token) : [];
      setSelected(detail);
      setQuote(detail.quote ?? { ...emptyQuote });
      setTranslators(available);
      setAssignment({
        translatorId: '',
        deadline: detail.quote?.delivery || detail.deadline || '',
        observations: '',
      });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
      !/^\d{1,8}([.,]\d{1,2})?$/.test(quote.amount.trim()) ||
      Number(quote.amount.replace(',', '.')) <= 0 ||
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
              amount: quote.amount.trim(),
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
      let available: TranslatorOption[] = [];
      let translatorError = '';
      if (token && result.status === 'Orçamento aprovado') {
        try {
          available = await getTranslators(token);
        } catch (failure) {
          translatorError = `O orçamento foi aprovado, mas não foi possível carregar os tradutores: ${(failure as Error).message}`;
        }
      }
      setSelected(result);
      setTranslators(available);
      setConfirm(false);
      setAssignment((current) => ({
        ...current,
        translatorId: '',
        deadline: result.quote?.delivery || result.deadline || current.deadline,
      }));
      setNotice(
        result.autoApproved
          ? 'Orçamento aprovado automaticamente para teste. Nenhum e-mail foi enviado.'
          : token
            ? 'Orçamento aceito pelo provedor de e-mail para envio ao cliente.'
            : 'Envio simulado. Nenhum e-mail foi enviado ao cliente.',
      );
      if (translatorError) setError(translatorError);
      await refresh();
    } catch (failure) {
      setConfirm(false);
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createTask() {
    if (!selected || !token || busy) return;
    if (!assignment.translatorId || !assignment.deadline.trim()) {
      setError('Selecione o tradutor e informe o prazo da tarefa.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await assignTranslator(
        selected.id,
        {
          ...assignment,
          deadline: assignment.deadline.trim(),
          observations: assignment.observations.trim(),
        },
        token,
      );
      setSelected(await getRequest(selected.id, token));
      setNotice('Tarefa criada e disponibilizada no painel do tradutor.');
      await refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function close() {
    if (!busy) {
      setSelected(null);
      setError('');
      setNotice('');
    }
  }
  return {
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
    translators,
    assignment,
    setAssignment,
    createTask,
    send,
  };
}
