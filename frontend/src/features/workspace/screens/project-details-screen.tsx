import { Redirect, useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { RecordPage } from '@/features/workspace/components/record-page';
import { statusTone } from '@/features/workspace/constants/status';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { translatorProjectPreview } from '@/features/workspace/data/demo-workspace';
import { useStyles } from '@/features/workspace/styles/record-details.styles';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function ProjectDetailsScreen() {
  const { id, exemplo, origin } = useLocalSearchParams<{ id: string; exemplo?: string; origin?: string }>();
  const { session } = useSession();
  const { projects, loading, loadError, refresh } = useWorkspace();
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const preview = session?.role === 'translator' && exemplo === 'tradutor' && id === translatorProjectPreview.id;
  const project = preview ? { ...translatorProjectPreview, owner: session.name } : projects.find(item => item.id === id);
  if (project?.realTaskId) return <Redirect href={{ pathname: '/entregas', params: { task: project.realTaskId } }} />;
  return <RecordPage title="Detalhes do projeto" eyebrow={id} description="Acompanhamento operacional e responsáveis."
    backLabel="Voltar aos projetos" backHref={{ pathname: origin === 'dashboard' ? '/dashboard' : '/operacao', params: { exemplo: exemplo || '' } }}
    loading={!preview && loading && !project} error={!project ? loadError || (!loading ? 'Projeto não encontrado. Registros demonstrativos criados na sessão não são preservados ao recarregar.' : '') : undefined} onRetry={refresh}>
        {project && (
          <>
            <View style={styles.projectHero}>
              <View style={styles.projectIcon}>
                <FileText size={25} color={colors.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
                <Txt style={styles.projectTitle}>{project.title}</Txt>
                <Badge tone={statusTone[project.status]}>{project.status}</Badge>
              </View>
            </View>
            <View style={styles.detailGrid}>
              {[
                ['Cliente', project.client],
                ['Idiomas', project.languages],
                ['Responsável', project.owner],
                ['Prazo', project.deadline],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailCell}>
                  <Txt style={styles.detailLabel}>{label}</Txt>
                  <Txt style={styles.detailValue}>{value}</Txt>
                </View>
              ))}
            </View>
            <View style={styles.progressSection}>
              <View style={styles.detailRow}>
                <View>
                  <Txt style={styles.detailLabel}>PROGRESSO DO PROJETO</Txt>
                  <Txt style={styles.progressCaption}>
                    {project.progress === 100 ? 'Fluxo concluído' : 'Etapas em andamento'}
                  </Txt>
                </View>
                <Txt style={styles.progressValue}>{project.progress}%</Txt>
              </View>
              <View style={styles.track}>
                <View style={[styles.progress, { width: `${project.progress}%` }]} />
              </View>
            </View>
            <View style={styles.demoNote}>
              <View style={styles.noteDot} />
              <Txt style={[common.caption, { flex: 1 }]}>
                Registro demonstrativo. Nenhum documento real de cliente está armazenado aqui.
              </Txt>
            </View>

          </>
        )}
  </RecordPage>;
}
