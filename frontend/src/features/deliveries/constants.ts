import { type ServiceStatus } from '@/features/deliveries/types';

export const statusTone: Record<ServiceStatus, 'blue' | 'green' | 'amber' | 'neutral'> = {
  'Tradutor atribuído': 'blue',
  'Em andamento': 'blue',
  'Aguardando avaliação': 'amber',
  'Revisão solicitada': 'amber',
  Pronta: 'green',
  Entregue: 'green',
};
