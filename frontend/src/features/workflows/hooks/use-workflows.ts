import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { useSession } from '@/features/auth/contexts/session-context';
import { useWorkspace } from '@/features/workspace/contexts/workspace-context';

import { createDemoWorkflows } from '../data/demo-workflows';
import { activeTranslators, emptyFilters, filterJobs, jobFromService } from '../utils/workflow-utils';

export function useWorkflows() {
  const { session } = useSession();
  const params = useLocalSearchParams<{ id?: string; task?: string; template?: string; examples?: string; translator?: string; tab?: string }>();
  const workspace = useWorkspace();
  const staff = session?.role === 'employee' || session?.role === 'admin';
  const examples = params.examples === '1';
  const filters = useMemo(() => ({ ...emptyFilters, translator: params.translator || '' }), [params.translator]);
  const setFilters = (value: typeof filters) => router.setParams({ translator: value.translator });
  const [now, setNow] = useState(Date.now);
  const selectedId = params.id || params.task;
  const simulated = !!session?.demo || examples;
  const samples = useMemo(() => createDemoWorkflows(new Date(), staff ? undefined : session?.name), [staff, session?.name]);
  const jobs = useMemo(() => simulated ? samples : workspace.services.map(jobFromService), [simulated, samples, workspace.services]);
  const filtered = useMemo(() => filterJobs(jobs, filters, now), [jobs, filters, now]);
  const translators = useMemo(() => activeTranslators(jobs, now), [jobs, now]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const refresh = workspace.refresh;
  useEffect(() => {
    if (simulated || !session?.token) return;
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh, simulated, session?.token]);
  function changeSource() {
    router.setParams({ examples: examples ? '' : '1', translator: '' });
  }
  const listParams = { examples: examples ? '1' : '', translator: filters.translator };
  const listHref = { pathname: '/workflows' as const, params: listParams };
  function openJob(id: string) {
    router.push({ pathname: '/workflows/[id]', params: { ...listParams, id } });
  }
  function openTemplate(id: string) {
    router.push({ pathname: '/workflows/modelos/[template]', params: { ...listParams, template: id, tab: 'templates' } });
  }
  return {
    selectedId, templateId: params.template, listHref, openJob, openTemplate,
    tab: params.tab === 'templates' ? 'templates' as const : 'jobs' as const,
    setTab: (tab: 'jobs' | 'templates') => router.setParams({ tab }),
    staff, simulated, jobs, filtered, translators, filters, setFilters, now, changeSource,
    selected: jobs.find(job => job.id === selectedId) ?? null,
    loading: !simulated && workspace.loading, error: !simulated ? workspace.loadError : '',
    refresh: workspace.refresh,
  };
}
