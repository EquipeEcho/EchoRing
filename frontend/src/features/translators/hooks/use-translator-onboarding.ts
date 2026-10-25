import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/contexts/session-context';
import { emptyTranslatorProfile } from '@/features/translators/constants';
import { readTranslatorProfile, saveTranslatorProfile } from '@/features/translators/services/translator-profile-service';
import { type ProfileErrors, type TranslatorProfile } from '@/features/translators/types';
import { validateProfileDraft, validateProfileStep } from '@/features/translators/utils/profile-validation';

export function useTranslatorOnboarding() {
  const { session, updateAccount, signOut } = useSession();
  const [data, setData] = useState(() => emptyTranslatorProfile(session?.name ?? ''));
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [reload, setReload] = useState(0);
  const token = session?.token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    readTranslatorProfile(token).then(async record => {
      if (!active) return;
      if (record.completedAt && record.account.onboardingRequired === false) {
        await updateAccount(record.account);
        if (active) router.replace('/dashboard');
        return;
      }
      setData(record.profile);
      setLoadError('');
      const incomplete = [0, 1, 2].find(index => Object.keys(validateProfileStep(record.profile, index)).length > 0);
      setStep(incomplete ?? 3);
      setError('');
    }).catch(failure => {
      if (active) setLoadError((failure as Error).message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token, reload, updateAccount]);

  function change<Key extends keyof TranslatorProfile>(key: Key, value: TranslatorProfile[Key]) {
    setData(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setError('');
    setNotice('');
  }

  async function save(complete = false) {
    if (!token || busy) return false;
    if (!complete) {
      const invalid = validateProfileDraft(data);
      if (Object.keys(invalid).length) {
        setErrors(invalid);
        setStep(invalid.experienceYears ? 2 : 3);
        setError('Confira os campos destacados antes de salvar o rascunho.');
        return false;
      }
    }
    if (complete) {
      const invalid = [0, 1, 2, 3].map(index => validateProfileStep(data, index));
      const first = invalid.findIndex(fields => Object.keys(fields).length > 0);
      if (first !== -1) {
        setErrors(Object.assign({}, ...invalid));
        setStep(first);
        setError('Confira os campos obrigatórios antes de concluir.');
        return false;
      }
    }
    setBusy(true);
    setError('');
    try {
      const record = await saveTranslatorProfile(data, token, complete);
      if (complete) {
        await updateAccount(record.account);
        router.replace('/dashboard');
      } else {
        setNotice('Rascunho salvo. Você pode continuar depois, mesmo em outro dispositivo.');
      }
      return true;
    } catch (failure) {
      setError((failure as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    const invalid = validateProfileStep(data, step);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setError('Confira os campos obrigatórios desta etapa.');
      return;
    }
    if (await save()) setStep(current => Math.min(current + 1, 3));
  }

  function previous() {
    setStep(current => Math.max(current - 1, 0));
    setErrors({});
    setError('');
  }

  function retry() {
    setLoading(true);
    setLoadError('');
    setReload(current => current + 1);
  }

  async function saveAndExit() {
    if (await save()) signOut();
  }

  return { data, step, loading, loadError, busy, error, notice, errors, change, save, next, previous, retry, saveAndExit };
}
