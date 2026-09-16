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

Abra http://localhost:8081. O login e o dashboard demonstrativos nao dependem da API.
O Metro usa dois workers para limitar a carga durante a compilacao.

## Acesso demonstrativo

Use **Acessar demonstracao** na tela de login. Para testar os campos de credenciais:

- E-mail: `demo@echoring.local`
- Senha: `EchoRing2026!`

Esta e uma simulacao de frontend, sem autenticacao real. A sessao demonstrativa usa
`sessionStorage` na web, sobrevive ao recarregamento da mesma aba e e removida ao sair.
Senhas nao sao armazenadas nem enviadas. Nas plataformas nativas, a sessao fica em memoria.
A recuperacao de acesso e explicitamente simulada: nao envia e-mail nem altera senha.
Requisicoes e tarefas sao dados ficticios em memoria e voltam ao estado inicial ao recarregar.

## Estrutura

| Pasta | Responsabilidade |
| --- | --- |
| `src/app` | Rotas publicas e grupo protegido `(workspace)` |
| `src/features/auth` | Login, recuperacao de acesso e sessao demonstrativa |
| `src/features/workspace` | Dados demonstrativos, telas e formularios |
| `src/components/layout` | Menu lateral, cabecalho e navegacao mobile |
| `src/components/ui` | Botoes, campos visuais, textos, badges e dialogos |
| `src/constants/design.ts` | Cores, tipografia e breakpoint de navegacao |
| `tests` | Testes de navegacao, formularios e responsividade |

Desktop usa menu lateral; abaixo de 1000 px, a navegacao passa para a barra inferior.
As listas de projetos passam a apresentar cada registro verticalmente abaixo de 800 px.
Cadastros, financeiro, relatorios e administracao sao areas previstas, identificadas como
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

## Proxima integracao

Substituir o servico de sessao demonstrativa pelo contrato real da API e implementar
autorizacao no servidor. As protecoes do Expo Router controlam apenas a navegacao.
`EXPO_PUBLIC_API_URL` esta reservado para as chamadas HTTP; variaveis publicas nao
devem conter credenciais. O perfil demonstrativo atual e de funcionario.

## Recursos visuais

Icones: Lucide. Fotografia de escritorio usada como fundo decorativo de acesso:
[Unsplash](https://images.unsplash.com/photo-1497366754035-f200968a6e72).
A fotografia nao representa as instalacoes da Alianca Traducoes.
