export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
export const offerLabels: Record<OfferStatus, string> = {
  pending: 'Pendente', accepted: 'Aceita', declined: 'Recusada', expired: 'Expirada', cancelled: 'Cancelada',
};
export type Offer = {
  audience?: 'selected' | 'all';
  workflowTemplateId?: import('@/features/workflows/types').WorkflowType | null;
  eligible?: boolean;
  id: string; requestId: string; title: string; source: string; target: string; service: string;
  compensation: string; currency: 'BRL'; deadline: string; expiresAt: string;
  description: string; requirements: string; volume: string; status: OfferStatus;
  createdAt: string; decidedAt: string | null; serviceId: string | null;
  attachments: { name: string; size: number }[];
  history: { status: OfferStatus; note: string; createdAt: string }[];
  translator?: { id: string; name: string; email: string };
};
export type CompatibleTranslator = { id: string; name: string; email: string;
  languages?: { name: string; level: string }[] };
export type OfferTerms = {
  audience?: 'selected' | 'all';
  workflowTemplateId?: import('@/features/workflows/types').WorkflowType;
  translatorIds: string[]; compensation: string; deadline: string; expiresAt: string;
  description: string; requirements: string; volume: string;
};
export type OfferNotification = { id: number; message: string; href: string; createdAt: string; readAt: string | null };
