import { type Attachment, type WorkflowEvent } from '@/types/translation';

export type Intake = {
  name: string;
  email: string;
  company: string;
  title: string;
  service: string;
  source: string;
  target: string;
  targets?: string[];
  deadline: string;
  message: string;
  consent: boolean;
  attachments: Attachment[];
};

export type IntakeTextField = 'name' | 'email' | 'company' | 'title' | 'message';

export type QuoteItem = { target: string; amount: string; delivery: string };
export type Quote = { id?: string; amount: string; delivery: string; message: string; items?: QuoteItem[] };
export type RequestTask = {
  id: string; status: string; deadline: string; source?: string; target?: string;
  startedAt?: string; deliveredAt?: string;
  translator: { id: string; name: string; email: string };
};
export type QuotePreview = Pick<Intake, 'title' | 'service' | 'source'> & { id: string; targets: string[]; quote: Quote };

export type RequestStatus =
  | 'Recebido'
  | 'Em análise'
  | 'Orçamento enviado'
  | 'Orçamento aprovado'
  | 'Orçamento recusado'
  | 'Tradutor atribuído'
  | 'Em andamento'
  | 'Aguardando avaliação'
  | 'Revisão solicitada'
  | 'Pronta'
  | 'Entregue'
  | 'Orçamento simulado';

export type TranslatorOption = {
  id: string;
  name: string;
  email: string;
  role: 'translator';
  active: boolean;
};

export type TranslationRequest = Intake & {
  id: string;
  createdAt: string;
  status: RequestStatus;
  quote?: Quote;
  emailSentAt?: string;
  quoteRespondedAt?: string;
  assignedAt?: string;
  history?: WorkflowEvent[];
  demo?: boolean;
  autoApproved?: boolean;
  approvedTargets?: string[];
  approvedAmount?: string;
  tasks?: RequestTask[];
  task?: RequestTask;
};
