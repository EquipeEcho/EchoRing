import { type TranslationService } from '@/features/deliveries/types';

/** A file submission or approval confirms one contiguous package of work. */
export function deliveryWorkflowStages(task: TranslationService, role: 'translator' | 'team') {
  const workflow = task.workflow;
  if (!workflow) return [];
  const active = workflow.stages.findIndex(stage => stage.status === 'current' || stage.status === 'blocked');
  if (active < 0 || workflow.stages[active].status === 'blocked') return [];
  const stages = [];
  for (let index = active; index < workflow.definition.stages.length; index++) {
    const stage = workflow.definition.stages[index];
    if ((stage.role === 'translator') !== (role === 'translator')) break;
    stages.push(stage);
  }
  return stages;
}

export function canSubmitWorkflow(task: TranslationService) {
  if (!task.workflow) return ['Em andamento', 'Revisão solicitada'].includes(task.status);
  if (task.workflow.stages.some(stage => stage.status === 'blocked')) return false;
  if (deliveryWorkflowStages(task, 'translator').length) return ['Em andamento', 'Revisão solicitada', 'Aguardando avaliação'].includes(task.status);
  // A manually completed translator stage can await the actual file submission.
  return ['Em andamento', 'Revisão solicitada'].includes(task.status) && task.workflow.progress < 100 && task.workflow.definition.stages.some(stage =>
    stage.role === 'translator' && task.workflow!.stages.some(record => record.stageId === stage.id && record.status === 'completed'));
}
