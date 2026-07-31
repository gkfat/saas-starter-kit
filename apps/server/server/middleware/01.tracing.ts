export default defineEventHandler((event) => {
  const requestId = crypto.randomUUID();
  event.context.requestId = requestId;
  setResponseHeader(event, 'x-request-id', requestId);
});
