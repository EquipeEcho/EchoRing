"""HTTP integration coverage for request listing filters, search and pagination."""

from sqlalchemy import select, update

from app import database_pg as db
from app.db_models import TranslationRequest
from tests.support.portal_test_case import PortalTestCase


class RequestListingTests(PortalTestCase):
    def setUp(self):
        """Cria três solicitações com títulos, clientes e etapas diferentes."""
        super().setUp()
        self.manual = self.create_with(title='Manual técnico', name='Ana Souza', status='Recebido')
        self.contract = self.create_with(title='Contrato de serviços', name='Bruno Lima', status='Em andamento')
        self.report = self.create_with(title='Relatório anual', name='Ana Martins', status='Entregue')

    def create_with(self, title, name, status):
        """Cria a solicitação pela API e ajusta a etapa diretamente no banco."""
        response = self.client.post('/requests', json={**self.intake, 'title': title, 'name': name})
        self.assertEqual(response.status_code, 201, response.text)
        request_id = response.json()['id']
        with db.database() as session:
            data = session.execute(
                select(TranslationRequest.data).where(TranslationRequest.id == request_id)
            ).scalar_one()
            session.execute(
                update(TranslationRequest)
                .where(TranslationRequest.id == request_id)
                .values(data={**data, 'status': status})
            )
        return request_id

    def listing(self, **params):
        """Consulta a listagem da equipe e devolve o corpo da resposta."""
        response = self.client.get('/requests', headers=self.headers, params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def ids(self, body):
        return [item['id'] for item in body['items']]

    def test_lists_newest_first_with_totals_and_counts(self):
        body = self.listing()
        self.assertEqual(self.ids(body), [self.report, self.contract, self.manual])
        self.assertEqual((body['total'], body['limit'], body['offset']), (3, 20, 0))
        self.assertEqual(body['counts']['statuses'], {'Recebido': 1, 'Em andamento': 1, 'Entregue': 1})
        self.assertEqual(
            body['counts']['groups'], {'pendente': 1, 'orcamento': 0, 'traducao': 1, 'concluido': 1, 'cancelado': 0}
        )
        self.assertEqual(body['items'][0]['attachments'][0]['content'], '')

    def test_filters_by_group_exact_status_and_combinations(self):
        self.assertEqual(self.ids(self.listing(status='traducao')), [self.contract])
        self.assertEqual(self.ids(self.listing(status='Recebido')), [self.manual])
        self.assertEqual(self.ids(self.listing(status='pendente,concluido')), [self.report, self.manual])
        self.assertEqual(self.listing(status='cancelado')['total'], 0)
        response = self.client.get('/requests', headers=self.headers, params={'status': 'Arquivado'})
        self.assertEqual(response.status_code, 422)

    def test_search_ignores_case_and_accents_and_scopes_the_counts(self):
        self.assertEqual(self.ids(self.listing(search='relatorio')), [self.report])
        self.assertEqual(self.ids(self.listing(search='ANA')), [self.report, self.manual])
        self.assertEqual(self.ids(self.listing(search=self.contract.lower())), [self.contract])
        body = self.listing(search='ana', status='pendente')
        self.assertEqual(self.ids(body), [self.manual])
        self.assertEqual(body['counts']['groups']['concluido'], 1)
        self.assertEqual(self.listing(search='100%')['total'], 0)

    def test_paginates_with_limit_and_offset(self):
        first = self.listing(limit=2)
        second = self.listing(limit=2, offset=2)
        self.assertEqual(self.ids(first), [self.report, self.contract])
        self.assertEqual(self.ids(second), [self.manual])
        self.assertEqual((first['total'], second['total']), (3, 3))
        for params in ({'limit': 0}, {'limit': 101}, {'offset': -1}):
            response = self.client.get('/requests', headers=self.headers, params=params)
            self.assertEqual(response.status_code, 422, params)

    def test_search_treats_wildcards_and_backslashes_as_literal_text(self):
        literal = self.create_with(title=r'Manual 100%_final\rev', name='Client', status='Recebido')
        self.create_with(title='Manual 100XXfinal/rev', name='Client', status='Recebido')
        for term in ('100%', '_final', r'\rev'):
            with self.subTest(search=term):
                self.assertEqual(self.ids(self.listing(search=term)), [literal])
