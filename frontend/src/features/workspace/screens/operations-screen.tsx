import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { FilterTab } from '@/features/workspace/components/filter-tab';
import { ProjectList } from '@/features/workspace/components/project-list';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { matchesSearch } from '@/features/workspace/utils/search';

export function OperationsScreen() {
  const styles = useStyles();
  const { projects, search, setNewRequest } = useWorkspace();
  const { session } = useSession();
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const [status, setStatus] = useState('Todos');
  const filtered = projects.filter(
    (project) =>
      (status === 'Todos' || project.status === status) && matchesSearch(project, search),
  );
  return (
    <WorkspacePage>
      <PageHeading
        title={employee ? 'Operação' : 'Meus projetos'}
        subtitle={
          employee
            ? 'Requisições, orçamentos e ordens de serviço.'
            : 'Projetos de tradução atribuídos à sua conta.'
        }
        action={
          employee ? (
            <Button icon={Plus} onPress={() => setNewRequest(true)}>
              Nova requisição
            </Button>
          ) : undefined
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {(session?.demo
          ? employee
            ? [
                'Todos',
                'Nova requisição',
                'Aguardando aprovação',
                'Em tradução',
                'Em revisão',
                'Concluído',
              ]
            : ['Todos', 'Em tradução', 'Em revisão', 'Concluído']
          : [
              'Todos',
              'Tradutor atribuído',
              'Em andamento',
              'Aguardando avaliação',
              'Revisão solicitada',
              'Pronta',
              'Entregue',
            ]
        ).map((value) => (
          <FilterTab
            key={value}
            label={value}
            active={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </ScrollView>
      <View style={styles.operationTable}>
        <View style={styles.listCaption}>
          <View>
            <Txt style={styles.listEyebrow}>FLUXO DE TRABALHO</Txt>
            <Txt style={styles.listCount}>
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            </Txt>
          </View>
          {session?.demo && <Badge tone="neutral">Demonstração</Badge>}
        </View>
        <ProjectList projects={filtered} />
      </View>
    </WorkspacePage>
  );
}
