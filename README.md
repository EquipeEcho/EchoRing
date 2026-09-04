# Equipe Echo

## 📌 Echo Ring – Automatização de documentos técnicos

Sistema desenvolvido como parte do projeto **Echo Ring**, com o objetivo de digitalizar e centralizar a gestão de serviços da **Aliança Traduções**.

A plataforma conecta **clientes que necessitam de serviços de tradução**, a equipe interna da empresa e **tradutores freelancers**, permitindo o gerenciamento completo das solicitações, orçamentos, projetos e entregas.

Além disso, o sistema contará com recursos de **workflow personalizável**, **templates de processos**, **campanhas de e-mail** e um **agente de Inteligência Artificial** para auxiliar a operação da empresa.

---
## 📖 Sumário

- [Sobre o Projeto](#about)
- [Objetivo do Desafio](#objective)
- [Manuais e Documentação](./documents/TestExecutionReport.md)
- [Backlog do Produto](#backlog)
- [Cronograma de Sprints](#sprint)
- [Funcionalidades](#functionalities)
- [Requisitos não Funcionais](#requirements)
- [Tecnologias Utilizadas](#tecnologies)
- [Autores](#authors)

---

## 📌 <span id="about">Sobre o Projeto</span>
A **Echo Ring** tem como objetivo centralizar os processos da Aliança Traduções em um único ambiente digital.

O sistema permitirá que clientes solicitem traduções e enviem documentos, enquanto a equipe da empresa poderá analisar solicitações, elaborar orçamentos, criar projetos e acompanhar cada etapa do serviço.

Os tradutores freelancers poderão receber projetos compatíveis com suas habilidades, acompanhar suas atividades e enviar documentos traduzidos para revisão e entrega.

A plataforma também incluirá ferramentas comerciais, permitindo a criação de campanhas de e-mail para clientes, além de um agente de Inteligência Artificial capaz de auxiliar funcionários na análise de documentos, consulta de projetos, sugestão de tradutores e criação de conteúdos comerciais.

---


## 🎯 <span id="objective">Objetivo do Desafio</span>


- Centralizar as solicitações de tradução da empresa;
- Permitir o envio e gerenciamento de documentos;
- Gerenciar orçamentos e aprovações dos clientes;
- Criar projetos de tradução utilizando workflows estruturados;
- Disponibilizar templates de workflow pré-definidos e editáveis;
- Gerenciar tradutores freelancers, idiomas e especialidades;
- Acompanhar o progresso dos projetos e suas etapas;
- Permitir o envio de documentos traduzidos para revisão e entrega;
- Criar campanhas de e-mail para divulgação dos serviços da empresa;
- Utilizar Inteligência Artificial como suporte à operação e à tomada de decisão.

---

## 📚 <span id="documents">Manuais e Documentação</span>

- 📖 [Manual de Instalação]()  
- 👨‍💻 [Manual do Usuário]()

---

# 📋 <span id="backlog">Backlog do Produto</span>

| Rank | Prioridade | User Story | Como usuário | Estimativa | Sprint |
|---|---|---|---|---:|---|
| 1 | Alta | **US01 — Cadastro de usuários** | Como **funcionário**, quero cadastrar clientes, tradutores e funcionários para gerenciar os usuários da plataforma | 5 | Sprint 1 |
| 2 | Alta | **US02 — Requisição do cliente** | Como **cliente**, quero realizar uma requisição de tradução e enviar os documentos necessários para solicitar um serviço | 5 | Sprint 1 |
| 3 | Alta | **US03 — Aprovação e orçamento** | Como **funcionário**, quero analisar as requisições e criar orçamentos para que o cliente possa aprovar o serviço | 5 | Sprint 1 |
| 4 | Alta | **US04 — Alocação de tradutor** | Como **funcionário**, quero alocar um tradutor para uma requisição aprovada para iniciar o serviço de tradução | 3 | Sprint 1 |
| 5 | Alta | **US05 — Serviços do tradutor** | Como **tradutor**, quero visualizar os serviços que foram alocados para mim para acompanhar os trabalhos disponíveis | 3 | Sprint 1 |
| 6 | Alta | **US06 — Envio de serviços do tradutor** | Como **tradutor**, quero enviar os serviços concluídos para que sejam encaminhados para aprovação do funcionário | 5 | Sprint 1 |
| 7 | Alta | **US07 — Aprovação do funcionário** | Como **funcionário**, quero analisar e aprovar os serviços enviados pelo tradutor para garantir que estejam de acordo com o solicitado | 5 | Sprint 1 |
| 8 | Alta | **US08 — Envio de tradução ao cliente** | Como **funcionário**, quero enviar a tradução aprovada para o cliente para finalizar o serviço | 3 | Sprint 1 |
| 9 | Alta | **US09 — Recebimento da tradução** | Como **cliente**, quero receber e acessar a tradução concluída para utilizar o documento solicitado | 3 | Sprint 1 |
| 10 | Média | **US10 — Notificações para tradutor** | Como **tradutor**, quero receber notificações por WhatsApp e e-mail sobre novas traduções e atualizações dos meus serviços | 5 | Sprint 2 |
| 11 | Média | **US11 — Área de notificações do tradutor** | Como **tradutor**, quero visualizar minhas notificações dentro da plataforma para acompanhar as atualizações dos meus serviços | 3 | Sprint 2 |
| 12 | Média | **US12 — Notificações para cliente** | Como **cliente**, quero receber notificações sobre minhas traduções e visualizar essas notificações na plataforma para acompanhar o andamento do serviço | 5 | Sprint 2 |
| 13 | Média | **US13 — Notificações para funcionário** | Como **funcionário**, quero receber notificações sobre novas requisições, conclusão de traduções e conclusão de etapas para acompanhar os serviços | 5 | Sprint 2 |
| 14 | Alta | **US14 — Workflow de etapas da tradução** | Como **funcionário**, quero dividir uma tradução em diferentes etapas e alocar tradutores diferentes para cada etapa para organizar o fluxo de trabalho | 8 | Sprint 2 |
| 15 | Alta | **US15 — Conclusão de etapas pelo tradutor** | Como **tradutor**, quero enviar a conclusão da etapa pela qual sou responsável para que o funcionário possa acompanhar o progresso da tradução | 5 | Sprint 2 |
| 16 | Média | **US16 — Agente para funcionário** | Como **funcionário**, quero utilizar um agente para consultar informações e obter auxílio na gestão das traduções | 8 | Sprint 3 |
| 17 | Média | **US17 — Área do agente** | Como **funcionário**, quero acessar uma área dedicada ao agente para interagir com ele e utilizar seus recursos de apoio à gestão | 5 | Sprint 3 |
---

## 🚀 MVP - Mínimo Produto Viável

### 🟢 Sprint 1 - Fundação da Plataforma e Solicitações

**Objetivo:** disponibilizar a base da aplicação, autenticação e o fluxo inicial de solicitação de serviços.

### 📈 Backlog da Sprint 1

| Rank | Prioridade | User Story | Como usuário | Estimativa | Sprint |
|---|---|---|---|---:|---|
| 1 | Alta | **US01 — Cadastro de usuários** | Como **funcionário**, quero cadastrar clientes, tradutores e funcionários para gerenciar os usuários da plataforma | 5 | Sprint 1 |
| 2 | Alta | **US02 — Requisição do cliente** | Como **cliente**, quero realizar uma requisição de tradução e enviar os documentos necessários para solicitar um serviço | 5 | Sprint 1 |
| 3 | Alta | **US03 — Aprovação e orçamento** | Como **funcionário**, quero analisar as requisições e criar orçamentos para que o cliente possa aprovar o serviço | 5 | Sprint 1 |
| 4 | Alta | **US04 — Alocação de tradutor** | Como **funcionário**, quero alocar um tradutor para uma requisição aprovada para iniciar o serviço de tradução | 3 | Sprint 1 |
| 5 | Alta | **US05 — Serviços do tradutor** | Como **tradutor**, quero visualizar os serviços que foram alocados para mim para acompanhar os trabalhos disponíveis | 3 | Sprint 1 |
| 6 | Alta | **US06 — Envio de serviços do tradutor** | Como **tradutor**, quero enviar os serviços concluídos para que sejam encaminhados para aprovação do funcionário | 5 | Sprint 1 |
| 7 | Alta | **US07 — Aprovação do funcionário** | Como **funcionário**, quero analisar e aprovar os serviços enviados pelo tradutor para garantir que estejam de acordo com o solicitado | 5 | Sprint 1 |
| 8 | Alta | **US08 — Envio de tradução ao cliente** | Como **funcionário**, quero enviar a tradução aprovada para o cliente para finalizar o serviço | 3 | Sprint 1 |
| 9 | Alta | **US09 — Recebimento da tradução** | Como **cliente**, quero receber e acessar a tradução concluída para utilizar o documento solicitado | 3 | Sprint 1 |

---
## 🏃‍ DoR - Definition of Ready

- Regras de negócio definidas juntamente com o cliente
- Problema proposto compreendido e discutido com a equipe
- User Stories com Critérios de Aceitação
- Subtarefas divididas a partir das US
- Projeto bem definido e acordado com o cliente
- Arquitetura MVC clara para toda a equipe

## 🏆 DoD - Definition of Done

- Manual do projeto
- Vídeos de cada etapa de entrega
- Documentação informando a funcionalidade implementada
- Descrição de commits que seguem o padrão

## 📅 <span id="sprint">Cronograma de Sprints </span>

| Sprint | Tema | Período |
|---|---|---|
| 🔖 **SPRINT 1** | Fundação e Solicitações | 27/09/2026 |
| 🔖 **SPRINT 2** | Projetos, Workflow e Tradutores | 25/10/2026 |
| 🔖 **SPRINT 3** | CRM, IA e Finalização | 22/11/2026 |

---
## ⚙️ <span id="functionalities">Funcionalidades</span>

### 👤 Gestão de Usuários

- Cadastro e autenticação;
- Perfis de cliente;
- Perfis de funcionários;
- Perfis de tradutores freelancers;
- Controle de permissões.

### 📄 Solicitações de Tradução

- Criação de solicitações;
- Seleção de idiomas;
- Upload de documentos;
- Acompanhamento de status;
- Histórico de solicitações.

### 💰 Orçamentos e Projetos

- Criação de orçamentos;
- Aprovação ou recusa pelo cliente;
- Criação de projetos;
- Controle de prazos;
- Acompanhamento do andamento.

### ⚙️ Workflow e Templates

- Templates de processos pré-definidos;
- Criação de novos templates;
- Edição de templates;
- Personalização do workflow por projeto;
- Definição de responsáveis por etapa;
- Acompanhamento do progresso.

### 🌎 Gestão de Tradutores

- Cadastro de freelancers;
- Cadastro de idiomas;
- Cadastro de especialidades;
- Atribuição de projetos;
- Acompanhamento dos trabalhos;
- Envio de documentos traduzidos.

### 📧 CRM e Campanhas

- Gestão de clientes;
- Templates de e-mail;
- Segmentação de clientes;

### 🤖 Inteligência Artificial

- Assistente para consulta de projetos;
- Identificação de informações relevantes;


---

## 🔧 <span id="requirements">Requisitos Não Funcionais</span>

- Interface responsiva para smartphones e tablets;
- Autenticação e controle de acesso por perfil;
- Armazenamento seguro de documentos;
- Proteção de dados dos clientes;
- Registro das principais alterações dos projetos;
- API documentada;
- Código versionado utilizando Git;
- Manual de instalação;
- Manual do usuário;
- Documentação técnica para desenvolvedores.

---


## 💻 <span id="tecnologies">Tecnologias</span>
<h4 align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"></a>
  <a href="https://reactnative.dev/"><img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"></a>
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white"></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"></a>
  <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white"></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white"></a>
  <a href="https://git-scm.com/"><img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white"></a>
  <a href="https://github.com/"><img src="https://img.shields.io/badge/GitHub-121011?style=for-the-badge&logo=github&logoColor=white"></a>
</h4>

---


## 👥 <span id="authors">Autores</span>

Projeto desenvolvido pelos alunos do **5º semestre de ADS – FATEC SJC (2026-2)** em parceria com a **Aliança - Traduções**.  

<div align="center">
  <table>
    <tr>
      <th>Membro</th>
      <th>Função</th>
      <th>Github</th>
      <th>Linkedin</th>
    </tr>
    <tr>
      <td>Ryan Araújo dos Santos</td>
      <td>Scrum Master</td>
      <td><a href="https://github.com/Ryan53132"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a></td>
      <td><a href="https://www.linkedin.com/in/ryan-araujo-dos-santos-8391b927b/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"></a></td>
    </tr>
        <tr>
      <td>Taylor Henrique Marinho Silva</td>
      <td>Product Owner</td>
      <td><a href="https://github.com/TaylorSilva2"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a></td>
      <td><a href="https://www.linkedin.com/in/taylor-silva-859300330/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"></a></td>
    </tr>
    <tr>
      <td>Gustavo Felipe Morais</td>
      <td>Desenvolvedor</td>
      <td><a href="https://github.com/gutibrk74"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a></td>
      <td><a href="https://www.linkedin.com/in/gustavo-felipe-morais-a6517b327/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"></a></td>
    </tr>
    <tr>
      <td>Luiz Roberto Briz Quirino</td>
      <td>Desenvolvedor</td>
      <td><a href="https://github.com/HerrBriz"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a></td>
      <td><a href="https://www.linkedin.com/in/luiz-briz-15225b303/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"></a></td>
    </tr>
    <tr>
      <td>Nicolas Ferreira Fernandes</td>
      <td>Desenvolvedor</td>
      <td><a href="https://github.com/nicolasffe"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a></td>
      <td><a href="https://www.linkedin.com/in/nicolas-ferreira-fernandes/"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"></a></td>
    </tr>
  </table>
</div>
