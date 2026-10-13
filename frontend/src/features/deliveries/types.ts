import { type Attachment, type WorkflowEvent } from '@/types/translation';

export type ServiceStatus =
  | 'Tradutor atribuído'
  | 'Em andamento'
  | 'Aguardando avaliação'
  | 'Revisão solicitada'
  | 'Pronta'
  | 'Entregue';

export type TranslationService = {
  id: string;
  requestId?: string;
  title: string;
  status: ServiceStatus;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  lastVersion: number;
  lastFeedback?: string;
  observations: string;
  source: string;
  target: string;
  clientName?: string;
  clientEmail?: string;
  company?: string;
  attachments: Attachment[];
  history: WorkflowEvent[];
  translator?: { id: string; name: string; email: string };
  lastDelivery?: {
    id: string;
    name: string;
    size: number;
    status: string;
    version: number;
    submittedAt: string;
    feedback: string;
    files?: DeliveryFile[];
  };
};

export type DeliveryFile = { index: number; name: string; mediaType: string; size: number };

export type Delivery = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  version: number;
  translatorName: string;
  name: string;
  mediaType: string;
  size: number;
  status: 'Aguardando avaliação' | 'Revisão solicitada' | 'Pronta' | 'Entregue';
  submittedAt: string;
  files?: DeliveryFile[];
  feedback?: string;
  reviewedAt?: string;
  reviewerName?: string;
};
