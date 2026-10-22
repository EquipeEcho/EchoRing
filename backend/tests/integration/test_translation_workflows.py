"""Persistent process permissions, ordering, conflict detection and audit."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import unittest

from app.database_pg import database
from tests.support.portal_test_case import PortalTestCase


class TranslationWorkflowTests(PortalTestCase):

    def prepare(self, template='tep'):
        account, self.translator_headers = self.translator_session()
        self.task = self.create_service(account['id'])
        self.url = f'/tasks/{self.task}/workflow'
        response = self.client.put(self.url, headers=self.headers, json={'templateId': template})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def change(self, stage, action, revision, headers=None, note='', expected=200):
        response = self.client.patch(self.url + '/stages/' + stage, headers=headers or self.headers,
            json={'action': action, 'expectedRevision': revision, 'note': note})
        self.assertEqual(response.status_code, expected, response.text)
        return response.json()

    def test_persistence_ordered_progress_permissions_and_audit(self):
        data = self.prepare()
        self.assertEqual(data['progress'], 0)
        self.assertEqual([stage['status'] for stage in data['stages']], ['current'] + ['pending'] * 4)
        self.assertEqual(self.client.get(self.url, headers=self.translator_headers).json(), data)
        self.assertEqual(self.client.get('/tasks', headers=self.headers).json()[0]['workflow'], data)
        self.assertEqual(self.client.put(self.url, headers=self.headers, json={'templateId': 'mtpe'}).status_code, 409)
        self.change('preparation', 'complete', 1, self.translator_headers, expected=403)
        self.change('translation', 'complete', 1, self.translator_headers, expected=409)
        self.change('preparation', 'complete', 1)
        self.change('translation', 'complete', 1, self.translator_headers, expected=409)
        self.change('translation', 'complete', 2, expected=403)
        self.change('translation', 'block', 2, self.translator_headers, expected=422)
        blocked = self.change('translation', 'block', 2, self.translator_headers, note='Falta o glossário.')
        self.assertEqual(blocked['blocker'], 'Falta o glossário.')
        self.change('translation', 'complete', 3, self.translator_headers, expected=409)
        self.change('translation', 'resume', 3, note='Glossário anexado.')
        translated = self.change('translation', 'complete', 4, self.translator_headers)
        self.assertEqual(translated['progress'], 40)
        self.assertTrue(translated['stages'][1]['completedAt'])
        self.change('revision', 'complete', 5, self.translator_headers, expected=403)
        self.change('revision', 'complete', 5)
        self.change('qa', 'complete', 6)
        final = self.change('delivery', 'complete', 7)
        self.assertEqual(final['progress'], 100)
        self.assertEqual(final['blocker'], '')
        self.change('delivery', 'complete', 8, expected=409)
        history = self.client.get('/tasks/' + self.task, headers=self.headers).json()['history']
        self.assertEqual(len([event for event in history if event['status'] == 'Etapa concluída']), 5)
        self.assertTrue(any(event['status'] == 'Etapa bloqueada' and 'glossário' in event['note'] for event in history))

    def test_access_validation_and_all_five_templates(self):
        self.prepare()
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.put(self.url, headers=self.translator_headers, json={'templateId': 'tep'}).status_code, 403)
        other, _, other_headers = self.invited_translator()
        with database() as connection:
            connection.execute('UPDATE users SET onboarding_required = FALSE WHERE id = ?', (other['id'],))
        self.assertEqual(self.client.get(self.url, headers=other_headers).status_code, 403)
        self.change('translation', 'complete', 1, other_headers, expected=403)
        self.assertEqual(self.client.get('/workflow-reviewers', headers=other_headers).status_code, 403)
        for template in ('mtpe', 'localization', 'documentary', 'subtitling'):
            task = self.create_service(other['id'], 'OS-' + template)
            bad = self.client.put(f'/tasks/{task}/workflow', headers=self.headers, json={'templateId': template, 'reviewerId': other['id']})
            self.assertEqual(bad.status_code, 422)
            good = self.client.put(f'/tasks/{task}/workflow', headers=self.headers, json={'templateId': template})
            self.assertEqual(good.status_code, 201, good.text)
            self.assertEqual(good.json()['templateId'], template)
            self.assertEqual(len(good.json()['stages']), 5)
            self.assertTrue(all(stage['requirements'] and stage['deliverables'] for stage in good.json()['definition']['stages']))

    def test_concurrent_completion_has_one_winner(self):
        self.prepare()
        barrier = Barrier(2)
        def complete(_):
            barrier.wait(timeout=15)
            return self.client.patch(self.url + '/stages/preparation', headers=self.headers,
                                     json={'action': 'complete', 'expectedRevision': 1})
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(complete, range(2)))
        self.assertEqual(sorted(response.status_code for response in responses), [200, 409])
        data = self.client.get(self.url, headers=self.headers).json()
        self.assertEqual(data['revision'], 2)
        self.assertEqual(data['progress'], 20)

    def test_actual_files_and_approvals_advance_each_model(self):
        account, self.translator_headers = self.translator_session()
        for template in ('tep', 'mtpe', 'localization', 'documentary', 'subtitling'):
            with self.subTest(template=template):
                self.task = self.create_service(account['id'], 'OS-AUTO-' + template)
                self.url = f'/tasks/{self.task}/workflow'
                process = self.client.put(self.url, headers=self.headers, json={'templateId': template}).json()
                # A valid file cannot silently complete the employee's preparation.
                premature = self.client.post(f'/tasks/{self.task}/deliveries', headers=self.translator_headers,
                    files={'file': ('translation.txt', b'Completed translation', 'text/plain')})
                self.assertEqual(premature.status_code, 409, premature.text)
                self.assertEqual(self.client.get('/tasks/' + self.task, headers=self.headers).json()['lastVersion'], 0)
                self.change(process['stages'][0]['stageId'], 'complete', 1)
                uploaded = self.client.post(f'/tasks/{self.task}/deliveries', headers=self.translator_headers,
                    files={'file': ('translation.txt', b'Completed translation', 'text/plain')})
                self.assertEqual(uploaded.status_code, 201, uploaded.text)
                process = self.client.get(self.url, headers=self.translator_headers).json()
                self.assertEqual(process['progress'], 60 if template == 'subtitling' else 40)
                self.assertEqual(process['stages'][1]['completedBy'], account['name'])
                reviewed = self.client.post(f"/deliveries/{uploaded.json()['id']}/review", headers=self.headers,
                    json={'decision': 'approve', 'feedback': 'Critérios conferidos e aprovados.'})
                self.assertEqual(reviewed.status_code, 200, reviewed.text)
                if template == 'documentary':
                    self.assertEqual(reviewed.json()['status'], 'Pronta')
                    process = self.client.get(self.url, headers=self.translator_headers).json()
                    self.assertEqual(process['progress'], 60)
                    self.assertEqual(process['stages'][3]['status'], 'current')
                    self.assertEqual(self.client.get('/tasks/' + self.task, headers=self.headers).json()['status'], 'Em andamento')
                    formalized = self.client.post(f'/tasks/{self.task}/deliveries', headers=self.translator_headers,
                        files={'file': ('formalized.txt', b'Formalized translation', 'text/plain')})
                    self.assertEqual(formalized.status_code, 201, formalized.text)
                    process = self.client.get(self.url, headers=self.headers).json()
                    self.assertEqual(process['progress'], 80)
                    final = self.client.post(f"/deliveries/{formalized.json()['id']}/review", headers=self.headers,
                        json={'decision': 'approve'})
                    self.assertEqual(final.status_code, 200, final.text)
                self.assertEqual(self.client.get(self.url, headers=self.headers).json()['progress'], 100)
                self.assertEqual(self.client.get('/tasks/' + self.task, headers=self.headers).json()['status'], 'Entregue')

    def test_rework_reopens_translator_package_and_preserves_preparation(self):
        self.prepare('subtitling')
        self.change('preparation', 'complete', 1)
        self.change('translation', 'block', 2, self.translator_headers, note='Aguardando vídeo.')
        blocked = self.client.post(f'/tasks/{self.task}/deliveries', headers=self.translator_headers,
            files={'file': ('subtitles.txt', b'Translated and timed subtitles', 'text/plain')})
        self.assertEqual(blocked.status_code, 409)
        self.change('translation', 'resume', 3)
        uploaded = self.client.post(f'/tasks/{self.task}/deliveries', headers=self.translator_headers,
            files={'file': ('subtitles.txt', b'Translated and timed subtitles', 'text/plain')})
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        rejected = self.client.post(f"/deliveries/{uploaded.json()['id']}/review", headers=self.headers,
            json={'decision': 'request_revision', 'feedback': 'Corrigir sincronização e terminologia.'})
        self.assertEqual(rejected.status_code, 200, rejected.text)
        process = self.client.get(self.url, headers=self.translator_headers).json()
        self.assertEqual(process['progress'], 20)
        self.assertEqual([stage['status'] for stage in process['stages']], ['completed', 'current', 'pending', 'pending', 'pending'])
        self.assertNotIn('completedAt', process['stages'][1])
        self.assertNotIn('completedAt', process['stages'][2])
        self.assertEqual(process['stages'][1]['note'], 'Corrigir sincronização e terminologia.')
        self.change('translation', 'complete', 4, self.translator_headers, expected=409)
        history = self.client.get('/tasks/' + self.task, headers=self.headers).json()['history']
        self.assertTrue(any(event['status'] == 'Etapas reabertas' for event in history))


if __name__ == '__main__':
    unittest.main()
