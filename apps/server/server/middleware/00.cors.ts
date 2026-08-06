export default defineEventHandler((event) => {
  const allowedOrigins = (useRuntimeConfig().corsAllowedOrigins as string)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = getRequestHeader(event, 'origin');
  if (!origin || !allowedOrigins.includes(origin)) {
    return;
  }

  setResponseHeader(event, 'Access-Control-Allow-Origin', origin);
  setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true');
  setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  setResponseHeader(
    event,
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, ngrok-skip-browser-warning',
  );

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204);
    return '';
  }
});
