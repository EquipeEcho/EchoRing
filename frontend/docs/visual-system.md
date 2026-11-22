# Sistema visual

A reformulação preserva Expo Router, os componentes compartilhados, os providers
de sessão e tema, os serviços de API e a separação por funcionalidades. O tema
escuro continua sendo o padrão; a preferência de tema mantém sua persistência.

## Mapa da plataforma

| Área | Telas e fluxos revisados |
| --- | --- |
| Site público | Hero, serviços, idiomas, processo, orçamento em três etapas, anexos, FAQ, privacidade e rodapé |
| Acesso | Login real e demonstrativo, senha visível, erros e recuperação de acesso |
| Orçamento público | Aprovação/recusa por link pessoal, confirmação, sucesso e erro |
| Portal | Menu por perfil, busca, notificações, conta, ajuda e navegação móvel |
| Projetos | Dashboard, operação, filtros, detalhes e nova requisição demonstrativa |
| Tarefas | Pendentes, concluídas, busca e atualização de estado |
| Solicitações | Caixa de entrada, documentos, orçamento e seleção/oferta de tradutor |
| Entregas | Tarefas do tradutor, upload, versões, feedback, revisão e envio ao cliente |
| Oportunidades | Busca, filtros, condições, remuneração e confirmação de aceite/recusa |
| Workflows | Acompanhamento, biblioteca de modelos, mapa, etapas e controles |
| Pessoas | Usuários, criação de acessos, onboarding, perfil próprio/equipe e edição |
| Outras áreas | Mais, cadastros, financeiro, relatórios e administração; módulos em preparação continuam identificados como tal |

## Diagnóstico

- Cores locais quase pretas e rosas divergiam dos tokens em campos, cards e modais.
- Tamanhos de texto, margens, raios e filtros variavam entre funcionalidades.
- Legendas de 9–10 px e superfícies pouco diferenciadas reduziam a legibilidade.
- Tabelas decidiam seu formato pela largura da janela, mesmo dentro de colunas estreitas.
- Faixas laterais e ações de anexos consumiam espaço excessivo em celulares.
- Glows, bordas de destaque e ornamentos competiam com as ações principais.

## Identidade e componentes

Os tokens em `src/theme/tokens.ts` definem grafite azulado no tema escuro,
superfícies brancas sobre cinza suave no claro e rosa como cor da marca. Verde,
âmbar, vermelho e azul continuam reservados aos significados dos estados. Texto
sobre destaque utiliza `onAccent`, inclusive nos estados hover.

Inter permanece incluída localmente. Títulos do portal usam 32–36 px no desktop
e 26–28 px no celular; corpo e campos usam 14–16 px. Metadados têm contraste
próprio, sem reduzir a opacidade de todo o componente.

- Ritmo: 4, 8, 12, 16, 24, 32 e 48 px (`spacing`).
- Raios: 8 px para detalhes, 10 px para controles, 16 px para cards e 24 px para grandes superfícies (`radius`).
- Conteúdo: até 1400 px; formulários concentrados em até 880 px (`layout`).
- Botões: ação principal preenchida; secundária neutra com borda; ação contextual discreta.
- Campos: altura habitual de 48 px, rótulos persistentes, borda visível e foco explícito.
- Cards: superfície e borda discretas; grupos de conteúdo separados por espaço e títulos.
- Filtros: seleção perceptível, rótulo legível e adaptação à largura disponível.
- Modais: cabeçalho, conteúdo rolável e controles de fechar; foco contido, Escape e retorno de foco preservados.
- Feedback: estados vazios com orientação; erros visíveis e ações existentes de tentar novamente.

Use `PageHeading spacing="flush"` quando o contêiner já define o espaçamento
entre seções. A opção padrão mantém a margem para as páginas sem `gap` próprio.
Listas inseridas em colunas devem medir sua própria largura com `onLayout`.
Não derive a capacidade de uma tabela apenas da largura total da janela.

## Verificação

Na pasta `frontend`, execute `npm.cmd run typecheck`, `npm.cmd run lint` e
`npm.cmd run test:unit`. Com o servidor web na porta 8081, os testes Playwright
verificam navegação, temas, contraste, formulários e fluxos em desktop/celular.
Os testes de integração de interface usam interceptações de API; isso não
substitui a validação com uma API real de teste. O cenário `offers-real-api`
exige explicitamente um backend isolado configurado.

## Limites de integração existentes

O fluxo principal usa a API: solicitação pública em modo `api`, orçamento,
decisão do cliente, ofertas/aceite, tarefas, arquivos, avaliações e workflows.
Cadastro, onboarding e perfis também têm persistência no backend.

Ainda não se pode considerar toda a plataforma pronta para produção:

- `/operacao/nova` cria somente um projeto em memória, inclusive quando acessado por uma conta real. Esse registro não é persistido no backend.
- `/recuperar-senha` apenas simula a recuperação; não envia e-mail nem altera a senha.
- Cadastros, financeiro, relatórios e administração possuem seções em preparação.
- O envio público depende de `EXPO_PUBLIC_REQUESTS_MODE=api`. Contas demonstrativas e dados locais permanecem separados das contas reais.
- E-mails reais exigem SMTP configurado. Testes com `AUTO_APPROVE_QUOTES` ou `EMAIL_DRY_RUN` não comprovam entrega de mensagens.

Esses limites antecedem a reformulação visual e não foram substituídos por
sucessos simulados nesta entrega. Devem ser resolvidos antes de declarar o fluxo
inteiro pronto para uso real.
