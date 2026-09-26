from typing import List, Optional
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Funcionario(Base):
    __tablename__ = "funcionarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True)
    cargo: Mapped[str] = mapped_column(String(50))
    senha: Mapped[str] = mapped_column(String(255))

    # Relacionamentos
    solicitacoes: Mapped[List["Solicitacao"]] = relationship(back_populates="funcionario_gerente")
    projetos_criados: Mapped[List["Projeto"]] = relationship(back_populates="criador")
    etapas_responsaveis: Mapped[List["Etapa"]] = relationship(back_populates="responsavel")


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100))
    telefone: Mapped[Optional[str]] = mapped_column(String(20))
    empresa: Mapped[Optional[str]] = mapped_column(String(100))
    trad_de: Mapped[Optional[str]] = mapped_column(String(50))
    trad_para: Mapped[Optional[str]] = mapped_column(String(50))
    servico: Mapped[Optional[str]] = mapped_column(String(100))
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    arquivos: Mapped[Optional[str]] = mapped_column(String(255))

    # Chave Estrangeira do Funcionário que gerencia a solicitação (1, 1 no lado do Funcionário)
    funcionario_id: Mapped[Optional[int]] = mapped_column(ForeignKey("funcionarios.id"))
    funcionario_gerente: Mapped[Optional["Funcionario"]] = relationship(back_populates="solicitacoes")


class Projeto(Base):
    __tablename__ = "projetos"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Chave Estrangeira do Funcionário que cria o projeto (1, 1)
    criador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("funcionarios.id"))
    criador: Mapped[Optional["Funcionario"]] = relationship(back_populates="projetos_criados")

    # Relacionamento N:M através da entidade associativa ProjetoEtapa
    projeto_etapas: Mapped[List["ProjetoEtapa"]] = relationship(back_populates="projeto")


class Etapa(Base):
    __tablename__ = "etapas"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Chave Estrangeira opcional (0, 1) para o Funcionário responsável
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("funcionarios.id"))
    responsavel: Mapped[Optional["Funcionario"]] = relationship(back_populates="etapas_responsaveis")

    # Relacionamento N:M através da entidade associativa ProjetoEtapa
    projeto_etapas: Mapped[List["ProjetoEtapa"]] = relationship(back_populates="etapa")


class ProjetoEtapa(Base):
    """
    Entidade fraca/associativa que mapeia a relação muitos-para-muitos (N:N)
    entre Projetos e Etapas conforme indicado no diagrama.
    """
    __tablename__ = "projeto_etapas"

    projeto_id: Mapped[int] = mapped_column(ForeignKey("projetos.id"), primary_key=True)
    etapa_id: Mapped[int] = mapped_column(ForeignKey("etapas.id"), primary_key=True)

    # Relacionamentos com os modelos pai
    projeto: Mapped["Projeto"] = relationship(back_populates="projeto_etapas")
    etapa: Mapped["Etapa"] = relationship(back_populates="projeto_etapas")