import { CheckCircle2, Download, FileCheck2, RefreshCw, RotateCcw } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { Txt } from '@/components/ui/text';
import { Messages } from '@/features/deliveries/components/messages';
import { TaskFeedback } from '@/features/deliveries/components/task-feedback';
import { TaskHeader } from '@/features/deliveries/components/task-header';
import { WorkflowTabs } from '@/features/deliveries/components/workflow-tabs';
import { useTasks } from '@/features/deliveries/hooks/use-tasks';
import { downloadDelivery, reviewDelivery } from '@/features/deliveries/services/delivery-service';
import { downloadDemoDocument } from '@/features/deliveries/services/demo-documents';
import { styles } from '@/features/deliveries/styles/deliveries.styles';
import { type TranslationService } from '@/features/deliveries/types';
import { common } from '@/theme/common.styles';
import { colors } from '@/theme/tokens';
import { formatBytes } from '@/utils/formatters';

export function StaffReviewsScreen() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { token, tasks, loading, error, setError, setTasks, refresh, demo } = useTasks();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<'review' | 'approved'>('review');
  const awaitingReview = tasks.filter((task) =>
    ['Aguardando avaliação', 'Revisão solicitada'].includes(task.status),
  );
  const approved = tasks.filter((task) => ['Pronta', 'Entregue'].includes(task.status));
  const reviewable = view === 'review' ? awaitingReview : approved;

  async function review(task: TranslationService, decision: 'approve' | 'request_revision') {
    const delivery = task.lastDelivery;
    if (!delivery || busy || (!demo && !token)) return;
    const note = (feedback[task.id] || '').trim();
    if (decision === 'request_revision' && !note) {
      setError('Escreva a observação que o tradutor deve seguir na revisão.');
      return;
    }
    setBusy(task.id);
    setError('');
    setNotice('');
    try {
      if (demo) {
        const status = decision === 'approve' ? 'Entregue' : 'Revisão solicitada';
        const completedAt = decision === 'approve' ? new Date().toISOString() : undefined;
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status,
                  readyAt: completedAt || item.readyAt,
                  deliveredAt: completedAt || item.deliveredAt,
                  updatedAt: completedAt || item.updatedAt,
                  lastFeedback: note,
                  lastDelivery: item.lastDelivery
                    ? { ...item.lastDelivery, status, feedback: note }
                    : item.lastDelivery,
                }
              : item,
          ),
        );
        setNotice(
          decision === 'approve'
            ? 'Simulação: tradução aprovada e serviço finalizado. Nenhum e-mail foi enviado.'
            : 'Simulação: revisão solicitada ao tradutor.',
        );
      } else {
        await reviewDelivery(delivery.id, decision, note, token!);
        setNotice(
          decision === 'approve'
            ? 'Tradução aprovada e serviço finalizado.'
            : 'Revisão solicitada ao tradutor.',
        );
        await refresh();
      }
      setFeedback((current) => ({ ...current, [task.id]: '' }));
      if (decision === 'approve') {
        setView('approved');
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
      }
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.page, width < 700 && styles.pageSmall]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        <PageHeading
          title="Avaliações e entregas"
          subtitle="Revise as versões dos tradutores e aprove a tradução para finalizar o serviço."
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
        {demo && (
          <View style={styles.demoBanner}>
            <Badge tone="amber">Simulação local</Badge>
            <Txt style={[common.caption, { flex: 1 }]}>
              A aprovação finaliza o serviço apenas nesta demonstração. Nenhum e-mail será enviado.
            </Txt>
          </View>
        )}
        <Messages notice={notice} error={error} />
        <WorkflowTabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'review', label: 'Para avaliar', count: awaitingReview.length },
            { value: 'approved', label: 'Finalizadas', count: approved.length },
          ]}
        />
        {!!reviewable.length && (
          <View style={styles.queue}>
            {reviewable.map((task, index) => (
              <View key={task.id} style={styles.card}>
                <View style={styles.sequence}>
                  <Txt style={styles.sequenceText}>{String(index + 1).padStart(2, '0')}</Txt>
                  <View style={styles.sequenceLine} />
                </View>
                <View style={styles.cardBody}>
                  <TaskHeader task={task} />
                  <View style={styles.metadata}>
                    <Txt style={common.caption}>
                      Tradutor: {task.translator?.name || 'Não informado'}
                    </Txt>
                    <Txt style={common.caption}>
                      Cliente: {task.clientName} · {task.clientEmail}
                    </Txt>
                    <Txt style={common.caption}>Versão {task.lastDelivery?.version || 0}</Txt>
                  </View>
                  {task.lastDelivery && (
                    <View style={styles.deliveryFiles}>
                      {(task.lastDelivery.files?.length
                        ? task.lastDelivery.files
                        : [
                            {
                              index: 0,
                              name: task.lastDelivery.name,
                              size: task.lastDelivery.size,
                              mediaType: '',
                            },
                          ]
                      ).map((file) => (
                        <View
                          key={`${task.lastDelivery!.id}-${file.index}`}
                          style={styles.document}
                        >
                          <FileCheck2 size={20} color={colors.accent} />
                          <View style={{ flex: 1 }}>
                            <Txt>{file.name}</Txt>
                            <Txt style={common.caption}>{formatBytes(file.size)}</Txt>
                          </View>
                          <Button
                            variant="secondary"
                            icon={Download}
                            onPress={() =>
                              demo
                                ? downloadDemoDocument(file.name)
                                : void downloadDelivery(
                                    task.lastDelivery!.id,
                                    file.name,
                                    token!,
                                    file.index,
                                  )
                            }
                          >
                            Baixar arquivo
                          </Button>
                        </View>
                      ))}
                    </View>
                  )}
                  {task.status === 'Aguardando avaliação' && (
                    <>
                      <View style={styles.field}>
                        <Txt style={styles.label}>Observação para revisão</Txt>
                        <TextInput
                          accessibilityLabel={`Observação de revisão de ${task.title}`}
                          value={feedback[task.id] || ''}
                          onChangeText={(value) =>
                            setFeedback((current) => ({ ...current, [task.id]: value }))
                          }
                          placeholder="Obrigatória ao solicitar revisão"
                          placeholderTextColor={colors.muted}
                          multiline
                          maxLength={3000}
                          style={[styles.input, styles.textarea]}
                        />
                      </View>
                      <View style={styles.actions}>
                        <Button
                          variant="secondary"
                          icon={RotateCcw}
                          disabled={!!busy}
                          onPress={() => void review(task, 'request_revision')}
                        >
                          Solicitar revisão
                        </Button>
                        <Button
                          icon={CheckCircle2}
                          loading={busy === task.id}
                          onPress={() => void review(task, 'approve')}
                        >
                          Aprovar tradução
                        </Button>
                      </View>
                    </>
                  )}
                  {task.status === 'Revisão solicitada' && <TaskFeedback task={task} />}
                  {task.status === 'Pronta' && (
                    <Txt style={{ color: colors.green }}>
                      Tradução aprovada e serviço finalizado.
                    </Txt>
                  )}
                  {task.status === 'Entregue' && (
                    <Txt style={{ color: colors.green }}>
                      Entregue em{' '}
                      {task.deliveredAt
                        ? new Date(task.deliveredAt).toLocaleString('pt-BR')
                        : 'data não informada'}
                      .
                    </Txt>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        {!reviewable.length && !loading && !error && (
          <EmptyState
            icon={FileCheck2}
            title={view === 'review' ? 'Nenhuma avaliação pendente' : 'Nenhuma tradução aprovada'}
            text={
              view === 'review'
                ? 'As versões enviadas pelos tradutores aparecerão aqui.'
                : 'As traduções aprovadas e já entregues ficam organizadas nesta aba.'
            }
          />
        )}
      </View>
    </ScrollView>
  );
}
