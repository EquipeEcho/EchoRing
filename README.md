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

| Rank | Prioridade | User Story                                 | Como usuário                                                                                                | Estimativa | Sprint   |
| ---: | ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------: | -------- |
|    1 | Alta       | **US01 — Cadastro de usuário**             | Como um usuário, quero criar uma conta para acessar a plataforma                                            |          5 | Sprint 1 |
|    2 | Alta       | **US02 — Login**                           | Como usuário, quero realizar login para acessar minhas funcionalidades                                      |          3 | Sprint 1 |
|    3 | Média      | **US03 — Perfil do usuário**               | Como usuário, quero editar minhas informações para manter meu cadastro atualizado                           |          3 | Sprint 1 |
|    4 | Alta       | **US04 — Criar solicitação**               | Como cliente, quero solicitar uma tradução para enviar meu documento para análise                           |          5 | Sprint 1 |
|    5 | Alta       | **US05 — Upload de documento**             | Como cliente, quero enviar um documento para que ele seja traduzido                                         |          5 | Sprint 1 |
|    6 | Alta       | **US06 — Visualizar solicitações**         | Como cliente, quero visualizar minhas solicitações para acompanhar meus serviços                            |          3 | Sprint 1 |
|    7 | Baixa      | **US07 — Cancelar solicitação**            | Como cliente, quero cancelar uma solicitação para interromper um serviço que não desejo continuar           |          2 | Sprint 1 |
|    8 | Alta       | **US08 — Criar orçamento**                 | Como funcionário da Aliança, quero criar um orçamento para informar o valor do serviço ao cliente           |          5 | Sprint 1 |
|   9 | Alta       | **US09 — Aprovar orçamento**               | Como cliente, quero aprovar um orçamento para autorizar o início da tradução                                |          3 | Sprint 1 |
|   10 | Média      | **US10 — Recusar orçamento**               | Como cliente, quero recusar um orçamento para não continuar com o serviço                                   |          2 | Sprint 1 |
|   11 | Alta       | **US11 — Cadastro de tradutor**            | Como administrador, quero cadastrar tradutores freelancers para disponibilizá-los para receber trabalhos    |          5 | Sprint 1 |
|   12 | Alta       | **US12 — Atribuir tradutor**               | Como funcionário da Aliança, quero atribuir um tradutor a uma solicitação para iniciar a tradução           |          3 | Sprint 1 |
|   13 | Alta       | **US13 — Enviar tradução**                 | Como tradutor, quero enviar o documento traduzido para que seja revisado e entregue ao cliente              |          5 | Sprint 1 |
|   14 | Alta       | **US14 — Visualizar trabalhos atribuídos** | Como tradutor, quero visualizar os trabalhos atribuídos a mim para acompanhar os serviços disponíveis       |          3 | Sprint 1 |
|   15 | Alta       | **US15 — Aceitar trabalho**                | Como tradutor, quero aceitar uma tradução atribuída para começar a trabalhar nela                           |          3 | Sprint 1 |
|   16 | Alta       | **US16 — Entregar tradução**               | Como funcionário, quero disponibilizar o documento final para que o cliente possa acessá-lo                 |          3 | Sprint 1 |
 17 | Alta       | **US17 — Download do documento**           | Como cliente, quero baixar minha tradução para utilizar o documento                                         |          3 | Sprint 1 |
|   18 | Média      | **US18 — Notificação para tradutor**       | Como tradutor, quero receber uma notificação quando um novo trabalho for atribuído a mim                    |          3 | Sprint 2 |
|   19 | Média      | **US19 — Notificação de orçamento**        | Como cliente, quero receber uma notificação para saber quando meu orçamento estiver disponível              |          3 | Sprint 2 |
|   20 | Alta       | **US20 — Acompanhar andamento**            | Como funcionário, quero acompanhar o status dos projetos para controlar os prazos                           |          3 | Sprint 2 |
|   21 | Média      | **US21 — Alterar status**                  | Como funcionário, quero alterar o status de uma tradução para informar o andamento corretamente             |          2 | Sprint 2 |
|   22 | Alta       | **US22 — Revisar documento**               | Como funcionário da Aliança, quero revisar uma tradução para garantir a qualidade antes da entrega          |          5 | Sprint 2 |
|   23 | Média      | **US23 — Solicitar correção**              | Como revisor, quero devolver uma tradução ao tradutor para solicitar ajustes                                |          3 | Sprint 2 |
|   24 | Média      | **US24 — Notificação de conclusão**        | Como cliente, quero receber uma notificação para saber quando minha tradução for concluída                  |          2 | Sprint 2 |
|   25 | Média      | **US25 — Sugestão de tradutor**            | Como funcionário, quero receber sugestões de tradutores para escolher o profissional mais adequado          |          8 | Sprint 2 |
|   26 | Média      | **US26 — Avaliar serviço**                 | Como cliente, quero avaliar o serviço para informar minha satisfação                                        |          3 | Sprint 3 |
|   27 | Alta       | **US27 — Dashboard administrativo**        | Como administrador, quero visualizar um painel geral para controlar as métricas do sistema                  |          5 | Sprint 3 |
|   28 | Média      | **US28 — Assistente IA para consultas**        | Como funcionário da Aliança, quero fazer perguntas à IA sobre solicitações e traduções para obter informações rapidamente |          3 | Sprint 3 |
|   29 | Média      | **US29 — IA para análise de solicitações**                     | Como funcionário da Aliança, quero utilizar a IA para analisar informações das solicitações e receber um resumo dos dados relevantes |          3 | Sprint 3 |
|   30 | Média      | **US30 — IA para apoio à gestão**                     | Como funcionário da Aliança, quero receber sugestões da IA sobre o gerenciamento das traduções para auxiliar na tomada de decisões |          8 | Sprint 3 |
|    31 | Média      | **US31 — Recuperação de senha**            | Como usuário, quero recuperar minha senha para voltar a acessar minha conta                                 |          3 | Sprint 3 |
|   32 | Média      | **US32 — Perfil profissional**             | Como tradutor, quero informar minhas habilidades para receber trabalhos compatíveis comigo                  |          3 | Sprint 3 |
---

## 🚀 MVP - Mínimo Produto Viável

### 🟢 Sprint 1 - Fundação da Plataforma e Solicitações

**Objetivo:** disponibilizar a base da aplicação, autenticação e o fluxo inicial de solicitação de serviços.

### 📈 Backlog da Sprint 1

| Rank | Prioridade | User Story                                 | Como usuário                                                                                                | Estimativa | Sprint   |
| ---: | ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------: | -------- |
|    1 | Alta       | **US01 — Cadastro de usuário**             | Como um usuário, quero criar uma conta para acessar a plataforma                                            |          5 | Sprint 1 |
|    2 | Alta       | **US02 — Login**                           | Como usuário, quero realizar login para acessar minhas funcionalidades                                      |          3 | Sprint 1 |
|    3 | Média      | **US03 — Perfil do usuário**               | Como usuário, quero editar minhas informações para manter meu cadastro atualizado                           |          3 | Sprint 1 |
|    4 | Alta       | **US04 — Criar solicitação**               | Como cliente, quero solicitar uma tradução para enviar meu documento para análise                           |          5 | Sprint 1 |
|    5 | Alta       | **US05 — Upload de documento**             | Como cliente, quero enviar um documento para que ele seja traduzido                                         |          5 | Sprint 1 |
|    6 | Alta       | **US06 — Visualizar solicitações**         | Como cliente, quero visualizar minhas solicitações para acompanhar meus serviços                            |          3 | Sprint 1 |
|    7 | Baixa      | **US07 — Cancelar solicitação**            | Como cliente, quero cancelar uma solicitação para interromper um serviço que não desejo continuar           |          2 | Sprint 1 |
|    8 | Alta       | **US08 — Criar orçamento**                 | Como funcionário da Aliança, quero criar um orçamento para informar o valor do serviço ao cliente           |          5 | Sprint 1 |
|   9 | Alta       | **US09 — Aprovar orçamento**               | Como cliente, quero aprovar um orçamento para autorizar o início da tradução                                |          3 | Sprint 1 |
|   10 | Média      | **US10 — Recusar orçamento**               | Como cliente, quero recusar um orçamento para não continuar com o serviço                                   |          2 | Sprint 1 |
|   11 | Alta       | **US11 — Cadastro de tradutor**            | Como administrador, quero cadastrar tradutores freelancers para disponibilizá-los para receber trabalhos    |          5 | Sprint 1 |
|   12 | Alta       | **US12 — Atribuir tradutor**               | Como funcionário da Aliança, quero atribuir um tradutor a uma solicitação para iniciar a tradução           |          3 | Sprint 1 |
|   13 | Alta       | **US13 — Enviar tradução**                 | Como tradutor, quero enviar o documento traduzido para que seja revisado e entregue ao cliente              |          5 | Sprint 1 |
|   14 | Alta       | **US14 — Visualizar trabalhos atribuídos** | Como tradutor, quero visualizar os trabalhos atribuídos a mim para acompanhar os serviços disponíveis       |          3 | Sprint 1 |
|   15 | Alta       | **US15 — Aceitar trabalho**                | Como tradutor, quero aceitar uma tradução atribuída para começar a trabalhar nela                           |          3 | Sprint 1 |
|   16 | Alta       | **US16 — Entregar tradução**               | Como funcionário, quero disponibilizar o documento final para que o cliente possa acessá-lo                 |          3 | Sprint 1 |
 17 | Alta       | **US17 — Download do documento**           | Como cliente, quero baixar minha tradução para utilizar o documento                                         |          3 | Sprint 1 |

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
