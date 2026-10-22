import { BriefcaseBusiness, FileText, Globe2, Monitor } from 'lucide-react-native';

import { type Intake } from '@/features/requests/types';

export const landingServices = [
  {
    icon: FileText,
    title: 'Tradução de documentos',
    text: 'Documentos pessoais, acadêmicos e empresariais, com sentido e contexto preservados.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Tradução empresarial',
    text: 'Contratos, apresentações, relatórios e materiais corporativos.',
  },
  {
    icon: Monitor,
    title: 'Sites e conteúdo digital',
    text: 'Sites, aplicativos, materiais de marketing e conteúdo para redes sociais.',
  },
  {
    icon: Globe2,
    title: 'Tradução técnica',
    text: 'Manuais, documentação e conteúdos especializados em diversas áreas.',
  },
];

export const initialIntake: Intake = {
  name: '',
  email: '',
  company: '',
  title: '',
  service: 'Tradução técnica',
  source: 'Português (Brasil)',
  target: 'Inglês (EUA)',
  deadline: '',
  message: '',
  consent: false,
  attachments: [],
};
