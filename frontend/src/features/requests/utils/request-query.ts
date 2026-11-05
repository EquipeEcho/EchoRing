import { isRequestGroup, requestGroups } from '@/features/requests/constants/status';
import {
  type RequestCounts,
  type RequestGroup,
  type RequestPage,
  type RequestQuery,
  type RequestStatus,
  type TranslationRequest,
} from '@/features/requests/types';
import { requestTargets } from '@/features/requests/utils/quote-scope';

export const requestPageSize = 20;

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Expands group keys and exact statuses separated by commas into the statuses they cover. */
export function statusesFor(status = ''): RequestStatus[] | null {
  const statuses = status.split(',').map(token => token.trim()).filter(Boolean).flatMap(token =>
    isRequestGroup(token) ? requestGroups[token].statuses : [token as RequestStatus]);
  return statuses.length ? statuses : null;
}

export function countRequests(requests: TranslationRequest[]): RequestCounts {
  const statuses: RequestCounts['statuses'] = {};
  for (const request of requests) statuses[request.status] = (statuses[request.status] ?? 0) + 1;
  const groups = Object.fromEntries(Object.entries(requestGroups).map(([group, { statuses: members }]) =>
    [group, members.reduce((total, status) => total + (statuses[status] ?? 0), 0)])) as Record<RequestGroup, number>;
  return { groups, statuses };
}

/** Applies the `GET /requests` filters to the requests kept in this browser. */
export function queryRequests(requests: TranslationRequest[], query: RequestQuery): RequestPage {
  const limit = query.limit ?? requestPageSize;
  const offset = query.offset ?? 0;
  const search = fold(query.search ?? '');
  const statuses = statusesFor(query.status);
  const searched = requests
    .filter(request => !search || fold([request.id, request.title, request.name, request.email, request.company,
      request.source, ...requestTargets(request)].join(' ')).includes(search))
    .sort((first, second) => (second.createdAt || '').localeCompare(first.createdAt || ''));
  const matched = statuses ? searched.filter(request => statuses.includes(request.status)) : searched;
  return { items: matched.slice(offset, offset + limit), total: matched.length, limit, offset, counts: countRequests(searched) };
}
