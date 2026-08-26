export default defineNuxtPlugin(() => {
  // if (!import.meta.env.PROD) return;

  const config = useRuntimeConfig().public;
  console.log('[GA] runtime config:', config);

  const { gaMeasurementId } = config;
  if (!gaMeasurementId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'granted',
    analytics_storage: 'granted',
  });
  gtag('js', new Date());
  gtag('config', gaMeasurementId);
});

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
