"""Descriptive statistics, linear trend and expected value over project finances."""

from statistics import median


def weighted_mean(values, weights):
    """Média ponderada: cada valor pesa de acordo com o seu peso."""
    total_weight = sum(weights)
    if not total_weight:
        return 0.0
    return sum(value * weight for value, weight in zip(values, weights)) / total_weight


def linear_regression(xs, ys):
    """Reta dos mínimos quadrados (y = a·x + b). Devolve (inclinação, intercepto)."""
    n = len(xs)
    if n < 2:
        return 0.0, (ys[0] if ys else 0.0)
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    variance = sum((x - mean_x) ** 2 for x in xs)
    if not variance:
        return 0.0, mean_y
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / variance
    return slope, mean_y - slope * mean_x


def profit_summary(projects):
    """Estatística descritiva dos projetos aprovados: totais, média, mediana e margem."""
    approved = [item for item in projects if item['approved']]
    revenues = [float(item['revenue']) for item in approved]
    profits = [float(item['profit']) for item in approved]
    margins = [profit / revenue for profit, revenue in zip(profits, revenues) if revenue]
    return {
        'projects': len(approved),
        'revenue': round(sum(revenues), 2),
        'cost': round(sum(float(item['cost']) for item in approved), 2),
        'profit': round(sum(profits), 2),
        'mean_profit': round(sum(profits) / len(profits), 2) if profits else 0.0,
        'median_profit': round(median(profits), 2) if profits else 0.0,
        'weighted_margin': round(weighted_mean(margins, [r for r in revenues if r]), 4) if margins else 0.0,
    }


def monthly_profit(projects):
    """Lucro total de cada mês (AAAA-MM), em ordem cronológica."""
    months = {}
    for item in projects:
        if item['approved']:
            month = item['createdAt'].strftime('%Y-%m')
            months[month] = months.get(month, 0.0) + float(item['profit'])
    return [{'month': month, 'profit': round(months[month], 2)} for month in sorted(months)]


def profit_trend(projects):
    """Tendência do lucro mensal por regressão linear e previsão para o mês seguinte."""
    series = monthly_profit(projects)
    if not series:
        return {'months': [], 'slope': 0.0, 'next_month_forecast': 0.0, 'direction': 'sem dados'}
    xs = list(range(len(series)))
    slope, intercept = linear_regression(xs, [item['profit'] for item in series])
    direction = 'alta' if slope > 0 else 'queda' if slope < 0 else 'estável'
    return {
        'months': series, 'slope': round(slope, 2),
        'next_month_forecast': round(slope * len(series) + intercept, 2), 'direction': direction,
    }


def quote_expected_value(projects):
    """Probabilidade de aprovação de um orçamento e o valor esperado de cada proposta enviada."""
    quoted = [item for item in projects if item['quoted']]
    approved = [item for item in quoted if item['approved']]
    probability = len(approved) / len(quoted) if quoted else 0.0
    mean_revenue = sum(float(item['revenue']) for item in approved) / len(approved) if approved else 0.0
    return {
        'quotes': len(quoted), 'approved': len(approved),
        'approval_probability': round(probability, 4),
        'mean_approved_revenue': round(mean_revenue, 2),
        'expected_value': round(probability * mean_revenue, 2),
    }
