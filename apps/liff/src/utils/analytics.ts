import type { AnalyticsEvent, AnalyticsEventParams } from '@saas-starter-kit/shared';

export function trackEvent(event: AnalyticsEvent, params?: AnalyticsEventParams): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('event', event, params);
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
