-- Keep existing requests, offers, tasks and delivery versions. Scope uniqueness by language.
ALTER TABLE job_offers ADD COLUMN IF NOT EXISTS target TEXT NOT NULL DEFAULT '';
UPDATE job_offers SET target = requests.data ->> 'target'
    FROM requests WHERE requests.id = job_offers.request_id AND job_offers.target = '';
UPDATE services SET target = requests.data ->> 'target'
    FROM requests WHERE requests.id = services.request_id AND services.target = '';

DROP INDEX IF EXISTS services_request_id;
CREATE UNIQUE INDEX IF NOT EXISTS services_request_target
    ON services(request_id, target) WHERE request_id IS NOT NULL;
DROP INDEX IF EXISTS job_offers_pending_recipient;
DROP INDEX IF EXISTS job_offers_one_acceptance;
CREATE UNIQUE INDEX job_offers_pending_recipient
    ON job_offers(request_id, target, translator_id) WHERE status = 'pending';
CREATE UNIQUE INDEX job_offers_one_acceptance
    ON job_offers(request_id, target) WHERE status = 'accepted';
