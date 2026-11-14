export type FinanceProject = {
  id: string;
  title: string;
  client: string;
  revenue: number;
  cost: number;
  profit: number;
};

export type TranslatorCost = {
  id: string;
  name: string;
  total: number;
  tasks: number;
};

export type FinanceOverview = {
  revenue: number;
  cost: number;
  balance: number;
  approvedProjects: number;
  averageProfit: number;
  projects: FinanceProject[];
  translators: TranslatorCost[];
  topTranslator: TranslatorCost | null;
};
