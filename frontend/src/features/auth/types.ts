export type UserRole = 'admin' | 'translator' | 'employee' | 'hr';

export type Session = {
  name: string;
  email: string;
  role: UserRole;
  demo: boolean;
  token?: string;
  expires?: number;
  onboardingRequired?: boolean;
};

export type Account = Pick<Session, 'name' | 'email' | 'role' | 'onboardingRequired'>;

export function needsTranslatorOnboarding(session: Session | null) {
  return session?.role === 'translator' && !session.demo && session.onboardingRequired === true;
}
