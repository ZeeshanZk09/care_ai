export type MarketingEventName =
  | 'consultation_started'
  | 'consultation_abandoned'
  | 'upgrade_cta_shown'
  | 'upgrade_cta_dismissed'
  | 'plan_upgraded';

type MarketingPayload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
  }
}

export const trackMarketingEvent = (
  eventName: MarketingEventName,
  payload: MarketingPayload = {}
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const eventPayload = {
    event: eventName,
    ...payload,
  };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }

  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', eventName, payload);
  }
};
