import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/features/auth/contexts/session-context';
import { listOfferNotifications, markOfferNotificationRead } from '@/features/offers/services/offer-service';
import { type OfferNotification } from '@/features/offers/types';

export function useOfferNotifications() {
  const { session } = useSession();
  const token = session?.token;
  const allowed = session?.role !== 'hr';
  const [items, setItems] = useState<OfferNotification[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!token || !allowed) return;
    try { setItems(await listOfferNotifications(token)); setError(''); }
    catch (failure) { setError((failure as Error).message); }
  }, [token, allowed]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 30000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);
  async function markRead(id: number) {
    if (!token) return;
    try {
      await markOfferNotificationRead(id, token);
      setItems(current => current.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (failure) { setError((failure as Error).message); }
  }
  return { items: token && allowed ? items : [], error: token && allowed ? error : '', refresh, markRead };
}
