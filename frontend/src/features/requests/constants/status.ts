import { type BadgeTone } from '@/components/ui/badge';
import { type RequestStatus } from '@/features/requests/types';

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
