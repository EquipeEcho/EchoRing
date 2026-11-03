"""Multilingual validation and aggregate state without a running database."""
import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.translation_scope import approved_amount, aggregate_status, resolve_target, validate_quote_scope
from app.models.translation import Intake, Quote


class TranslationScopeTests(unittest.TestCase):
    def setUp(self):
        self.request = {'status': 'Orçamento aprovado', 'source': 'English',
                        'target': 'Português (Brasil)', 'targets': ['Português (Brasil)', 'Espanhol (Espanha)', 'Francês (França)'],
                        'approvedTargets': ['Português (Brasil)', 'Espanhol (Espanha)']}
        self.intake = dict(name='Cliente', email='cliente@example.test', title='Manual',
                           service='Tradução', source='English', message='Traduzir o manual.', consent=True)

    def test_legacy_intake_gets_a_single_destination(self):
        result = Intake(**{**self.intake, 'email': ' CLIENTE@Example.Test '}, target='Portuguese')
        self.assertEqual(result.targets, ['Portuguese'])
        self.assertEqual(result.email, 'cliente@example.test')

    def test_multilingual_intake_rejects_alias_duplicates_source_and_unknown_languages(self):
        for targets in ([], ['Portuguese', 'pt-BR'], ['English'], ['Portuguese', 'Klingon']):
            with self.subTest(targets=targets), self.assertRaises(ValidationError):
                Intake(**self.intake, targets=targets)
        result = Intake(**self.intake, targets=['Português (Brasil)', 'Espanhol (Espanha)'])
        self.assertEqual(result.target, 'Português (Brasil)')

    def test_primary_target_cannot_disagree_with_destinations(self):
        with self.assertRaises(ValidationError):
            Intake(**self.intake, target='French', targets=['Portuguese'])

    def test_only_approved_languages_can_be_distributed(self):
        self.assertEqual(resolve_target(self.request, 'pt-BR', approved=True), 'Português (Brasil)')
        for target in (None, 'French', 'Klingon'):
            with self.subTest(target=target), self.assertRaises(HTTPException):
                resolve_target(self.request, target, approved=True)

    def test_quote_requires_all_languages_and_exact_total(self):
        quote = Quote(amount='0.60', delivery='2099-01-10', items=[
            dict(target=target, amount=value, delivery='2099-01-10')
            for target, value in zip(self.request['targets'], ['0.10', '0.20', '0.30'])]).model_dump()
        validate_quote_scope(self.request, quote)
        for invalid in ({**quote, 'amount': '0.61'}, {**quote, 'items': quote['items'][:-1]},
                        {**quote, 'items': [quote['items'][0]] * 3}):
            with self.assertRaises(HTTPException):
                validate_quote_scope(self.request, invalid)

    def test_one_completed_language_does_not_complete_the_parent(self):
        service = dict(target='Português (Brasil)', status='Entregue')
        self.assertEqual(aggregate_status(self.request, [service]), 'Em andamento')
        self.assertEqual(aggregate_status(self.request, [service, dict(target='Espanhol (Espanha)', status='Aguardando avaliação')]), 'Aguardando avaliação')
        self.assertEqual(aggregate_status(self.request, [service, dict(target='Espanhol (Espanha)', status='Entregue')]), 'Entregue')

    def test_approved_amount_is_recomputed_only_from_selected_languages(self):
        quote = dict(amount='0.60', items=[dict(target=target, amount=amount)
            for target, amount in zip(self.request['targets'], ['0.10', '0.20', '0.30'])])
        self.assertEqual(str(approved_amount(quote, ['Portuguese', 'Spanish'])), '0.30')
        self.assertEqual(str(approved_amount(quote, [])), '0')

    def test_revision_in_one_language_keeps_other_language_results(self):
        services = [dict(target='Português (Brasil)', status='Entregue'), dict(target='Espanhol (Espanha)', status='Revisão solicitada')]
        self.assertEqual(aggregate_status(self.request, services), 'Revisão solicitada')
        self.assertEqual(services[0]['status'], 'Entregue')

    def test_single_language_keeps_existing_statuses(self):
        self.assertEqual(aggregate_status(dict(status='Orçamento aprovado', target='Portuguese'), [dict(target='Portuguese', status='Aguardando avaliação')]), 'Aguardando avaliação')


if __name__ == '__main__':
    unittest.main()
