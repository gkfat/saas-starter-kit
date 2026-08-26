import type { AnalyticsEvent, AnalyticsEventParams } from '@saas-starter-kit/shared';

function trackEvent(event: AnalyticsEvent, params?: AnalyticsEventParams) {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', event, params);
  console.log('[GA] event sent:', event, params);
}

export function useAnalytics() {
  return { trackEvent };
}
