import { AppWindow, BookOpen, Captions, FileCheck2, Languages, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { useTheme } from '@/theme/theme-context';

import { workflowTemplates } from '../data/workflow-templates';
import { useStyles } from '../styles/workflows.styles';
import { type WorkflowTemplate, type WorkflowType } from '../types';
import { ResponsibilityLegend, WorkflowTimeline } from './workflow-timeline';
import { WorkflowMap } from './workflow-map';

const icons: Record<WorkflowType, LucideIcon> = { tep: BookOpen, mtpe: Languages, localization: AppWindow, documentary: FileCheck2, subtitling: Captions };

export function WorkflowLibrary({ compact, onOpen }: { compact: boolean; onOpen: (template: WorkflowTemplate) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  return <View style={s.stack}>
    <View style={{ gap: 7 }}>
      <Txt accessibilityRole="header" style={s.sectionTitle}>Um processo claro para cada serviço</Txt>
      <Txt style={s.muted}>Consulte quando usar cada modelo, quem participa e o que entregar em cada etapa. As instruções do projeto complementam estes modelos de referência.</Txt>
    </View>
    <ResponsibilityLegend />
    <View style={s.grid}>
      {workflowTemplates.map(template => {
        const Icon = icons[template.id];
        return <View key={template.id} testID={`workflow-template-${template.id}`} style={[s.card, compact && s.cardCompact]}>
          <View style={s.between}><View style={s.templateIcon}><Icon size={22} color={colors.accent} /></View><Badge tone="neutral">5 etapas</Badge></View>
          <View style={s.cardTop}><Txt accessibilityRole="header" style={s.title}>{template.title}</Txt><Txt style={s.muted}>{template.description}</Txt></View>
          <View style={{ gap: 5 }}><Txt style={s.detailLabel}>Quando utilizar</Txt><Txt style={s.muted}>{template.useWhen}</Txt></View>
          <View style={s.stagePreview}>
            {template.stages.map((stage, index) => <View key={stage.id} style={s.stageChip}><Txt style={s.chipText}>{index + 1}. {stage.title}</Txt></View>)}
          </View>
          <View style={{ flex: 1 }} />
          <Button variant="secondary" onPress={() => onOpen(template)}>Explorar {template.shortTitle}</Button>
        </View>;
      })}
    </View>
  </View>;
}

export function WorkflowTemplateDetails({ template }: { template: WorkflowTemplate }) {
  const s = useStyles();
  return <View style={s.stack}>
    {template && <>
      <View style={s.banner}><Txt style={s.detailLabel}>Quando utilizar</Txt><Txt style={s.muted}>{template.useWhen}</Txt><Txt style={s.muted}>{template.guidance}</Txt></View>
      <ResponsibilityLegend />
      <WorkflowMap template={template} details={false} />
      <WorkflowTimeline template={template} />
    </>}
  </View>;
}
