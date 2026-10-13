export type UserRole = 'admin' | 'translator' | 'employee' | 'hr';

export type Session = {
  name: string;
  email: string;
  role: UserRole;
  demo: boolean;
  token?: string;
  expires?: number;
};
