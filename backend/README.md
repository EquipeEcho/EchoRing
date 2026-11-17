# Recebimento de solicitações e orçamentos

O fluxo permite [vários idiomas no mesmo pedido](../frontend/docs/multilingual.md),
com aprovação parcial e trabalhos independentes, preservando o cadastro de clientes
e o serviço compartilhado de e-mails.

O formulário público envia pedidos para a API; a caixa de entrada privada permite
analisar documentos, salvar a proposta e enviar o orçamento pelo SMTP da empresa.
A persistência fica no PostgreSQL (usuários, sessões, solicitações, orçamentos,
tarefas, documentos, versões e histórico). Clientes e perfis de tradutor ficam no
MongoDB, respectivamente nas collections `clients` e `translator_profiles`.
Solicitações usam `JSONB` e os arquivos finais usam `BYTEA`; o runtime
não depende de SQLite.

## Rodar no Windows

Na pasta `backend`, com Python 3.13 ou superior:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

Antes da API, configure `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` no
`.env` e inicie os bancos com `docker compose up -d db-postgres db-mongo`. O Compose troca
somente `POSTGRES_HOST` para `db-postgres`; ao executar a API no Windows, use
`localhost`. `DATABASE_URL` pode substituir as variáveis separadas quando necessário.

Adicione as novas variáveis de `.env.example` ao seu `.env` caso ele já exista.
Configure primeiro `ADMIN_EMAIL`, `ADMIN_PASSWORD` (senha exclusiva de pelo menos
6 caracteres) e `ADMIN_NAME`. Essa conta recebe o perfil `admin` e pode cadastrar
contas de funcionário, tradutor e RH pela área **Usuários**. Configure também
`TRANSLATOR_EMAIL`, `TRANSLATOR_PASSWORD` (senha exclusiva de pelo menos
6 caracteres) e `TRANSLATOR_NAME`. Não há conta real com senha padrão. As credenciais
são transformadas em hash PBKDF2 no PostgreSQL e a resposta identifica o perfil como
`translator`. As sessões expiram em oito horas;
o logout revoga o token. O acesso demonstrativo do frontend não acessa pedidos reais.
As variáveis `STAFF_*` continuam disponíveis para a conta interna já existente. O backend
separa as permissões: tradutores não acessam os endpoints de solicitações da equipe.
Contas criadas pelo administrador são persistidas no PostgreSQL e já podem usar o login.
Novos tradutores criados pelo administrador recebem `onboardingRequired: true` e
concluem seu cadastro antes de acessar projetos e entregas. Contas que já existiam
e contas iniciais configuradas no ambiente mantêm o acesso anterior.
Clientes são gravados na collection `clients`, com e-mail normalizado e único.
O acesso demonstrativo do frontend não persiste clientes; é necessário entrar com
uma conta real de funcionário ou administrador para salvá-los no MongoDB.
Quando a landing page está em modo `api`, cada orçamento também cria ou atualiza
o cliente no MongoDB pelo e-mail. A listagem de clientes associa as solicitações
do PostgreSQL pelo mesmo e-mail e exibe os projetos com o status atual da tarefa,
quando houver, ou da solicitação.
Rascunhos e perfis completos ficam na collection `translator_profiles`,
com o id do usuário como `_id`. A conclusão salva o perfil no Mongo e só depois
atualiza o nome e libera o acesso no PostgreSQL; se o Mongo falhar, a conta continua
pendente e o tradutor pode tentar de novo. O schema do PostgreSQL é atualizado
automaticamente ao iniciar o acesso ao banco, sem excluir dados existentes.
Recuperação real de senha e alteração de senha ainda não estão implementadas.

No `frontend/.env`, ative:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_REQUESTS_MODE=api
```

Reinicie o Expo. A página `/` envia solicitações ao servidor; `/login` aceita a
conta configurada do tradutor ou da equipe, e `/solicitacoes` exibe os pedidos
recebidos apenas para a equipe.
Com `EXPO_PUBLIC_REQUESTS_MODE=demo` (padrão), pedidos e rascunhos da prévia ficam
somente no navegador. Não há troca automática para a prévia quando a API falha.

## E-mail da empresa

Configure apenas no `backend/.env`: `SMTP_HOST`, `SMTP_FROM`, `SMTP_PORT`,
`SMTP_SECURITY`, `SMTP_USER` e `SMTP_PASSWORD`. Defina também
`FRONTEND_PUBLIC_URL` com a URL pública HTTPS do frontend e, opcionalmente,
`QUOTE_RESPONSE_DAYS` (30 por padrão). Use `starttls`/587 ou `ssl`/465,
conforme o provedor. O remetente deve ser uma caixa autorizada pelo provedor e
capaz de receber as respostas dos clientes. Nunca coloque credenciais nas
variáveis `EXPO_PUBLIC_*`.

O funcionário salva o rascunho, revisa o destinatário, o valor e a mensagem e
confirma o envio. O status só muda após a aceitação pelo SMTP. Sem configuração
ou com falha, a proposta continua salva. Documentos não são anexados ao e-mail
de orçamento. O cliente recebe links de aprovação e recusa vinculados à proposta.
O token aleatório fica no fragmento da URL e somente seu hash é persistido; a
resposta é aceita uma única vez e expira no prazo configurado.
A aceitação pelo SMTP não garante a entrega na caixa de entrada. Em caso de
resposta ambígua do provedor, confira a caixa de saída antes de tentar novamente.
Se o processo for interrompido durante o envio, confira o provedor antes de
reconciliar o bloqueio `sending` do pedido no banco.

Além do orçamento, o sistema envia dois avisos automáticos em segundo plano: o
tradutor recebe um e-mail com link para o portal quando uma tarefa é atribuída a
ele, e o cliente recebe a tradução em anexo quando a equipe aprova a entrega.
Falhas nesses envios ficam registradas no log e não bloqueiam a atribuição nem
a aprovação. Com `EMAIL_DRY_RUN=true`, os e-mails aparecem no log em vez de serem enviados.

## Agente de estatística

O administrador pergunta em linguagem natural (ex.: "como está o lucro?") e o
agente responde usando o Gemini (Google AI Studio). Os números são calculados
em Python a partir do banco; o Gemini só escolhe qual cálculo usar e explica o
resultado, sem inventar valores. Cálculos disponíveis:

- Estatística descritiva do lucro: total, média, mediana e margem ponderada pela receita
- Tendência do lucro mensal por regressão linear e previsão do próximo mês
- Probabilidade de aprovação de um orçamento e valor esperado por orçamento enviado
- Gasto com cada tradutor

Receita é o valor aprovado do orçamento e custo é a soma de
`translator_compensation` das tarefas do pedido.

Configure no `backend/.env` a `GEMINI_API_KEY` (gerada em
https://aistudio.google.com/app/api-keys) e, opcionalmente, `GEMINI_MODEL`
(`gemini-3.1-flash-lite` por padrão). Nunca commite a chave. Sem chave, ou se o
Gemini não responder em 30 segundos, a rota retorna 503 com uma mensagem clara.

Para outros módulos (ex.: o orquestrador), a função de entrada é
`responder(pergunta)` em `app/services/statistics_agent.py`, que devolve o texto
da resposta.

## Financeiro do administrador

A aba Financeiro do app (somente administrador geral) consome
`GET /finance/overview`, que devolve num único JSON:

- `revenue`, `cost` e `balance`: receita aprovada, gasto com tradutores e saldo da empresa
- `averageProfit` e `approvedProjects`: lucro médio por projeto aprovado e quantidade
- `projects`: projetos aprovados com receita, custo e lucro, do mais lucrativo para o menos
- `translators` e `topTranslator`: total pago a cada tradutor, do maior para o menor, e o mais caro

Usa as mesmas regras do agente de estatística: receita é o valor aprovado do
orçamento e custo é a soma de `translator_compensation` das tarefas.

## Endpoints

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | `/requests` | Público, com consentimento e validação |
| POST | `/auth/login` | Credenciais de tradutor ou funcionário |
| GET | `/auth/me` | Bearer token; perfil da sessão |
| POST | `/auth/logout` | Bearer token; revoga a sessão |
| GET | `/users` | Somente administrador geral; lista contas sem senhas |
| POST | `/users` | Somente administrador geral; cria funcionário, tradutor ou RH |
| GET | `/translator-profile/me` | Tradutor autenticado; lê somente seu próprio cadastro |
| PATCH | `/translator-profile/me` | Tradutor com cadastro pendente; salva ou atualiza o rascunho |
| PUT | `/translator-profile/me` | Tradutor autenticado; valida e persiste seu perfil completo |
| GET | `/requests` | Bearer token; filtros, busca e paginação; anexos sem conteúdo na listagem |
| GET | `/requests/{id}` | Bearer token; detalhes e documentos |
| PATCH | `/requests/{id}` | Bearer token; análise e rascunho |
| POST | `/requests/{id}/send-quote` | Bearer token; envio da proposta salva |
| POST | `/requests/{id}/resend-quote` | Bearer token; reenvia orçamento sem resposta com link novo |
| POST | `/quotes/{quote_id}/decision` | Público; exige token pessoal válido e decisão única |
| POST | `/tracking/{id}` | Público; exige o token pessoal de acompanhamento |
| POST | `/requests/{id}/send-tracking` | Bearer token; envia um link de acompanhamento novo |
| GET | `/translators` | Funcionário/admin; lista tradutores ativos |
| POST | `/requests/{id}/assign` | Funcionário/admin; cria tarefa após aprovação |
| GET | `/tasks` | Tradutor vê somente as próprias; funcionário/admin vê a operação |
| GET | `/tasks/{id}` | Somente equipe ou tradutor atribuído |
| POST | `/tasks/{id}/start` | Somente tradutor atribuído |
| GET | `/tasks/{id}/attachments/{index}` | Download autenticado dos originais |
| POST | `/tasks/{id}/deliveries` | Somente tradutor atribuído; envia nova versão |
| GET | `/deliveries` | Funcionário/admin; fila e histórico de versões |
| POST | `/deliveries/{id}/review` | Funcionário/admin; aprova ou solicita revisão |
| POST | `/statistics/agent` | Somente administrador geral; pergunta ao agente de estatística |
| GET | `/finance/overview` | Somente administrador geral; resumo da aba Financeiro |

### Listagem de solicitações

`GET /requests` aceita os parâmetros abaixo, aplicados na consulta ao banco:

- `status`: grupos ou status exatos separados por vírgula, como `traducao` ou
  `pendente,Entregue`. Valores desconhecidos retornam 422.
- `search`: busca por protocolo, título, cliente, e-mail, empresa e idiomas, sem
  diferenciar maiúsculas nem acentos.
- `limit` (1 a 100, padrão 20) e `offset` (padrão 0).
- `attention=true`: somente solicitações que precisam de atenção (veja abaixo).

A resposta traz `items`, `total` (quantidade que atende a todos os filtros),
`limit`, `offset` e `counts`. As contagens consideram apenas a busca, para que as
abas e o filtro de status mostrem quantas solicitações existem em cada grupo:

| Grupo | Status |
| --- | --- |
| `pendente` | Recebido |
| `orcamento` | Em análise, Orçamento enviado, Orçamento simulado, Orçamento aprovado |
| `traducao` | Tradutor atribuído, Em andamento, Aguardando avaliação, Revisão solicitada |
| `concluido` | Pronta, Entregue |
| `cancelado` | Orçamento recusado |

Os grupos ficam em `app/core/request_groups.py` e são repetidos em
`frontend/src/features/requests/constants/status.ts`; altere os dois juntos.

`counts.attention` traz quantas solicitações da busca atual precisam de atenção.
Cada item inclui `quoteExpiresAt` quando há link de orçamento ativo; o hash do
token nunca é retornado.

### Solicitações que precisam de atenção

Uma solicitação entra no filtro `attention` quando:

- está em `Recebido` há 2 dias ou mais;
- está em `Orçamento enviado` sem resposta há 3 dias ou mais, ou com o link do
  cliente vencido ou vencendo em até 3 dias;
- não está concluída nem recusada e o prazo mais urgente vence até amanhã
  (horário de São Paulo) ou já passou. O prazo considerado é o da tarefa aberta
  mais próxima; sem tarefas, o prazo prometido no orçamento; antes do orçamento,
  o prazo pedido pelo cliente. Datas em texto livre, como "5 dias úteis", não
  geram alerta.

As regras ficam em `app/core/request_alerts.py` e são repetidas em
`frontend/src/features/requests/utils/request-alerts.ts`; altere os dois juntos.

`POST /requests/{id}/resend-quote` envia o mesmo orçamento como lembrete, com um
link pessoal novo e validade renovada (`QUOTE_RESPONSE_DAYS`). O link anterior
só deixa de valer depois que o provedor confirma o envio; se o envio falhar, ele
continua válido. O reenvio fica registrado no histórico como `Orçamento reenviado`.

### Acompanhamento do pedido pelo cliente

Quando o cliente aprova o orçamento, a API gera um token pessoal de
acompanhamento, salva só o hash e envia o e-mail "Pedido confirmado" com o link
`/acompanhar/{id}#token`. O token fica no fragmento da URL para não aparecer em
logs, e a página o retira da barra de endereço depois de ler. Uma falha nesse
e-mail fica só no log e não desfaz a aprovação.

`POST /tracking/{id}` recebe `{ "token": "..." }` e devolve apenas o que o
cliente pode ver: etapa atual, histórico das etapas públicas, previsão, valor
aprovado e situação de cada idioma. Tradutores, notas, documentos e etapas
internas ficam de fora; `Aguardando avaliação` e `Revisão solicitada` aparecem
como `Em andamento`, e o idioma correspondente como `Em revisão`. Token errado e
solicitação inexistente recebem a mesma resposta 403.

`POST /requests/{id}/send-tracking` envia um link novo (por exemplo, quando o
cliente perdeu o e-mail). O link anterior só deixa de valer depois que o
provedor confirma o envio. O envio fica no histórico como
`Link de acompanhamento enviado`.

## Fluxo operacional

O fluxo persistido é `Recebido → Em análise → Orçamento enviado → Orçamento
aprovado → Tradutor atribuído → Em andamento → Aguardando avaliação`. A avaliação
leva a `Revisão solicitada` (permitindo novas versões) ou `Entregue`; ao aprovar,
a tradução é enviada ao cliente por e-mail, com os arquivos em anexo. Uma recusa encerra a solicitação em
`Orçamento recusado`. As mudanças importantes são registradas em
`workflow_events`, com data, responsável e observação básica.

As rotas de tarefa verificam a atribuição no servidor. Um tradutor não consegue
listar, abrir, baixar originais nem enviar versões de tarefas pertencentes a outro
tradutor. O documento final só pode ser enviado a partir da versão mais recente
aprovada pela equipe.

São aceitos até três documentos PDF, DOCX ou TXT, com 2 MB por arquivo e 5 MB
no total. A API valida o conteúdo e limita o corpo da requisição a 8 MB.
O recebimento tem limite de dez pedidos por minuto por IP; o login, cinco
tentativas. Esses limites são locais ao processo. Na hospedagem, configure HTTPS,
as origens em `CORS_ORIGINS`, limites também no proxy e backup do volume `pg_data`.
A validação de formato não substitui antivírus nos documentos. O orçamento é
enviado na hora; os avisos ao tradutor e ao cliente vão em segundo plano.

## Migrar dados antigos do SQLite

Se `.local/requests.sqlite3` já existe, execute uma vez, na pasta `backend`, depois
de iniciar o PostgreSQL:

```powershell
.venv/Scripts/python.exe migrate_to_postgres.py --sqlite-path .local/requests.sqlite3
```

A importação inclui usuários, sessões, solicitações, tarefas, versões, documentos
e histórico. Ela registra a origem no PostgreSQL e é idempotente: repetir o comando
para o mesmo arquivo não duplica dados. Guarde um backup do SQLite até conferir a
migração; o script não apaga o arquivo de origem.

## Verificar sem enviar e-mails reais

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m unittest test_requests -v
```

Os testes criam e removem schemas PostgreSQL exclusivos, usam credenciais fictícias
e simulam o SMTP e o MongoDB. O PostgreSQL configurado no `.env` deve estar acessível.
