import { useEffect, useState } from 'react';

import { isRequestGroup, requestGroups, viewGroups } from '@/features/requests/constants/status';
import { useInbox } from '@/features/requests/contexts/inbox-context';
import { listRequests } from '@/features/requests/services/request-service';
import { type RequestPage } from '@/features/requests/types';
import { requestPageSize } from '@/features/requests/utils/request-query';

type Options = { view: 'active' | 'completed'; filter: string; search: string; token?: string; enabled: boolean };

/** Loads the filtered page from `GET /requests` and reloads it on every inbox refresh. */
export function useRequestList({ view, filter, search, token, enabled }: Options) {
  const { revision, refresh } = useInbox();
  const group = isRequestGroup(filter) && viewGroups[view].includes(filter) ? filter : null;
  const status = group ?? viewGroups[view].join(',');
  const key = `${status}|${search}`;
  const [paging, setPaging] = useState({ key, pages: 1 });
  const pages = paging.key === key ? paging.pages : 1;
  const [page, setPage] = useState<RequestPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled || !revision) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await listRequests({ status, search: search.trim(), limit: requestPageSize * pages, offset: 0 }, token);
        if (!active) return;
        setPage(result);
        setError('');
      } catch (failure) {
        if (active) setError((failure as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [enabled, revision, status, search, pages, token]);
  const groups = page?.counts.groups;
  const viewTotal = (name: 'active' | 'completed') =>
    groups ? viewGroups[name].reduce((total, item) => total + groups[item], 0) : 0;
  const items = page?.items ?? [];
  return {
    items,
    total: page?.total ?? 0,
    loading,
    error,
    refresh,
    filter: group ?? 'Todos',
    hasMore: items.length < (page?.total ?? 0),
    loadMore: () => setPaging({ key, pages: pages + 1 }),
    viewCounts: { active: viewTotal('active'), completed: viewTotal('completed') },
    statusOptions: [
      { value: 'Todos', label: 'Todos', count: viewTotal(view) },
      ...viewGroups[view].map(item => ({ value: item, label: requestGroups[item].label, count: groups?.[item] ?? 0 })),
    ],
  };
}
