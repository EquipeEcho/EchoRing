import { router, useLocalSearchParams } from 'expo-router';
import { Eye, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Txt } from '@/components/ui/text';
import { useSession } from '@/features/auth/contexts/session-context';
import { ProjectList } from '@/features/workspace/components/project-list';
import { WorkspacePage } from '@/features/workspace/components/workspace-page';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';
import { translatorProjectPreview } from '@/features/workspace/data/demo-workspace';
import { useStyles } from '@/features/workspace/styles/workspace.styles';
import { isProjectGroup, matchesProjectGroup, projectGroups } from '@/features/workspace/utils/project-groups';
import { matchesSearch } from '@/features/workspace/utils/search';
import { useCommonStyles } from '@/theme/common.styles';

export function OperationsScreen() {
  const styles = useStyles();
  const common = useCommonStyles();
  const { projects, search, setSearch } = useWorkspace();
  const { session } = useSession();
  const params = useLocalSearchParams<{ exemplo?: string; grupo?: string }>();
  const group = isProjectGroup(params.grupo) ? params.grupo : null;
  const translator = session?.role === 'translator';
  const showPreview = translator && params.exemplo === 'tradutor';
  const displayedProjects = showPreview
    ? [{ ...translatorProjectPreview, owner: session.name }, ...projects]
    : projects;
  const employee = session?.role === 'employee' || session?.role === 'admin';
  const [status, setStatus] = useState('Todos');
  const filtered = displayedProjects.filter(
    (project) =>
      (status === 'Todos' || project.status === status) &&
      (!group || matchesProjectGroup(project, group)) &&
      matchesSearch(project, search),
  );
  const statusFilters = session?.demo
    ? employee
      ? ['Todos', 'Nova requisição', 'Aguardando aprovação', 'Em tradução', 'Em revisão', 'Concluído']
      : ['Todos', 'Em tradução', 'Em revisão', 'Concluído']
    : ['Todos', 'Tradutor atribuído', 'Em andamento', 'Aguardando avaliação', 'Revisão solicitada', 'Pronta', 'Entregue'];
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
      <SegmentedTabs
        scrollable
        label="Status dos projetos"
        value={status}
        onChange={setStatus}
        items={statusFilters.map((value) => ({ value, label: value }))}
      />
      {(status !== 'Todos' || !!search || !!group) && <View style={styles.toolbar}>
        <Txt style={styles.toolbarLabel}>{filtered.length} resultados{search ? ` para “${search}”` : ''}{status !== 'Todos' ? ` · ${status}` : ''}{group ? ` · ${projectGroups[group].label}` : ''}</Txt>
        <Button variant="ghost" onPress={() => { setStatus('Todos'); setSearch(''); if (group) router.setParams({ grupo: '' }); }}>Limpar filtros</Button>
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
        <ProjectList inset projects={filtered} />
      </View>
    </WorkspacePage>
  );
}
