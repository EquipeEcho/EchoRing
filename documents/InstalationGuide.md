### 🚀 Guia de Instalação e Execução (Docker)

Este projeto utiliza **Docker** para garantir que o ambiente de desenvolvimento seja idêntico para toda a equipe. Não é necessário instalar Python, Node.js ou os bancos de dados localmente.

#### 📋 Pré-requisitos
* [Git](https://git-scm.com/) instalado na máquina.
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.
* **Aviso importante:** Certifique-se de que o aplicativo do Docker Desktop esteja **aberto e rodando em segundo plano** (status "Engine running") antes de prosseguir.

#### 🛠️ Passos para rodar o projeto

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/EquipeEcho/EchoRing.git
   ```

2. **Acesse a pasta e vá para a branch de trabalho:**
   ```bash
   cd EchoRing
   git checkout develop
   ```

3. **Configure o ambiente e suba a infraestrutura completa:**
   Na raiz do projeto (onde está o arquivo `docker-compose.yml`), copie os exemplos:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Defina no `backend/.env` uma senha local em `POSTGRES_PASSWORD`, uma senha de
   compatibilidade em `MONGO_INITDB_ROOT_PASSWORD` e as contas da aplicação. Não
   publique esse arquivo. Depois execute:
   ```bash
   docker compose up -d --build
   ```
   > **Nota:** Na primeira vez, esse comando pode levar alguns minutos, pois o Docker fará o download das imagens do PostgreSQL, MongoDB, Node e Python. O MongoDB permanece somente para compatibilidade com trabalhos da equipe; a API principal persiste tudo no PostgreSQL.

#### 🌐 Acessando a Aplicação
Quando o terminal indicar que todos os contêineres foram iniciados (`Started` / `Running`), abra o seu navegador nos seguintes endereços:

* **Interface (Frontend - Expo):** [http://localhost:8081](http://localhost:8081)
* **API (Backend - FastAPI):** [http://localhost:8000](http://localhost:8000)

## Desenvolvimento local no Windows

Para editar com recarga automatica, execute Expo e FastAPI no Windows e mantenha
somente PostgreSQL no Docker. Este modo evita precisar baixar as imagens
Node e Python do Docker Hub. As imagens dos bancos ainda precisam estar disponiveis.

Pre-requisitos: Docker Desktop iniciado, Node.js 24 e Python 3.13 ou 3.14.
O ambiente local foi preparado com Python 3.14; o Dockerfile continua usando 3.13.

### Preparacao inicial (uma vez)

Na raiz do repositorio, em PowerShell:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd ci --prefix frontend
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
if (-not (Test-Path frontend\.env)) { Copy-Item frontend\.env.example frontend\.env }
docker compose up -d db-postgres
```

O servico `db-mongo` e seu volume continuam definidos para compatibilidade com
trabalhos existentes, mas nao sao dependencia da API. Inicie-o separadamente com
`docker compose up -d db-mongo` apenas quando outra parte do projeto precisar dele.

### Iniciar para trabalhar

No VS Code aberto na raiz, use `Terminal > Run Task > Dev: iniciar tudo`.
As tarefas individuais `Dev: API`, `Dev: frontend` e `Dev: bancos` tambem estao disponiveis.
As tarefas pressupõem a preparacao inicial acima e usam as portas 8000 e 8081.
Encerre servidores ja abertos nessas portas antes de iniciar outra instancia.

Alternativamente, abra dois terminais na raiz:

```powershell
# Terminal da API
cd backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 --env-file .env
```

```powershell
# Terminal do frontend
cd frontend
npm.cmd run web -- --port 8081
```

- Interface: http://localhost:8081
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432; banco, usuario e senha definidos em `backend/.env`.

Edite `backend/main.py` e `frontend/src/app/`; os servidores recarregam as alteracoes.
Use `process.env.EXPO_PUBLIC_API_URL` nas chamadas HTTP do frontend.
A API persiste usuarios, sessoes, solicitacoes, tarefas, documentos e historico no
PostgreSQL. No Docker, o host interno e `db-postgres`; fora dele, use `localhost`.
As variaveis `EXPO_PUBLIC_*` sao publicas e nao devem conter credenciais.

Verificacoes: `npm.cmd run typecheck --prefix frontend` e
`.\backend\.venv\Scripts\python.exe -m pip check`.
Pare as tarefas pelo VS Code ou com Ctrl+C nos respectivos terminais.
Para parar os bancos preservando os dados: `docker compose stop db-postgres db-mongo`.

O modo inteiramente Docker continua disponivel com `docker compose up -d --build`,
mas depende de acesso ao Docker Hub. Nao o execute junto com os servidores locais
nas mesmas portas. O backend no Compose tambem esta configurado com recarga automatica.
