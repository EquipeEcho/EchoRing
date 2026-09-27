# Echo Ring - Frontend

Portal responsivo da Alianca Traducoes, desenvolvido com TypeScript, React Native,
Expo SDK 57 e Expo Router. O foco desta entrega e a navegacao web em desktop e celular.
A saida web usa uma aplicacao de pagina unica (`web.output: single`), apropriada ao
portal autenticado. Na hospedagem, configure o fallback das rotas para `index.html`.

## Executar

Com Node.js 24 instalado, nesta pasta:

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run web -- --port 8081
```

Abra http://localhost:8081 para a landing page da Alianca Traducoes.
O acesso ao portal fica em `/login`. A previa local nao depende da API.
O Metro usa dois workers para limitar a carga durante a compilacao.

## Acesso demonstrativo

A landing page publica inclui solucoes de traducao, etapas do atendimento, FAQ e
formulario de orcamento com documentos. O mapa pontilhado, as rotas orbitais e as palavras flutuantes respeitam a
preferencia de movimento reduzido na web. O formulario centralizado usa tres etapas
(projeto, documentos e contato), preserva os dados ao voltar e permite inverter idiomas.

Por padrao, `EXPO_PUBLIC_REQUESTS_MODE=demo`: envie dados ficticios pelo site e
entre no portal para abrir **Solicitacoes** (ou **Pedidos** na barra mobile).
Pedidos, anexos e rascunhos ficam no `localStorage` deste navegador e sobrevivem
ao recarregamento. O app atualiza a caixa de entrada ao receber eventos do navegador
e a cada 30 segundos. O envio de orcamento e explicitamente simulado, sem e-mails.
Se o armazenamento estiver cheio ou indisponivel, o formulario informa a falha.

Use **Acessar demonstracao** na tela de login. Para testar os campos de credenciais:

- E-mail: `demo@echoring.local`
- Senha: `EchoRing2026!`

O acesso demonstrativo e uma simulacao e nao utiliza a autenticacao real. A sessao demonstrativa usa
`sessionStorage` na web, sobrevive ao recarregamento da mesma aba e e removida ao sair.
Senhas nao sao armazenadas. Em Android e iOS, tokens de contas reais ficam no
`expo-secure-store`; na web, ficam no `sessionStorage` apenas durante a aba atual.
A recuperacao de acesso e explicitamente simulada: nao envia e-mail nem altera senha.
Requisicoes e tarefas sao dados ficticios em memoria e voltam ao estado inicial ao recarregar.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| `src/app` | Rotas publicas e grupo protegido `(workspace)` |
| `src/features/auth` | Login por perfil, recuperacao de acesso e persistencia da sessao |
| `src/features/workspace` | Dados demonstrativos, telas e formularios |
| `src/features/users` | Cadastro e listagem de contas pelo administrador geral |
| `src/features/landing` | Site publico e formulario de solicitacao |
| `src/features/requests` | Caixa de entrada, documentos, rascunhos e envio de orcamento |
| `src/components/layout` | Menu lateral, cabecalho e navegacao mobile |
| `src/components/ui` | Botoes, campos visuais, textos, badges e dialogos |
| `src/constants/design.ts` | Cores, tipografia e breakpoint de navegacao |
| `tests` | Testes de navegacao, formularios e responsividade |

O visual usa fundo preto, superficies em grafite, texto claro e destaque rosa.
Desktop usa menu lateral; abaixo de 1000 px, a navegacao passa para a barra inferior
flutuante, com abas arredondadas. Login, listas e dialogos compartilham o mesmo tema.
As listas de projetos passam a apresentar cada registro verticalmente abaixo de 800 px.
O administrador geral possui a aba **Usuarios** para criar contas de funcionario,
tradutor e RH. Cadastros, financeiro, relatorios e administracao sao areas previstas, identificadas como
em preparacao. As demais interacoes implementadas incluem busca, filtros de status,
detalhes dos projetos, criacao de requisicao demonstrativa, tarefas e notificacoes.

## Verificar

```powershell
npm.cmd run typecheck
npm.cmd run test:e2e
```

Os testes exigem o servidor na porta 8081 (ou `E2E_BASE_URL`).
No Windows, usam Microsoft Edge instalado. Em outros sistemas, instale o Chromium
com `npx playwright install chromium`. Executam em 1440x1000 e 390x844, com verificacao
adicional em 320x740. Screenshots e traces ficam em `test-results/`.

## Recebimento real e e-mail

Siga o [guia do backend](../backend/README.md) para configurar a conta do tradutor,
o armazenamento e o provedor SMTP. O login real sempre usa `EXPO_PUBLIC_API_URL`,
independentemente do modo demonstrativo do formulario. Ative
`EXPO_PUBLIC_REQUESTS_MODE=api` no `.env` somente quando o formulario publico tambem
dever enviar dados reais, e reinicie o Expo. A conta entra pelo endpoint `/auth/login`.
O perfil `translator` ve somente seu espaco de projetos e tarefas; `hr` acessa as
areas de pessoas; `employee` atua na operacao; e `admin` tambem gerencia usuarios.
Pedidos do site ficam reservados a funcionarios e administradores. A demonstracao continua
isolada dos pedidos reais. O envio real exige a revisao e confirmacao do funcionario.
Uma falha da API nao salva o pedido na previa nem apresenta um sucesso falso.
Variaveis publicas nao devem conter credenciais. Projetos e tarefas demonstrativos
continuam separados da caixa de entrada.

No modo real, o e-mail de orcamento abre a rota publica `/orcamento/[id]`, onde o
cliente confirma aprovacao ou recusa usando o token pessoal recebido no fragmento
do link. Apos a aprovacao, a solicitacao permite selecionar um tradutor ativo e
criar a tarefa. A area **Entregas** mostra somente as tarefas do tradutor autenticado;
para funcionarios e administradores, ela apresenta as versoes aguardando avaliacao,
a solicitacao de revisao e o envio final ao cliente. Os dashboards reais carregam
as tarefas da API, enquanto o acesso demonstrativo mantem seus dados ficticios.

## Recursos visuais

Tipografia: Inter, incluida no bundle pelo pacote
`@expo-google-fonts/inter` (OFL-1.1). Os pesos regular, medio, semibold e bold
sao carregados localmente por `expo-font`, sem requisicoes a servicos de fontes externos.
Os tamanhos compartilhados e as cores ficam em `src/constants/design.ts`.

Icones: Lucide. A tela de acesso usa fundo preto e uma apresentacao tipografica
no desktop, com listas e icones rosa. O tema escuro tambem se aplica ao foco
de teclado e aos controles de formulario.
