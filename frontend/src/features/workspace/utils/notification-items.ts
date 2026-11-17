import { type Href } from 'expo-router';

import { type UserRole } from '@/features/auth/types';
import { type OfferNotification } from '@/features/offers/types';
import { type Task } from '@/features/workspace/types';

export type NotificationItem = {
  key: string;
  title: string;
  text: string;
  meta: string;
  /** Where the notification leads, already filtered to what it talks about. */
  href: Href;
  unread: boolean;
  offerId?: number;
};

type Sources = {
  role: UserRole;
  demo: boolean;
  received: number;
  attention: number;
  tasks: Task[];
  offers: OfferNotification[];
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Every notification the panel shows, each with the screen that resolves it. */
export function notificationItems({ role, demo, received, attention, tasks, offers }: Sources): NotificationItem[] {
  const staff = role === 'admin' || role === 'employee';
  const items: NotificationItem[] = offers.map(offer => ({
    key: `offer-${offer.id}`,
    title: offer.message,
    text: role === 'translator' ? 'Confira as condições e responda à oportunidade.' : 'Veja a solicitação relacionada.',
    meta: `${new Date(offer.createdAt).toLocaleString('pt-BR')} · ${offer.readAt ? 'Lida' : 'Nova'}`,
    href: offer.href as Href,
    unread: !offer.readAt,
    offerId: offer.id,
  }));
  if (demo) {
    return [
      ...items,
      { key: 'demo-review', title: 'Tradução pronta para revisão', text: 'Lucas enviou o contrato de Almeida & Associados.', meta: 'Há 15 minutos', href: '/entregas', unread: true },
      { key: 'demo-deadline', title: 'Prazo de entrega próximo', text: 'O manual da Vértice Engenharia tem entrega hoje.', meta: 'Há 40 minutos', href: { pathname: '/operacao', params: { grupo: 'hoje' } }, unread: true },
    ];
  }
  if (staff && attention > 0) {
    items.push({
      key: 'requests-attention',
      title: `${plural(attention, 'solicitação precisa', 'solicitações precisam')} de atenção`,
      text: 'Orçamentos sem resposta, links perto de expirar ou prazos próximos.',
      meta: 'Situação atual',
      href: { pathname: '/solicitacoes', params: { status: 'atencao' } },
      unread: true,
    });
  }
  if (staff && received > 0) {
    items.push({
      key: 'requests-received',
      title: `${plural(received, 'solicitação aguardando', 'solicitações aguardando')} análise`,
      text: 'Analise os documentos e prepare as propostas.',
      meta: 'Situação atual',
      href: { pathname: '/solicitacoes', params: { status: 'pendente' } },
      unread: true,
    });
  }
  for (const task of tasks.filter(item => !item.done).slice(0, 5)) {
    items.push({
      key: `task-${task.id}`,
      title: task.title,
      text: `${task.project} · ${task.due}`,
      meta: 'Tarefa pendente',
      href: task.realTaskId ? { pathname: '/entregas', params: { task: task.realTaskId } } : '/tarefas',
      unread: true,
    });
  }
  return items;
}
