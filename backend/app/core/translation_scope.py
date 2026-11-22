"""Language scope shared by intake, commercial quotes and independent jobs."""
from decimal import Decimal

from fastapi import HTTPException

from app.core.languages import language


def request_targets(request):
    return request.get('targets') or [request['target']]


def work_targets(request):
    return request.get('approvedTargets', request_targets(request))


def resolve_target(request, target=None, approved=False):
    targets = work_targets(request) if approved else request_targets(request)
    if not target and len(targets) == 1:
        return targets[0]
    match = next((item for item in targets if language(item) == language(target or '')), None)
    if not match:
        raise HTTPException(422, 'Selecione um dos idiomas de destino desta solicitação.')
    return match


def approved_request(request):
    return request.get('quoteDecision') == 'approve' or request['status'] in (
        'Orçamento aprovado', 'Tradutor atribuído', 'Em andamento',
        'Aguardando avaliação', 'Revisão solicitada', 'Pronta', 'Entregue',
    )


def validate_quote_scope(request, quote):
    """A multilingual proposal must price every requested language exactly once."""
    targets = request_targets(request)
    items = quote.get('items') or []
    if not items and len(targets) == 1:
        return
    codes = [language(item['target']) for item in items]
    if len(codes) != len(set(codes)) or set(codes) != {language(target) for target in targets}:
        raise HTTPException(422, 'Informe um valor e um prazo para cada idioma solicitado, sem repetições.')
    total = sum(Decimal(item['amount'].replace(',', '.')) for item in items)
    if total != Decimal(quote['amount'].replace(',', '.')):
        raise HTTPException(422, 'O total do orçamento deve corresponder à soma dos valores por idioma.')
    for item in items:
        item['target'] = resolve_target(request, item['target'])


def approved_amount(quote, targets):
    if not targets:
        return Decimal('0')
    if not quote.get('items'):
        return Decimal(quote['amount'].replace(',', '.'))
    codes = set(map(language, targets))
    return sum((Decimal(item['amount'].replace(',', '.')) for item in quote['items']
                if language(item['target']) in codes), Decimal('0'))


def aggregate_status(request, services):
    """The parent is complete only when every requested language is delivered."""
    if not services:
        return request['status']
    if len(request_targets(request)) == 1:
        return services[0]['status']
    complete_scope = {language(row['target']) for row in services} == {language(target) for target in work_targets(request)}
    statuses = {row['status'] for row in services}
    if complete_scope and statuses == {'Entregue'}:
        return 'Entregue'
    if 'Revisão solicitada' in statuses:
        return 'Revisão solicitada'
    if complete_scope and statuses <= {'Entregue', 'Aguardando avaliação'}:
        return 'Aguardando avaliação'
    if statuses == {'Tradutor atribuído'}:
        return 'Tradutor atribuído'
    return 'Em andamento'
