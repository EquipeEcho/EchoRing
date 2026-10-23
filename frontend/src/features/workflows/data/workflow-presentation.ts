import { AppWindow, BookOpen, Captions, FileCheck2, Languages, type LucideIcon } from 'lucide-react-native';

import { type WorkflowType } from '../types';

export const workflowPresentation: Record<WorkflowType, { icon: LucideIcon; input: string; output: string }> = {
  tep: { icon: BookOpen, input: 'Originais, briefing e glossário', output: 'Tradução revisada e validada' },
  mtpe: { icon: Languages, input: 'Texto-fonte, saída automática e referências', output: 'Conteúdo pós-editado e aprovado' },
  localization: { icon: AppWindow, input: 'Contexto, telas, strings e guia de estilo', output: 'Conteúdo localizado e testado' },
  documentary: { icon: FileCheck2, input: 'Documentos e requisitos de formalização', output: 'Documentos conferidos e formalizados' },
  subtitling: { icon: Captions, input: 'Vídeo, roteiro e guia de legendagem', output: 'Legendas sincronizadas e revisadas' },
};
