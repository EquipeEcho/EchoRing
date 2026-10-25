import { router, useLocalSearchParams } from 'expo-router';
import { Eye, Plus, X } from 'lucide-react-native';
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
import { translatorProjectPreview } from '@/features/workspace/data/demo-workspace';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { matchesSearch } from '@/features/workspace/utils/search';
import { useCommonStyles } from '@/theme/common.styles';

export function OperationsScreen() {
  const styles = useStyles();
  const common = useCommonStyles();
  const { projects, search, setSearch } = useWorkspace();
  const { session } = useSession();
  const params = useLocalSearchParams<{ exemplo?: string }>();
  const translator = session?.role === 'translator';
  const showPreview = translator && params.exemplo === 'tradutor';
  const displayedProjects = showPreview
    ? [{ ...translatorProjectPreview, owner: session.name }, ...projects]
    : projects;
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const [status, setStatus] = useState('Todos');
  const filtered = displayedProjects.filter(
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
            <Button icon={Plus} onPress={() => router.push('/operacao/nova')}>
              Nova requisição
            </Button>
          ) : translator ? (
            <Button variant="secondary" icon={showPreview ? X : Eye} onPress={() => { router.setParams({ exemplo: showPreview ? '' : 'tradutor' }); setStatus('Todos'); setSearch(''); }}>
              {showPreview ? 'Ocultar projeto de exemplo' : 'Ver projeto de exemplo'}
            </Button>
          ) : undefined
        }
      />
      {showPreview && <View style={styles.welcomeNote}>
        <Badge tone="amber">Prévia do projeto do tradutor</Badge>
        <Txt style={common.caption}>O projeto DEMO-TRAD-001 é fictício e serve para visualizar o cartão, o progresso e os detalhes. Seus projetos reais continuam na lista; este exemplo não é salvo no banco.</Txt>
      </View>}
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
      {(status !== 'Todos' || !!search) && <View style={styles.toolbar}>
        <Txt style={styles.toolbarLabel}>{filtered.length} resultados{search ? ` para “${search}”` : ''}{status !== 'Todos' ? ` · ${status}` : ''}</Txt>
        <Button variant="ghost" onPress={() => { setStatus('Todos'); setSearch(''); }}>Limpar filtros</Button>
      </View>}
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
