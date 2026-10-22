export type ClientDraft = {
  name: string;
  email: string;
  company: string;
};

export type ClientProject = {
  id: string;
  title: string;
  service: string;
  status: string;
  requestStatus: string;
  createdAt: string;
};

export type Client = ClientDraft & {
  id: string;
  createdAt: string;
  projects: ClientProject[];
};
