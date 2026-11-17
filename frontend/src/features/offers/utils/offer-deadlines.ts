import { type Offer } from '@/features/offers/types';
import { deadlineAlert, responseAlert } from '@/utils/deadlines';

/** How much time is left to answer a pending offer, and whether its work deadline is tight. */
export function offerDeadlineAlerts(offer: Offer, now = Date.now()) {
  if (offer.status !== 'pending') return { response: null, tight: null };
  return { response: responseAlert(offer.expiresAt, now), tight: deadlineAlert(offer.deadline, now, 2) };
}

/** Pending offers that close first come first; answered offers keep their order after them. */
export function byResponseUrgency(first: Offer, second: Offer) {
  const pending = Number(second.status === 'pending') - Number(first.status === 'pending');
  if (pending || first.status !== 'pending') return pending;
  return Date.parse(first.expiresAt) - Date.parse(second.expiresAt);
}
