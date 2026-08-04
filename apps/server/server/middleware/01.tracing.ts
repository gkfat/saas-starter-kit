import { isJsonContentType } from '../shared/request-log';

const PAYLOAD_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export default defineEventHandler(async (event) => {
  const requestId = crypto.randomUUID();
  event.context.requestId = requestId;
  event.context.startTime = Date.now();
  setResponseHeader(event, 'x-request-id', requestId);

  const method = event.node.req.method ?? 'GET';
  if (PAYLOAD_METHODS.has(method) && isJsonContentType(event.node.req.headers['content-type'])) {
    try {
      event.context.requestPayload = await readBody(event);
    } catch {
      // 讀取/解析失敗時不記錄 payload，不中斷主流程
    }
  }
});
