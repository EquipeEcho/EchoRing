# Serviço de e-mail

Função única para mandar e-mail de qualquer parte do backend.

## Como usar

```python
from app.services.email.service import send_email

send_email(
    to='tradutor@exemplo.com',
    subject='Novo serviço atribuído',
    template='aviso',
    context={
        'titulo': 'Você recebeu um novo serviço',
        'nome': 'Ana',
        'mensagem': 'O serviço SOL-123 foi atribuído a você.',
        'botao_texto': 'Ver serviço',
        'botao_url': 'http://localhost:8081/area',
    },
)
```

Para não travar a rota, passe o `BackgroundTasks` do FastAPI:

```python
from fastapi import BackgroundTasks

@router.post('/algo')
def algo(background_tasks: BackgroundTasks):
    send_email(..., background_tasks=background_tasks)
```

Sem `background_tasks`, o envio é imediato e lança `EmailNotConfiguredError` se o SMTP não estiver configurado.

## Templates

| Template    | Uso                          | Dados (`context`)                                                   |
|-------------|------------------------------|---------------------------------------------------------------------|
| `aviso`     | Qualquer notificação simples | `titulo`, `mensagem` e, opcionais, `nome`, `botao_texto`, `botao_url` |
| `orcamento` | Orçamento para o cliente     | `nome`, `titulo`, `servico`, `origem`, `destino`, `valor`, `prazo`, `mensagem`, `aprovar_url`, `recusar_url`, `protocolo` |

Para criar um novo: crie `templates/<nome>.html` com `{% extends 'base.html' %}` e o conteúdo dentro de `{% block conteudo %}`.

## Testar sem enviar

No `.env`: `EMAIL_DRY_RUN=true`. O e-mail aparece no log da API em vez de ser enviado.