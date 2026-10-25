import { router, usePathname } from 'expo-router';
import { ChevronRight, Clock3, FileText, SearchX } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Txt } from '@/components/ui/text';
import { statusTone } from '@/features/workspace/constants/status';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { type Project } from '@/features/workspace/types';
import { useCommonStyles } from '@/theme/common.styles';
import { useTheme } from '@/theme/theme-context';

export function ProjectList({ projects }: { projects: Project[] }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const common = useCommonStyles();
  const [listWidth, setListWidth] = useState(0);
  const pathname = usePathname();
  const { setSearch, search } = useWorkspace();
  const wide = listWidth >= 620;
  if (!projects.length)
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhum projeto encontrado"
        text={
          search
            ? 'Tente outro nome de cliente, título ou código.'
            : 'Não há registros com o status selecionado.'
        }
        action={
          search ? (
            <Button variant="secondary" onPress={() => setSearch('')}>
              Limpar busca
            </Button>
          ) : undefined
        }
      />
    );
  return (
    <View onLayout={event => setListWidth(event.nativeEvent.layout.width)}>
      {wide && (
        <View style={styles.tableHead}>
          <Txt style={[styles.columnLabel, { flex: 1 }]}>Projeto / Cliente</Txt>
          <Txt style={[styles.columnLabel, styles.statusColumn]}>Status</Txt>
          <Txt style={[styles.columnLabel, styles.deadlineColumn]}>Prazo</Txt>
          <View style={{ width: 16 }} />
        </View>
      )}
      {projects.map((project) => (
        <Pressable
          key={project.id}
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${project.id}: ${project.title}`}
          onPress={() =>
            project.realTaskId
              ? router.push(`/entregas?task=${encodeURIComponent(project.realTaskId)}`)
              : router.push({ pathname: '/operacao/[id]', params: { id: project.id, origin: pathname === '/dashboard' ? 'dashboard' : 'operacao', ...(project.id === 'DEMO-TRAD-001' && { exemplo: 'tradutor' }) } })
          }
          style={({ hovered }) => [
            styles.projectRow,
            !wide && styles.projectMobile,
            hovered && { backgroundColor: colors.elevated },
          ]}
        >
          <View style={styles.projectMain}>
            <View style={styles.projectIcon}>
              <FileText size={22} color={colors.muted} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Txt numberOfLines={wide ? 1 : undefined} style={styles.projectTitle}>
                {project.title}
              </Txt>
              <Txt style={styles.projectMeta}>
                {project.client} · {project.id}
              </Txt>
              <Txt style={styles.languages}>{project.languages}</Txt>
              {project.demo && <Badge tone="amber">Projeto demonstrativo</Badge>}
              {wide && <View
                accessibilityRole="progressbar"
                accessibilityLabel={`Andamento de ${project.title}`}
                accessibilityValue={{ min: 0, max: 100, now: project.progress }}
                style={styles.progressTrack}
              >
                <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
              </View>}
            </View>
          </View>
          <View style={[styles.rowStatus, !wide && styles.mobileStatus]}>
            <View style={wide ? styles.statusColumn : undefined}>
              <Badge tone={statusTone[project.status]}>{project.status}</Badge>
            </View>
            <View style={[wide && styles.deadlineColumn, common.row, { gap: 5 }]}>
              {project.urgent && <Clock3 size={12} color={colors.amber} />}
              <Txt style={[styles.deadline, project.urgent && { color: colors.amber }]}>
                {project.deadline}
              </Txt>
            </View>
            {wide && <ChevronRight size={16} color={colors.muted} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
