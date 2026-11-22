import { useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';

import { initialIntake } from '@/features/landing/constants';
import { selectDocuments } from '@/features/requests/services/document-picker';
import { submitIntake } from '@/features/requests/services/request-service';
import { type Intake, type TranslationRequest } from '@/features/requests/types';
import { normalizeIntake, validateIntake } from '@/features/requests/utils/intake-validation';

export function useQuoteForm(onScrollToQuote: () => void) {
  const [step, setStep] = useState(0);
  const inputs = useRef<Record<string, TextInput | null>>({});
  const [data, setData] = useState<Intake>({ ...initialIntake });
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<TranslationRequest | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const navigate = useRef(onScrollToQuote);
  const previousStage = useRef({ step, receipt });
  useEffect(() => { navigate.current = onScrollToQuote; }, [onScrollToQuote]);
  useEffect(() => {
    if (previousStage.current.step === step && previousStage.current.receipt === receipt) return;
    previousStage.current = { step, receipt };
    Keyboard.dismiss();
    const frame = requestAnimationFrame(() => navigate.current());
    return () => cancelAnimationFrame(frame);
  }, [step, receipt]);
  function change(key: keyof Intake, value: string | boolean) {
    setData((current) => ({ ...current, [key]: value }));
    setInvalid((current) => current.filter((item) => item !== key));
    setError('');
  }
  async function attach() {
    setError('');
    setUploading(true);
    try {
      const files = await selectDocuments();
      if (files.length) setData((current) => ({ ...current, attachments: files }));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function advance() {
    if (step === 0) {
      const validation = validateIntake(data, 'project');
      if (validation.error) {
        setInvalid(validation.invalid);
        setError(validation.error);
        inputs.current[validation.invalid[0]]?.focus();
        return;
      }
    }
    setInvalid([]);
    setError('');
    setStep((current) => Math.min(current + 1, 2));
  }
  async function submit() {
    if (busy) return;
    const validation = validateIntake(data);
    if (validation.error) {
      setInvalid(validation.invalid);
      setError(validation.error);
      inputs.current[validation.invalid[0]]?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await submitIntake(normalizeIntake(data));
      setReceipt(result);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function registerInput(key: keyof Intake, input: TextInput | null) {
    inputs.current[key] = input;
  }
  return {
    step,
    setStep,
    registerInput,
    data,
    setData,
    error,
    setError,
    invalid,
    busy,
    uploading,
    receipt,
    setReceipt,
    privacy,
    setPrivacy,
    change,
    attach,
    advance,
    submit,
  };
}
export type QuoteForm = ReturnType<typeof useQuoteForm>;
