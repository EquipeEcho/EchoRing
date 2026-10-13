import { type ServiceStatus } from '@/features/deliveries/types';

export const statusTone: Record<ServiceStatus, 'blue' | 'green' | 'amber' | 'neutral'> = {
  'Tradutor atribuído': 'blue',
  'Em andamento': 'blue',
  'Aguardando avaliação': 'green',
  'Revisão solicitada': 'amber',
  Pronta: 'green',
  Entregue: 'neutral',
};
