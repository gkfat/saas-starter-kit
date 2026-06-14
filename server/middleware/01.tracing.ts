import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler((event) => {
  const requestId = uuidv4();
  event.context.requestId = requestId;
  setResponseHeader(event, 'x-request-id', requestId);
});
