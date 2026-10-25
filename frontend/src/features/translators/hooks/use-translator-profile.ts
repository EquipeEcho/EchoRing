import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { demoTranslatorProfile } from '@/features/translators/data/demo-profile';
import { readTranslatorProfile } from '@/features/translators/services/translator-profile-service';
import { type TranslatorProfileRecord } from '@/features/translators/types';

export function useTranslatorProfile(translatorId?: string) {
  const { session } = useSession();
  const [record, setRecord] = useState<TranslatorProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const token = session?.token;
  const demo = !!session?.demo;
  const name = session?.name ?? '';
  const email = session?.email ?? '';
  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = demo ? demoTranslatorProfile(name, email, translatorId) : await readTranslatorProfile(token!, translatorId);
      if (active) { setRecord(result); setError(''); }
    };
    void load().catch(failure => { if (active) setError((failure as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, demo, name, email, translatorId, reload]);
  function retry() { setLoading(true); setError(''); setReload(current => current + 1); }
  return { record, loading, error, retry };
}
