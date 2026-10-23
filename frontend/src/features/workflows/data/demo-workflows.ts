import { workflowTemplates } from './workflow-templates';
import { type WorkflowJob, type WorkflowType } from '../types';

export function createDemoWorkflows(now = new Date(), translatorName?: string): WorkflowJob[] {
  const day = (offset: number) => {
    const date = new Date(now.getTime() + offset * 86400000);
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const translators = [
    { id: 'demo-marina', name: translatorName || 'Marina Costa' },
    { id: 'demo-rafael', name: 'Rafael Lima' },
    { id: 'demo-beatriz', name: 'Beatriz Santos' },
    { id: 'demo-lucas', name: 'Lucas Almeida' },
  ];
  function job(id: string, title: string, templateId: WorkflowType, owner: number, completed: number, due: number, extras: Partial<WorkflowJob> = {}): WorkflowJob {
    const template = workflowTemplates.find(item => item.id === templateId)!;
    return {
      id, title, templateId, source: 'demo', client: 'Cliente fictício', languages: 'Inglês → Português', translator: translators[owner], deadline: day(due),
      stages: template.stages.map((stage, index) => ({
        stageId: stage.id, status: index < completed ? 'completed' : index === completed ? (extras.blocker ? 'blocked' : 'current') : 'pending',
        assignee: stage.role === 'translator' ? translators[owner].name : stage.role === 'reviewer' ? 'Camila Rocha' : 'Ana Martins',
        ...(index < completed ? { completedAt: day(index - completed - 1) } : { deadline: day(index === completed ? Math.min(due, 1) : due) }),
      })),
      ...extras,
    };
  }
  const jobs = [
    job('DEMO-001', 'Manual técnico de equipamentos', 'tep', 0, 2, 3),
    job('DEMO-002', 'Base de conhecimento do suporte', 'mtpe', 0, 1, -2),
    job('DEMO-003', 'Aplicativo de viagens', 'localization', 1, 3, 2, { blocker: 'Acesso à versão de testes indisponível. A equipe do produto precisa liberar o ambiente.' }),
    job('DEMO-004', 'Documentos acadêmicos', 'documentary', 2, 4, 1, { attention: 'Confirmar com o solicitante o canal de recebimento antes da entrega.' }),
    job('DEMO-005', 'Série de treinamento', 'subtitling', 3, 2, 5),
    job('DEMO-006', 'Relatório institucional', 'tep', 0, 5, -5),
    job('DEMO-007', 'Site de comércio eletrônico', 'localization', 1, 0, 7),
    job('DEMO-008', 'Entrevista com especialistas', 'subtitling', 3, 3, -1, { blocker: 'A revisão aguarda a confirmação de um termo técnico pelo cliente.' }),
  ];
  return translatorName ? jobs.filter(item => item.translator?.id === translators[0].id) : jobs;
}
