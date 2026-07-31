export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const apiFetch = $fetch.create({ baseURL: config.public.apiBaseUrl });
  return { provide: { api: apiFetch } };
});
