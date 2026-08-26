declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function initGoogleAnalytics(): void {
  if (!import.meta.env.PROD) return;

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID_LIFF;
  if (!measurementId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
}
