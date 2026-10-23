import { type WorkflowTemplate } from '../types';

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'tep', title: 'Tradução tradicional (TEP)', shortTitle: 'TEP',
    description: 'Tradução humana, revisão independente e verificação final para uma entrega consistente.',
    useWhen: 'Manuais, conteúdos institucionais, artigos e projetos que exigem tradução humana e revisão bilíngue.',
    guidance: 'O revisor deve ser uma pessoa diferente do tradutor. QA reúne verificações linguísticas e técnicas; não substitui a revisão.',
    stages: [
      { id: 'preparation', title: 'Preparação', role: 'employee', description: 'Conferir o escopo, preparar os arquivos e alinhar as instruções com o tradutor.', requirements: ['Originais legíveis e editáveis', 'Par de idiomas, público e prazo definidos'], deliverables: ['Briefing validado e arquivos organizados', 'Glossário e guia de estilo disponíveis'] },
      { id: 'translation', title: 'Tradução', role: 'translator', description: 'Traduzir o conteúdo e realizar a autoverificação, registrando dúvidas de terminologia.', requirements: ['Briefing e materiais de referência', 'Terminologia e formato de saída acordados'], deliverables: ['Texto integral traduzido', 'Registro de dúvidas e decisões terminológicas'] },
      { id: 'revision', title: 'Revisão', role: 'reviewer', description: 'Comparar original e tradução, verificando sentido, omissões, terminologia e fluidez.', requirements: ['Tradução completa e original', 'Revisor independente designado'], deliverables: ['Versão revisada e comentários resolvidos'] },
      { id: 'qa', title: 'Controle de qualidade', role: 'reviewer', description: 'Verificar números, nomes, consistência, formatação e integridade dos arquivos.', requirements: ['Versão revisada', 'Checklist de qualidade e especificações do cliente'], deliverables: ['Checklist de QA concluído', 'Arquivos finais sem pendências críticas'] },
      { id: 'delivery', title: 'Entrega', role: 'employee', description: 'Conferir o pacote final e encaminhar os arquivos pelo canal combinado.', requirements: ['QA aprovado', 'Versões e nomes de arquivo conferidos'], deliverables: ['Pacote final entregue', 'Confirmação e registro de entrega'] },
    ],
  },
  {
    id: 'mtpe', title: 'Pós-edição de tradução automática (MTPE)', shortTitle: 'MTPE',
    description: 'Pós-edição humana de conteúdo traduzido por máquina, com revisão e controle de qualidade.',
    useWhen: 'Conteúdo com saída de tradução automática disponível e escopo de pós-edição previamente acordado.',
    guidance: 'Este modelo considera pós-edição completa. Alinhe a qualidade esperada e a autorização de uso da tradução automática antes de começar.',
    stages: [
      { id: 'preparation', title: 'Preparação', role: 'employee', description: 'Avaliar a saída automática, confirmar o nível de pós-edição e preparar as referências.', requirements: ['Original e saída automática alinhados', 'Uso da ferramenta autorizado e escopo acordado'], deliverables: ['Briefing de pós-edição', 'Amostra avaliada e glossário disponível'] },
      { id: 'post-editing', title: 'Pós-edição', role: 'translator', description: 'Corrigir sentido, omissões, acréscimos indevidos e linguagem artificial em todos os segmentos.', requirements: ['Saída automática e texto-fonte', 'Critérios de qualidade definidos'], deliverables: ['Texto pós-editado integralmente', 'Dúvidas e inconsistências registradas'] },
      { id: 'revision', title: 'Revisão', role: 'reviewer', description: 'Verificar a fidelidade ao original e a naturalidade do texto pós-editado.', requirements: ['Pós-edição concluída', 'Original e referências do projeto'], deliverables: ['Versão revisada', 'Ocorrências críticas resolvidas'] },
      { id: 'qa', title: 'QA', role: 'reviewer', description: 'Checar segmentos, números, tags, terminologia e consistência do conteúdo.', requirements: ['Versão revisada', 'Checklist técnico e linguístico'], deliverables: ['Relatório de QA', 'Arquivos validados'] },
      { id: 'delivery', title: 'Entrega', role: 'employee', description: 'Validar o pacote e enviar a versão final no formato solicitado.', requirements: ['QA aprovado', 'Formato de entrega confirmado'], deliverables: ['Pacote final e registro de entrega'] },
    ],
  },
  {
    id: 'localization', title: 'Localização', shortTitle: 'Localização',
    description: 'Adaptação de interfaces e conteúdos ao idioma, à cultura e ao contexto de uso.',
    useWhen: 'Sites, aplicativos, jogos e produtos digitais que precisam funcionar em outro mercado.',
    guidance: 'Preserve variáveis, tags e chaves. Valide o texto em contexto e combine critérios de aprovação com a equipe do produto.',
    stages: [
      { id: 'context', title: 'Análise de contexto', role: 'employee', description: 'Reunir telas, jornadas, restrições de interface e objetivos do mercado de destino.', requirements: ['Arquivos de strings e acesso ao contexto', 'Mercado, tom de voz e limites de caracteres'], deliverables: ['Briefing de localização', 'Glossário e capturas de referência'] },
      { id: 'adaptation', title: 'Adaptação linguística', role: 'translator', description: 'Adaptar mensagens, referências culturais, datas e formatos preservando as variáveis.', requirements: ['Contexto e guia de estilo', 'Chaves e variáveis identificadas'], deliverables: ['Recursos localizados', 'Dúvidas de contexto documentadas'] },
      { id: 'revision', title: 'Revisão', role: 'reviewer', description: 'Revisar consistência, adequação cultural e clareza dos textos em contexto.', requirements: ['Recursos localizados e referências', 'Terminologia aprovada'], deliverables: ['Conteúdo revisado e validado linguisticamente'] },
      { id: 'testing', title: 'Testes', role: 'reviewer', description: 'Verificar truncamentos, quebras de layout, variáveis e textos no produto.', requirements: ['Versão de teste com o conteúdo aplicado', 'Cenários e dispositivos definidos'], deliverables: ['Relatório de testes linguísticos', 'Correções verificadas em contexto'] },
      { id: 'approval', title: 'Aprovação', role: 'employee', description: 'Consolidar os resultados e obter a aprovação do responsável pelo produto.', requirements: ['Testes concluídos e pendências resolvidas', 'Responsável pela aprovação definido'], deliverables: ['Pacote aprovado para publicação', 'Registro de aceite'] },
    ],
  },
  {
    id: 'documentary', title: 'Tradução juramentada/documental', shortTitle: 'Documental',
    description: 'Conferência documental, tradução fiel e formalização conforme a finalidade do documento.',
    useWhen: 'Certidões, diplomas, históricos e outros documentos destinados a processos formais.',
    guidance: 'Confirme com a equipe as exigências do destinatário. Quando houver exigência de tradução juramentada, a tradução e a formalização cabem ao profissional habilitado.',
    stages: [
      { id: 'analysis', title: 'Análise dos documentos', role: 'employee', description: 'Conferir legibilidade, páginas, finalidade e exigências de apresentação.', requirements: ['Documentos completos e legíveis', 'Destino e exigências informados pelo solicitante'], deliverables: ['Inventário de documentos', 'Escopo e pendências confirmados'] },
      { id: 'translation', title: 'Tradução', role: 'translator', description: 'Traduzir fielmente nomes, datas, campos, carimbos e observações pertinentes.', requirements: ['Documentos conferidos', 'Profissional habilitado quando exigido'], deliverables: ['Tradução integral', 'Dúvidas documentais registradas'] },
      { id: 'checking', title: 'Conferência', role: 'reviewer', description: 'Conferir os dados com o original, incluindo nomes próprios, números e referências.', requirements: ['Original e tradução', 'Checklist de dados e integridade'], deliverables: ['Dados e conteúdo conferidos', 'Pendências encaminhadas ao tradutor'] },
      { id: 'formalization', title: 'Formalização', role: 'translator', description: 'Preparar a apresentação final e, quando aplicável, os elementos de formalização pelo profissional habilitado.', requirements: ['Conferência concluída', 'Requisitos do destinatário confirmados'], deliverables: ['Documento final formalizado conforme o escopo'] },
      { id: 'delivery', title: 'Entrega', role: 'employee', description: 'Encaminhar o documento no meio acordado e registrar o recebimento.', requirements: ['Versão final conferida', 'Canal e destinatário confirmados'], deliverables: ['Documentos entregues', 'Comprovante ou confirmação de recebimento'] },
    ],
  },
  {
    id: 'subtitling', title: 'Legendagem', shortTitle: 'Legendagem',
    description: 'Tradução audiovisual com sincronização, legibilidade e revisão junto ao vídeo.',
    useWhen: 'Vídeos institucionais, aulas, entrevistas e conteúdos audiovisuais com legendas traduzidas.',
    guidance: 'Limites de caracteres, velocidade de leitura e temporização dependem do idioma e da plataforma. Use o guia acordado no projeto.',
    stages: [
      { id: 'preparation', title: 'Preparação', role: 'employee', description: 'Conferir vídeo, áudio, roteiro, taxa de quadros e especificações das legendas.', requirements: ['Vídeo de referência e áudio acessível', 'Guia de legendagem e formato de saída'], deliverables: ['Materiais organizados', 'Briefing audiovisual validado'] },
      { id: 'translation', title: 'Tradução', role: 'translator', description: 'Traduzir e condensar as falas preservando intenção, contexto e naturalidade.', requirements: ['Vídeo e roteiro ou transcrição', 'Glossário e critérios de leitura'], deliverables: ['Texto das legendas traduzido', 'Termos e dúvidas documentados'] },
      { id: 'synchronization', title: 'Sincronização', role: 'translator', description: 'Ajustar entradas, saídas e segmentação em relação ao áudio e aos cortes de cena.', requirements: ['Legendas traduzidas e vídeo de referência', 'Critérios de tempo e velocidade de leitura'], deliverables: ['Arquivo de legendas sincronizado', 'Quebras de linha e duração verificadas'] },
      { id: 'revision', title: 'Revisão', role: 'reviewer', description: 'Assistir ao conteúdo com as legendas, verificando tradução, leitura e sincronismo.', requirements: ['Arquivo sincronizado', 'Vídeo e guia da plataforma'], deliverables: ['Legendas revisadas em reprodução', 'Checklist audiovisual concluído'] },
      { id: 'delivery', title: 'Entrega', role: 'employee', description: 'Validar codificação e formato e enviar os arquivos finais.', requirements: ['Revisão aprovada', 'Formato solicitado, como SRT ou VTT'], deliverables: ['Arquivo final de legendas', 'Registro de entrega'] },
    ],
  },
];
