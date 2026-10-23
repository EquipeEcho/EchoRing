export type WorkflowType = 'tep' | 'mtpe' | 'localization' | 'documentary' | 'subtitling';
export type WorkflowRole = 'translator' | 'reviewer' | 'employee';
export type StageStatus = 'completed' | 'current' | 'pending' | 'blocked';

export type WorkflowStage = {
  id: string;
  title: string;
  role: WorkflowRole;
  description: string;
  requirements: string[];
  deliverables: string[];
};

export type WorkflowTemplate = {
  id: WorkflowType;
  title: string;
  shortTitle: string;
  description: string;
  useWhen: string;
  guidance: string;
  stages: WorkflowStage[];
};

export type StageRecord = {
  stageId: string;
  status: StageStatus;
  assignee: string;
  completedAt?: string;
  deadline?: string;
  assigneeId?: string;
  note?: string;
  completedBy?: string;
};

export type ServiceWorkflow = {
  templateId: WorkflowType;
  definition: WorkflowTemplate;
  stages: StageRecord[];
  revision: number;
  progress: number;
  blocker: string;
  assignedAt: string;
  updatedAt: string;
};

export type WorkflowJob = {
  id: string;
  title: string;
  client: string;
  languages: string;
  translator: { id: string; name: string } | null;
  source: 'demo' | 'api';
  templateId: WorkflowType | null;
  stages: StageRecord[];
  deadline?: string;
  serviceStatus?: string;
  blocker?: string;
  attention?: string;
  workflow?: ServiceWorkflow;
};

export type TrackingStatus = 'Em andamento' | 'Bloqueado' | 'Atrasado' | 'Requer atenção' | 'Concluído' | 'Sem workflow';
export type WorkflowFilters = {
  search: string;
  translator: string;
  service: string;
  workflow: string;
  status: string;
};
