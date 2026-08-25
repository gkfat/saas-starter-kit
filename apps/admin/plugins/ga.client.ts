export default defineNuxtPlugin(() => {
  if (!import.meta.env.PROD) return;

  const { gaMeasurementId } = useRuntimeConfig().public;
  if (!gaMeasurementId) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', gaMeasurementId);
});

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}
