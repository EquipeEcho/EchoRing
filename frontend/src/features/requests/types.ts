import { type Attachment, type WorkflowEvent } from '@/types/translation';

export type Intake = {
  name: string;
  email: string;
  company: string;
  title: string;
  service: string;
  source: string;
  target: string;
  deadline: string;
  message: string;
  consent: boolean;
  attachments: Attachment[];
};

export type IntakeTextField = 'name' | 'email' | 'company' | 'title' | 'message';

export type Quote = { id?: string; amount: string; delivery: string; message: string };

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
  task?: {
    id: string;
    status: string;
    deadline: string;
    translator: { id: string; name: string; email: string };
  };
};
