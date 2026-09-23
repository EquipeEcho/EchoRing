# Recebimento de solicitações e orçamentos

O formulário público envia pedidos para a API; a caixa de entrada privada permite
analisar documentos, salvar a proposta e enviar o orçamento pelo SMTP da empresa.
Toda a persistência da aplicação fica no PostgreSQL: usuários, sessões,
solicitações, orçamentos, tarefas, documentos, versões e histórico. Solicitações
usam `JSONB` e os arquivos finais usam `BYTEA`; o runtime não depende de SQLite.

## Rodar no Windows

Na pasta `backend`, com Python 3.13 ou superior:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

Antes da API, configure `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` no
`.env` e inicie o banco com `docker compose up -d db-postgres`. O Compose troca
somente `POSTGRES_HOST` para `db-postgres`; ao executar a API no Windows, use
`localhost`. `DATABASE_URL` pode substituir as variáveis separadas quando necessário.

Adicione as novas variáveis de `.env.example` ao seu `.env` caso ele já exista.
Configure primeiro `ADMIN_EMAIL`, `ADMIN_PASSWORD` (senha exclusiva de pelo menos
12 caracteres) e `ADMIN_NAME`. Essa conta recebe o perfil `admin` e pode cadastrar
contas de funcionário, tradutor e RH pela área **Usuários**. Configure também
`TRANSLATOR_EMAIL`, `TRANSLATOR_PASSWORD` (senha exclusiva de pelo menos
12 caracteres) e `TRANSLATOR_NAME`. Não há conta real com senha padrão. As credenciais
são transformadas em hash PBKDF2 no PostgreSQL e a resposta identifica o perfil como
`translator`. As sessões expiram em oito horas;
o logout revoga o token. O acesso demonstrativo do frontend não acessa pedidos reais.
As variáveis `STAFF_*` continuam disponíveis para a conta interna já existente. O backend
separa as permissões: tradutores não acessam os endpoints de solicitações da equipe.
Contas criadas pelo administrador são persistidas no PostgreSQL e já podem usar o login.
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

## Endpoints

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | `/requests` | Público, com consentimento e validação |
| POST | `/auth/login` | Credenciais de tradutor ou funcionário |
| GET | `/auth/me` | Bearer token; perfil da sessão |
| POST | `/auth/logout` | Bearer token; revoga a sessão |
| GET | `/users` | Somente administrador geral; lista contas sem senhas |
| POST | `/users` | Somente administrador geral; cria funcionário, tradutor ou RH |
| GET | `/requests` | Bearer token; anexos sem conteúdo na listagem |
| GET | `/requests/{id}` | Bearer token; detalhes e documentos |
| PATCH | `/requests/{id}` | Bearer token; análise e rascunho |
| POST | `/requests/{id}/send-quote` | Bearer token; envio da proposta salva |
| POST | `/quotes/{quote_id}/decision` | Público; exige token pessoal válido e decisão única |
| GET | `/translators` | Funcionário/admin; lista tradutores ativos |
| POST | `/requests/{id}/assign` | Funcionário/admin; cria tarefa após aprovação |
| GET | `/tasks` | Tradutor vê somente as próprias; funcionário/admin vê a operação |
| GET | `/tasks/{id}` | Somente equipe ou tradutor atribuído |
| POST | `/tasks/{id}/start` | Somente tradutor atribuído |
| GET | `/tasks/{id}/attachments/{index}` | Download autenticado dos originais |
| POST | `/tasks/{id}/deliveries` | Somente tradutor atribuído; envia nova versão |
| GET | `/deliveries` | Funcionário/admin; fila e histórico de versões |
| POST | `/deliveries/{id}/review` | Funcionário/admin; aprova ou solicita revisão |
| POST | `/tasks/{id}/send-final` | Funcionário/admin; envia o arquivo aprovado ao cliente |

## Fluxo operacional

O fluxo persistido é `Recebido → Em análise → Orçamento enviado → Orçamento
aprovado → Tradutor atribuído → Em andamento → Aguardando avaliação`. A avaliação
leva a `Revisão solicitada` (permitindo novas versões) ou `Pronta`; o envio SMTP
do anexo final conclui em `Entregue`. Uma recusa encerra a solicitação em
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
A validação de formato não substitui antivírus nos documentos. O envio de e-mail
continua síncrono, sem fila em segundo plano.

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
e simulam o SMTP. O PostgreSQL configurado no `.env` deve estar acessível.
