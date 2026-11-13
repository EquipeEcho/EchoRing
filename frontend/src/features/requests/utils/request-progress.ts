import { type RequestStatus, type TranslationRequest } from '@/features/requests/types';
import { requestTasks } from '@/features/requests/utils/quote-scope';

export type ProgressState = 'done' | 'current' | 'pending' | 'refused';
export type ProgressStep = { key: string; label: string; state: ProgressState; at?: string };

const steps: { key: string; label: string; statuses: RequestStatus[] }[] = [
  { key: 'solicitado', label: 'Solicitado', statuses: ['Recebido'] },
  { key: 'orcamento', label: 'Orçamento enviado', statuses: ['Orçamento enviado', 'Orçamento simulado'] },
  { key: 'aprovado', label: 'Aprovado', statuses: ['Orçamento aprovado'] },
  { key: 'traducao', label: 'Em tradução', statuses: ['Tradutor atribuído', 'Em andamento'] },
  { key: 'entregue', label: 'Entregue', statuses: ['Entregue'] },
];

/** How many steps each status has completed; the next step is the current one. */
const completedSteps: Record<RequestStatus, number> = {
  Recebido: 1,
  'Em análise': 1,
  'Orçamento enviado': 2,
  'Orçamento simulado': 2,
  'Orçamento recusado': 2,
  'Orçamento aprovado': 3,
  'Tradutor atribuído': 3,
  'Em andamento': 3,
  'Aguardando avaliação': 3,
  'Revisão solicitada': 3,
  Pronta: 4,
  Entregue: 5,
};

/** Builds the five-step tracker from the status and the timestamps already recorded in the history. */
export function requestProgress(request: TranslationRequest): ProgressStep[] {
  const completed = completedSteps[request.status] ?? 1;
  const refused = request.status === 'Orçamento recusado';
  const tasks = requestTasks(request);
  const eventAt = (statuses: string[]) => request.history?.find(event => statuses.includes(event.status))?.createdAt;
  const fallback: Record<string, string | undefined> = {
    solicitado: request.createdAt,
    orcamento: request.emailSentAt,
    aprovado: request.quoteRespondedAt,
    traducao: request.assignedAt ?? tasks.map(task => task.startedAt).filter(Boolean).sort()[0],
    entregue: tasks.map(task => task.deliveredAt).filter(Boolean).sort().at(-1),
  };
  return steps.map((step, index) => {
    const state: ProgressState = index < completed ? 'done'
      : index === completed ? refused ? 'refused' : 'current'
        : 'pending';
    const statuses = state === 'refused' ? ['Orçamento recusado'] : step.statuses;
    const at = state === 'done' || state === 'refused' ? eventAt(statuses) ?? fallback[step.key] : undefined;
    return { key: step.key, label: step.label, state, ...(at ? { at } : {}) };
  });
}
