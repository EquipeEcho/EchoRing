import { type TranslationRequest } from '../../../src/features/requests/types';
import { queryRequests } from '../../../src/features/requests/utils/request-query';

/** Answers a mocked `GET /requests` with the same filters, page and counts as the API. */
export function requestPage(records: object[], url: string) {
  const params = new URL(url).searchParams;
  return queryRequests(records as TranslationRequest[], {
    status: params.get('status') ?? undefined,
    search: params.get('search') ?? undefined,
    limit: Number(params.get('limit')) || undefined,
    offset: Number(params.get('offset')) || undefined,
  });
}
