import { router } from 'expo-router';
import { Check, ChevronRight, FileText } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Txt } from '@/components/ui/text';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { type Task } from '@/features/workspace/types';
import { useTheme } from '@/theme/theme-context';

export function TaskRow({ task }: { task: Task }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { toggleTask } = useWorkspace();
  return (
    <Pressable
      accessibilityRole={task.realTaskId ? 'button' : 'checkbox'}
      accessibilityLabel={task.title}
      aria-checked={task.realTaskId ? undefined : task.done}
      accessibilityState={task.realTaskId ? undefined : { checked: task.done }}
      onPress={() =>
        task.realTaskId
          ? router.push(`/entregas?task=${encodeURIComponent(task.realTaskId)}`)
          : toggleTask(task.id)
      }
      style={({ hovered }) => [styles.task, hovered && { backgroundColor: colors.elevated }]}
    >
      <View style={[styles.checkbox, task.done && styles.checked, !!task.realTaskId && { borderWidth: 0, backgroundColor: colors.accentSoft }]}>
        {task.realTaskId ? <FileText size={16} color={colors.accent} /> : task.done && <Check size={14} color={colors.onAccent} strokeWidth={3} />}
      </View>
      {!!task.realTaskId && <ChevronRight size={16} color={colors.muted} />}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt
          style={[
            styles.taskTitle,
            task.done && { textDecorationLine: 'line-through', color: colors.muted },
          ]}
        >
          {task.title}
        </Txt>
        <Txt style={styles.taskMeta}>
          {task.project} · {task.done ? 'Concluída' : task.due}
        </Txt>
      </View>
    </Pressable>
  );
}
