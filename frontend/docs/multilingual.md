# Pedidos com vários idiomas

Um pedido da landing page pode conter um idioma de origem e vários idiomas de
destino. Todos os destinos usam os documentos originais anexados ao pedido. O
formulário permite adicionar e remover destinos, pesquisa o catálogo e rejeita
idiomas repetidos ou iguais à origem. A inversão está disponível com um só destino.

A equipe informa **valor e prazo por idioma**. O total é a soma desses valores;
o prazo geral corresponde ao último prazo informado. O e-mail detalha a proposta
e abre uma página pessoal, autenticada pelo token do link. Nessa página o cliente
pode aprovar todos ou apenas alguns idiomas. O total selecionado é mostrado antes
da confirmação e recalculado pelo servidor. A resposta é única e mantém o orçamento
original, os destinos aprovados e o valor efetivamente contratado.

O cadastro manual e a landing continuam usando o mesmo contrato e a validação
compartilhada. O recebimento público preserva a atualização dos contatos no MongoDB.
A lista de clientes mostra uma entrada por projeto, agregando o andamento dos
trabalhos por idioma sem duplicar a ordem.

O pedido funciona como ordem de serviço principal. Sua página detalha cada idioma,
aprovação, preço comercial, tradutor, prazo e status. Idiomas não aprovados não podem
receber ofertas nem atribuições. Cada idioma aprovado pode ser oferecido a
profissionais diferentes, inclusive com remuneração, prazo e workflow próprios.
Um profissional também pode assumir mais de um idioma se tiver os pares necessários.
O primeiro aceite encerra **somente os convites concorrentes daquele idioma**.

Cada trabalho mantém suas próprias versões, avaliação, ajustes e etapas. A entrega
de um idioma não finaliza a ordem: todos os idiomas aprovados precisam estar
entregues. Históricos dos trabalhos incluem os eventos comerciais compartilhados
e seus próprios eventos, sem misturar os eventos dos outros idiomas. A equipe pode
abrir a ordem principal a partir do cabeçalho de um trabalho em Entregas.

Os e-mails usam o serviço e os templates compartilhados da plataforma. Cada entrega
identifica o idioma correspondente; o aviso distingue uma entrega parcial da
conclusão de todos os idiomas aprovados. Notificações de atribuição e anexos das
entregas existentes são preservados.

## Contratos

- `POST /requests` aceita `targets: string[]`; `target` continua como primeiro
  destino para compatibilidade. Pedidos anteriores com somente `target` continuam válidos.
- O orçamento mantém `amount`, `delivery` e `message`, com `items` por idioma
  (`target`, `amount`, `delivery`). Pedidos de vários idiomas exigem todos os itens.
- `POST /quotes/{id}/preview` recebe `{ token }` e devolve apenas os dados da
  proposta. O token não é enviado na query string.
- `POST /quotes/{id}/decision` aceita `{ token, decision, targets }`. Aprovação
  de proposta com vários idiomas exige uma seleção não vazia. A API grava
  `approvedTargets` e `approvedAmount`; a recusa mantém a seleção aprovada vazia.
- Ofertas e atribuições recebem `target`. A consulta de tradutores compatíveis
  recebe `?target=...`. Em pedidos antigos de um destino, o campo é opcional.
- Solicitações retornam `tasks[]` com origem, destino, responsável, prazo e estado.
  O campo antigo `task` permanece nas solicitações de um idioma.

## Banco e validação

A migração `backend/migrations/003_multilingual.sql` preserva os registros existentes,
preenche o destino das ofertas anteriores e altera a unicidade de tarefas e aceites
para **solicitação + destino**. Convites pendentes são únicos por solicitação,
destino e tradutor. Os bloqueios transacionais do pedido continuam serializando
atribuições e aceites concorrentes. A migração é registrada e executada pelo
inicializador existente do PostgreSQL, junto da versão nova da API. Publique backend
e frontend juntos; a nova página do cliente precisa do endpoint de prévia.

Na pasta `frontend`, com Expo web na porta 8081 em modo demonstrativo:

```sh
npm run typecheck
npx playwright test tests/unit/quote-scope.spec.ts --project=unit
npx playwright test tests/e2e/multilingual.spec.ts --project=desktop --project=mobile
```

Na pasta `backend`, com as dependências e um PostgreSQL de desenvolvimento acessível:

```sh
python -m unittest tests.unit.test_translation_scope tests.unit.test_quote_decision tests.unit.test_translation_email
python -m unittest tests.integration.test_multilingual tests.integration.test_requests tests.integration.test_offers tests.integration.test_clients
```

Os testes de integração criam schemas temporários e isolados. Nenhum e-mail real é
enviado. O cenário com concorrência verifica que idiomas distintos podem ser aceitos
ao mesmo tempo e que apenas a entrega do último idioma aprovado encerra a ordem.
