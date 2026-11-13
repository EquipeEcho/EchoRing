import { type BadgeTone } from '@/components/ui/badge';
import { type RequestGroup, type RequestStatus } from '@/features/requests/types';

export const requestStatusTone: Record<RequestStatus, BadgeTone> = {
  Recebido: 'amber',
  'Em análise': 'blue',
  'Orçamento enviado': 'amber',
  'Orçamento simulado': 'neutral',
  'Orçamento aprovado': 'green',
  'Orçamento recusado': 'red',
  'Tradutor atribuído': 'blue',
  'Em andamento': 'blue',
  'Aguardando avaliação': 'amber',
  'Revisão solicitada': 'amber',
  Pronta: 'green',
  Entregue: 'green',
};

/** Same groups as `backend/app/core/request_groups.py`; keep both lists in sync. */
export const requestGroups: Record<RequestGroup, { label: string; statuses: RequestStatus[] }> = {
  pendente: { label: 'Pendente', statuses: ['Recebido'] },
  orcamento: { label: 'Em orçamento', statuses: ['Em análise', 'Orçamento enviado', 'Orçamento simulado', 'Orçamento aprovado'] },
  traducao: { label: 'Em tradução', statuses: ['Tradutor atribuído', 'Em andamento', 'Aguardando avaliação', 'Revisão solicitada'] },
  concluido: { label: 'Concluído', statuses: ['Pronta', 'Entregue'] },
  cancelado: { label: 'Cancelado', statuses: ['Orçamento recusado'] },
};

export const viewGroups: Record<'active' | 'completed', RequestGroup[]> = {
  active: ['pendente', 'orcamento', 'traducao'],
  completed: ['concluido', 'cancelado'],
};

export function isRequestGroup(value: unknown): value is RequestGroup {
  return typeof value === 'string' && value in requestGroups;
}
