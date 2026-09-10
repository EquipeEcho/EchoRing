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

3. **Suba a infraestrutura completa:**
   Na raiz do projeto (onde está o arquivo `docker-compose.yml`), execute:
   ```bash
   docker compose up -d --build
   ```
   > **Nota:** Na primeira vez, esse comando pode levar alguns minutos, pois o Docker fará o download das imagens do PostgreSQL, MongoDB, Node e Python, configurando as dependências web do Expo e do FastAPI automaticamente.

#### 🌐 Acessando a Aplicação
Quando o terminal indicar que todos os contêineres foram iniciados (`Started` / `Running`), abra o seu navegador nos seguintes endereços:

* **Interface (Frontend - Expo):** [http://localhost:8081](http://localhost:8081)
* **API (Backend - FastAPI):** [http://localhost:8000](http://localhost:8000)