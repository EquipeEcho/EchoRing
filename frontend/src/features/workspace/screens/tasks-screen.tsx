import { CheckCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { FilterTab } from '@/features/workspace/components/filter-tab';
import { TaskRow } from '@/features/workspace/components/task-row';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { useCommonStyles } from '@/theme/common.styles';

export function TasksScreen() {
  const styles = useStyles();
  const common = useCommonStyles();
  const { tasks } = useWorkspace();
  const [filter, setFilter] = useState('Pendentes');
  const visible = tasks.filter(
    (task) => filter === 'Todas' || (filter === 'Concluídas' ? task.done : !task.done),
  );
  return (
    <WorkspacePage>
      <PageHeading
        title="Minhas tarefas"
        subtitle={`${tasks.filter((task) => !task.done).length} tarefas pendentes`}
      />
      <View style={styles.tabs}>
        {['Pendentes', 'Concluídas', 'Todas'].map((value) => (
          <FilterTab
            key={value}
            label={value}
            active={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>
      <View style={styles.taskAgenda}>
        <View style={styles.agendaHead}>
          <Txt style={styles.listEyebrow}>AGENDA OPERACIONAL</Txt>
          <Txt style={common.caption}>{visible.length} itens</Txt>
        </View>
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {!visible.length && (
          <EmptyState
            icon={CheckCheck}
            title="Tudo em dia por aqui"
            text="Nenhuma tarefa nesta lista."
          />
        )}
      </View>
    </WorkspacePage>
  );
}
