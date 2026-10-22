import { type Intake } from '@/features/requests/types';

export type IntakeFieldError = Partial<Record<keyof Intake, string>>;

export type IntakeValidation = {
  invalid: (keyof Intake)[];
  fieldErrors: IntakeFieldError;
  error: string;
};

export function validateIntake(data: Intake, stage: 'project' | 'complete' = 'complete'): IntakeValidation {
  const invalid: (keyof Intake)[] = [];
  const fieldErrors: IntakeFieldError = {};
  const projectFields = ['title', 'service', 'source', 'target', 'message'] as const;
  const contactFields = ['name', 'email'] as const;
  const requiredFields = stage === 'project' ? projectFields : [...contactFields, ...projectFields];

  for (const key of requiredFields) {
    if (!data[key].trim()) {
      invalid.push(key);
      fieldErrors[key] = 'Este campo é obrigatório.';
    }
  }

  if (stage === 'complete' && !invalid.includes('email') &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    invalid.push('email');
    fieldErrors.email = 'Informe um e-mail válido.';
  }

  if (stage === 'complete' && !data.consent) {
    invalid.push('consent');
    fieldErrors.consent = 'Confirme que o cliente autorizou o contato para receber o orçamento.';
  }

  const hasOtherErrors = invalid.length > 0;
  const sameLanguages = Boolean(
    data.source.trim() &&
      data.target.trim() &&
      data.source.trim().toLowerCase() === data.target.trim().toLowerCase(),
  );
  if (sameLanguages) {
    if (!invalid.includes('target')) invalid.push('target');
    fieldErrors.target = 'Escolha um idioma de destino diferente do idioma de origem.';
  }

  const error = hasOtherErrors
    ? stage === 'project'
      ? 'Preencha os campos obrigatórios para continuar.'
      : 'Preencha os campos obrigatórios, confira seu e-mail e autorize o contato para receber o orçamento.'
    : sameLanguages
      ? 'Escolha um idioma de destino diferente do idioma de origem.'
      : '';

  return { invalid, fieldErrors, error };
}

export function normalizeIntake(data: Intake): Intake {
  return {
    ...data,
    name: data.name.trim(),
    email: data.email.trim(),
    company: data.company.trim(),
    title: data.title.trim(),
    service: data.service.trim(),
    source: data.source.trim(),
    target: data.target.trim(),
    deadline: data.deadline.trim(),
    message: data.message.trim(),
  };
}
