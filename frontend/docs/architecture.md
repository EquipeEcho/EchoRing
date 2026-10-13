# Organização do frontend

O frontend usa Expo Router e está organizado por funcionalidade. Uma alteração na
página pública começa em `src/features/landing`; uma alteração no portal começa
na funcionalidade correspondente. Os nomes das pastas e dos arquivos usam inglês
e `kebab-case`; os endereços das páginas continuam em português.

## Estrutura principal

```text
frontend/
├── assets/images/
│   ├── brand/                 # Marca e ícones da aplicação
│   ├── landing/               # Imagens da página pública
│   └── previews/              # Imagens de apresentação
├── docs/                      # Documentação do frontend
├── src/
│   ├── app/                   # Rotas e layouts do Expo Router
│   ├── components/ui/         # Componentes visuais compartilhados
│   │   └── fields/            # Seletores de opções e datas
│   ├── features/
│   │   ├── auth/              # Acesso, recuperação e sessão
│   │   ├── deliveries/        # Traduções, avaliação e entrega
│   │   ├── landing/           # Página pública e orçamento
│   │   ├── requests/          # Solicitações e fluxo comercial
│   │   ├── users/             # Gestão de usuários
│   │   └── workspace/         # Portal, projetos e tarefas
│   ├── lib/
│   │   ├── api/               # Cliente HTTP compartilhado
│   │   └── documents/         # Downloads na web e no aplicativo
│   ├── styles/                # CSS global da web
│   ├── theme/                 # Tokens e estilos compartilhados
│   ├── types/                 # Modelos usados por mais de uma funcionalidade
│   └── utils/                 # Funções utilitárias sem estado
└── tests/
    ├── e2e/                   # Fluxos de navegação e testes de interface
    └── fixtures/              # Arquivos de exemplo usados nos testes
```

As configurações exigidas pelas ferramentas ficam na raiz de `frontend`, junto
com `package.json`: `app.json`, `tsconfig.json`, configurações do Metro, ESLint e
Playwright. O `.env.example` documenta as variáveis locais.

## Responsabilidades dentro de uma funcionalidade

Crie apenas as pastas necessárias à funcionalidade.

| Arquivo ou pasta               | Responsabilidade                                          |
| ------------------------------ | --------------------------------------------------------- |
| `screens/`                     | Composição visual de uma página                           |
| `components/`                  | Partes da interface específicas da funcionalidade         |
| `hooks/`                       | Estado da tela, filtros, validações e ações               |
| `contexts/`                    | Estado compartilhado e seus providers e hooks de acesso   |
| `services/`                    | Integração com a API, armazenamento e seleção de arquivos |
| `styles/`                      | Estilos das telas e dos componentes da funcionalidade     |
| `data/`                        | Dados fictícios para demonstração                         |
| `constants.ts` ou `constants/` | Configurações e valores fixos                             |
| `types.ts`                     | Modelos e contratos da funcionalidade                     |
| `navigation/`                  | Definição dos módulos e da navegação por perfil           |
| `layout/`                      | Estrutura visual compartilhada do portal                  |
| `utils/`                       | Funções puras específicas da funcionalidade               |

## Onde começar uma alteração

| Alteração                                         | Arquivo ou pasta inicial                              |
| ------------------------------------------------- | ----------------------------------------------------- |
| Composição da página inicial                      | `src/features/landing/screens/landing-screen.tsx`     |
| Cabeçalho, hero, serviços, idiomas, FAQ ou rodapé | `src/features/landing/components/`                    |
| Formulário público de orçamento                   | `src/features/landing/components/quote-section.tsx`   |
| Validação e envio desse formulário                | `src/features/landing/hooks/use-quote-form.ts`        |
| Login e recuperação de senha                      | `src/features/auth/screens/`                          |
| Sessão autenticada                                | `src/features/auth/contexts/session-context.tsx`      |
| Menu do portal e acesso por perfil                | `src/features/workspace/navigation/modules.ts`        |
| Menu lateral, cabeçalho e barra mobile            | `src/features/workspace/layout/workspace-shell.tsx`   |
| Dashboard, operação, tarefas e áreas              | `src/features/workspace/screens/`                     |
| Solicitações e orçamento da equipe                | `src/features/requests/screens/`                      |
| Ações do fluxo comercial                          | `src/features/requests/hooks/use-request-workflow.ts` |
| Traduções e avaliações                            | `src/features/deliveries/screens/`                    |
| Cadastro e filtros de usuários                    | `src/features/users/hooks/use-user-management.ts`     |
| Cores, tipografia e breakpoints                   | `src/theme/tokens.ts`                                 |
| Requisições HTTP compartilhadas                   | `src/lib/api/client.ts`                               |

## Convenções para novas alterações

- Mantenha `src/app` dedicado às rotas. Importe a tela da funcionalidade e coloque
  ali somente a composição de layouts e as verificações de acesso necessárias.
- Use o alias `@/` para importar arquivos de `src` e `@/assets/` para imagens.
  Prefira importar o arquivo responsável diretamente.
- Coloque um componente em `src/components/ui` quando ele for genérico e usado
  por funcionalidades diferentes. Componentes específicos ficam na funcionalidade.
- Use `src/theme/tokens.ts` para cores e tipografia compartilhadas. Componentes
  pequenos da UI mantêm seus estilos no próprio arquivo; telas usam `styles/`.
- Centralize chamadas HTTP em `src/lib/api/client.ts`. Os serviços de cada
  funcionalidade definem os endpoints e os contratos usados pelo frontend.
- Separe dados demonstrativos em `data/` e persistência em `services/`.
- Mantenha os tipos locais em `types.ts`; mova para `src/types` os modelos
  efetivamente compartilhados. Use `import type` quando o import for só de tipo.
- Evite colocar regras de domínio ou providers nas pastas de componentes genéricos.
- Guarde testes de interface em `tests/e2e` e documentos fictícios em
  `tests/fixtures`. Caminhos das fixtures são relativos à raiz de `frontend`.

## Verificação

Na pasta `frontend`, execute:

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

Para verificar os fluxos em desktop e celular, inicie o servidor web na porta
8081 e execute `npm.cmd run test:e2e` em outro terminal. Use
`EXPO_PUBLIC_REQUESTS_MODE=demo` para os testes do formulário demonstrativo;
os testes de integração interceptam as chamadas HTTP com dados fictícios.
