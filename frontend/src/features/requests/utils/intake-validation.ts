import { type Intake } from '@/features/requests/types';
import { languageCode } from '@/data/language-options';
import { requestTargets } from '@/features/requests/utils/quote-scope';

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
  const codes = requestTargets(data).map(languageCode);
  const sameLanguages = Boolean(data.source.trim()) && codes.includes(languageCode(data.source));
  const invalidTargets = codes.some(code => !code) || new Set(codes).size !== codes.length;
  const targetError = sameLanguages && requestTargets(data).length === 1
    ? 'Escolha um idioma de destino diferente do idioma de origem.'
    : sameLanguages || invalidTargets ? 'Selecione idiomas de destino diferentes entre si e do idioma de origem.' : '';
  if (targetError) {
    if (!invalid.includes('target')) invalid.push('target');
    fieldErrors.target = targetError;
  }

  const error = hasOtherErrors
    ? stage === 'project'
      ? 'Preencha os campos obrigatórios para continuar.'
      : 'Preencha os campos obrigatórios, confira seu e-mail e autorize o contato para receber o orçamento.'
    : targetError;

  return { invalid, fieldErrors, error };
}

export function normalizeIntake(data: Intake): Intake {
  const targets = requestTargets(data).map(target => target.trim());
  return {
    ...data,
    name: data.name.trim(),
    email: data.email.trim(),
    company: data.company.trim(),
    title: data.title.trim(),
    service: data.service.trim(),
    source: data.source.trim(),
    target: targets[0] || '',
    targets,
    deadline: data.deadline.trim(),
    message: data.message.trim(),
  };
}
