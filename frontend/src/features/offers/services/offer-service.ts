import { type CompatibleTranslator, type Offer, type OfferNotification, type OfferTerms } from '@/features/offers/types';
import { api } from '@/lib/api/client';

export const listOpportunities = (token: string) => api<Offer[]>('/opportunities', {}, token);
export const getOpportunity = (id: string, token: string) => api<Offer>(`/opportunities/${id}`, {}, token);
export const decideOpportunity = (id: string, decision: 'accept' | 'decline', token: string) =>
  api<Offer>(`/opportunities/${id}/${decision}`, { method: 'POST' }, token);
export const listRequestOffers = (id: string, token: string) => api<Offer[]>(`/requests/${id}/offers`, {}, token);
export const compatibleTranslators = (id: string, token: string) =>
  api<CompatibleTranslator[]>(`/requests/${id}/compatible-translators`, {}, token);
export const sendOffers = (id: string, terms: OfferTerms, token: string) =>
  api<Offer[]>(`/requests/${id}/offers`, { method: 'POST', body: JSON.stringify(terms) }, token);
export const cancelOffer = (id: string, token: string) => api<Offer>(`/offers/${id}/cancel`, { method: 'POST' }, token);
export const listOfferNotifications = (token: string) => api<OfferNotification[]>('/offer-notifications', {}, token);
export const markOfferNotificationRead = (id: number, token: string) =>
  api(`/offer-notifications/${id}/read`, { method: 'POST' }, token);
