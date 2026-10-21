export type ClientDraft = {
  name: string;
  email: string;
  company: string;
};

export type Client = ClientDraft & {
  id: string;
  createdAt: string;
};
