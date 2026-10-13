import { type DocumentPickerAsset } from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, FileText, Play, RefreshCw, UploadCloud } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { Messages } from '@/features/deliveries/components/messages';
import { TaskDetails } from '@/features/deliveries/components/task-details';
import { TaskHeader } from '@/features/deliveries/components/task-header';
import { WorkflowTabs } from '@/features/deliveries/components/workflow-tabs';
import { useTasks } from '@/features/deliveries/hooks/use-tasks';
import { startTask, uploadTranslation } from '@/features/deliveries/services/delivery-service';
import { selectTranslationDocument } from '@/features/deliveries/services/document-picker';
import { styles } from '@/features/deliveries/styles/deliveries.styles';
import { common } from '@/theme/common.styles';
import { colors } from '@/theme/tokens';
import { formatBytes } from '@/utils/formatters';

export function TranslatorTasksScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ task?: string }>();
  const { token, tasks, loading, error, setError, refresh } = useTasks();
  const [selected, setSelected] = useState<{
    taskId: string;
    assets: DocumentPickerAsset[];
  } | null>(null);
  const [view, setView] = useState<'auto' | 'active' | 'finished'>('auto');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const finished = tasks.filter((task) => ['Pronta', 'Entregue'].includes(task.status));
  const active = tasks.filter((task) => !['Pronta', 'Entregue'].includes(task.status));
  const requestedTask = tasks.find((task) => task.id === params.task);
  const effectiveView =
    view === 'auto' && requestedTask && ['Pronta', 'Entregue'].includes(requestedTask.status)
      ? 'finished'
      : view === 'auto'
        ? 'active'
        : view;
  const scoped = effectiveView === 'active' ? active : finished;
  const ordered = params.task
    ? [...scoped].sort((item) => (item.id === params.task ? -1 : 1))
    : scoped;

  async function begin(taskId: string) {
    if (!token || busy) return;
    setBusy(taskId);
    setError('');
    setNotice('');
    try {
      await startTask(taskId, token);
      setNotice('Tarefa iniciada. Agora você pode enviar a tradução.');
      await refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function choose(taskId: string) {
    setError('');
    setNotice('');
    try {
      const assets = await selectTranslationDocument();
      if (assets) setSelected({ taskId, assets });
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function upload() {
    if (!selected || !token || busy) return;
    setBusy(selected.taskId);
    setError('');
    setNotice('');
    try {
      const delivery = await uploadTranslation(selected.taskId, selected.assets, token);
      const count = delivery.files?.length || selected.assets.length;
      setSelected(null);
      setNotice(
        `${count} ${count === 1 ? 'arquivo foi enviado' : 'arquivos foram enviados'} como versão ${delivery.version} e ${count === 1 ? 'aguarda' : 'aguardam'} avaliação.`,
      );
      await refresh();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <PageHeading
          title="Minhas traduções"
          subtitle="Acesse os originais, trabalhe na tarefa e envie cada versão para avaliação."
          action={
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={loading}
              onPress={() => void refresh()}
            >
              Atualizar
            </Button>
          }
        />
        <Messages notice={notice} error={error} />
        <WorkflowTabs
          value={effectiveView}
          onChange={(value) => setView(value)}
          tabs={[
            { value: 'active', label: 'Em andamento', count: active.length },
            { value: 'finished', label: 'Finalizadas', count: finished.length },
          ]}
        />
        {!!ordered.length && (
          <View style={styles.queue}>
            {ordered.map((task, index) => {
              const available =
                task.status === 'Em andamento' || task.status === 'Revisão solicitada';
              const files = selected?.taskId === task.id ? selected.assets : [];
              return (
                <View
                  key={task.id}
                  testID={`task-${task.id}`}
                  style={[styles.card, task.id === params.task && styles.highlight]}
                >
                  <View style={styles.sequence}>
                    <Txt style={styles.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt>
                    <View style={styles.sequenceLine} />
                  </View>
                  <View style={styles.cardBody}>
                    <TaskHeader task={task} />
                    <TaskDetails task={task} token={token!} />
                    {!!files.length && (
                      <View style={styles.selectedFiles}>
                        <View style={styles.fileSelectionHeading}>
                          <Txt style={styles.eyebrow}>ARQUIVOS DESTA VERSÃO</Txt>
                          <Txt style={common.caption}>
                            {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                          </Txt>
                        </View>
                        {files.map((file, fileIndex) => (
                          <View key={`${file.name}-${fileIndex}`} style={styles.selectedFile}>
                            <FileText size={20} color={colors.accent} />
                            <View style={{ flex: 1 }}>
                              <Txt numberOfLines={1} style={{ fontWeight: '600' }}>
                                {file.name}
                              </Txt>
                              <Txt style={common.caption}>{formatBytes(file.size)}</Txt>
                            </View>
                            <Button
                              variant="ghost"
                              disabled={!!busy}
                              onPress={() =>
                                setSelected((current) => {
                                  if (!current || current.taskId !== task.id) return current;
                                  const assets = current.assets.filter(
                                    (_, indexToKeep) => indexToKeep !== fileIndex,
                                  );
                                  return assets.length ? { ...current, assets } : null;
                                })
                              }
                            >
                              Remover
                            </Button>
                          </View>
                        ))}
                      </View>
                    )}
                    {task.status === 'Tradutor atribuído' && (
                      <Button
                        icon={Play}
                        loading={busy === task.id}
                        onPress={() => void begin(task.id)}
                      >
                        Iniciar tradução
                      </Button>
                    )}
                    {available && (
                      <>
                        <View style={styles.actions}>
                          <Button
                            variant="secondary"
                            icon={FileText}
                            disabled={!!busy}
                            onPress={() => void choose(task.id)}
                          >
                            {files.length ? 'Trocar arquivos' : 'Selecionar arquivos'}
                          </Button>
                          {!!files.length && (
                            <Button
                              icon={UploadCloud}
                              loading={busy === task.id}
                              onPress={() => void upload()}
                            >
                              Enviar {files.length === 1 ? 'arquivo' : `${files.length} arquivos`}{' '}
                              para avaliação
                            </Button>
                          )}
                        </View>
                        <Txt style={common.caption}>
                          PDF, DOCX ou TXT · até 10 arquivos, 5 MB cada e 20 MB no total.
                        </Txt>
                      </>
                    )}
                    {task.status === 'Aguardando avaliação' && (
                      <Txt style={common.caption}>
                        A equipe está avaliando a versão mais recente.
                      </Txt>
                    )}
                    {task.status === 'Pronta' && (
                      <Txt style={common.caption}>Tradução aprovada e serviço finalizado.</Txt>
                    )}
                    {task.status === 'Entregue' && (
                      <Txt style={common.caption}>Documento final enviado ao cliente.</Txt>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {!ordered.length && !loading && !error && (
          <EmptyState
            icon={effectiveView === 'finished' ? CheckCircle2 : UploadCloud}
            title={
              effectiveView === 'finished'
                ? 'Nenhuma tradução finalizada'
                : 'Nenhuma tarefa em andamento'
            }
            text={
              effectiveView === 'finished'
                ? 'As traduções aprovadas e entregues ficam organizadas nesta aba.'
                : 'As tarefas aparecem aqui assim que a equipe atribui uma solicitação aprovada à sua conta.'
            }
          />
        )}
      </View>
    </ScrollView>
  );
}
