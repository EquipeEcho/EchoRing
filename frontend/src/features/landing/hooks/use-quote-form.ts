import { useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { initialIntake } from '@/features/landing/constants';
import { selectDocuments } from '@/features/requests/services/document-picker';
import { submitIntake } from '@/features/requests/services/request-service';
import { type Intake, type TranslationRequest } from '@/features/requests/types';

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
      const missing = (['title', 'source', 'target', 'message'] as const).filter(
        (key) => !data[key].trim(),
      );
      if (missing.length) {
        setInvalid([...missing]);
        setError('Preencha os campos obrigatórios para continuar.');
        inputs.current[missing[0]]?.focus();
        return;
      }
      if (data.source.trim().toLowerCase() === data.target.trim().toLowerCase()) {
        setInvalid(['target']);
        setError('Escolha um idioma de destino diferente do idioma de origem.');
        inputs.current.target?.focus();
        return;
      }
    }
    setInvalid([]);
    setError('');
    setStep((current) => Math.min(current + 1, 2));
    onScrollToQuote();
  }
  async function submit() {
    if (busy) return;
    const missing = (['name', 'email', 'title', 'source', 'target', 'message'] as const).filter(
      (key) => !data[key].trim(),
    );
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) && !missing.includes('email'))
      missing.push('email');
    if (missing.length || !data.consent) {
      setInvalid(missing);
      setError(
        'Preencha os campos obrigatórios, confira seu e-mail e autorize o contato para receber o orçamento.',
      );
      inputs.current[missing[0]]?.focus();
      return;
    }
    if (data.source.trim().toLowerCase() === data.target.trim().toLowerCase()) {
      setInvalid(['target']);
      setError('Escolha um idioma de destino diferente do idioma de origem.');
      inputs.current.target?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await submitIntake({
        ...data,
        name: data.name.trim(),
        email: data.email.trim(),
        title: data.title.trim(),
        source: data.source.trim(),
        target: data.target.trim(),
        message: data.message.trim(),
      });
      setReceipt(result);
      onScrollToQuote();
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
