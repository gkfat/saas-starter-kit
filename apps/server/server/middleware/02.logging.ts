import { isJsonContentType, maskSensitiveFields, truncateBody } from '../shared/request-log';

function toBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  if (typeof chunk === 'string') return Buffer.from(chunk);
  return Buffer.from(String(chunk));
}

export default defineEventHandler((event) => {
  const { req, res } = event.node;
  const chunks: Buffer[] = [];

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = ((...args: Parameters<typeof res.write>) => {
    const [chunk] = args;
    if (chunk !== undefined) chunks.push(toBuffer(chunk));
    return originalWrite(...args);
  }) as typeof res.write;

  res.end = ((...args: Parameters<typeof res.end>) => {
    const [chunk] = args;
    if (chunk !== undefined && typeof chunk !== 'function') chunks.push(toBuffer(chunk));
    return originalEnd(...args);
  }) as typeof res.end;

  res.on('finish', () => {
    const method = req.method ?? 'GET';
    const statusCode = res.statusCode;
    const startTime = event.context.startTime as number | undefined;
    const durationMs = startTime ? Date.now() - startTime : 0;
    const status = statusCode < 400 ? 'success' : 'failure';
    const severity = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARNING' : 'INFO';

    const requestContentType = req.headers['content-type'];
    const requestPayload = event.context.requestPayload;
    const payload =
      requestPayload === undefined
        ? undefined
        : isJsonContentType(requestContentType)
          ? truncateBody(maskSensitiveFields(requestPayload)).value
          : `[skipped: ${requestContentType ?? 'unknown'}]`;

    const responseContentType = res.getHeader('content-type')?.toString();
    const skipResponse = method === 'GET' && statusCode < 400;
    let response: unknown;
    if (skipResponse) {
      response = undefined;
    } else if (isJsonContentType(responseContentType)) {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        response = truncateBody(maskSensitiveFields(JSON.parse(raw))).value;
      } catch {
        response = truncateBody(raw).value;
      }
    } else {
      response = `[skipped: ${responseContentType ?? 'unknown'}]`;
    }

    console.log(
      JSON.stringify({
        type: 'api',
        severity,
        message: `${method} ${req.url} ${statusCode}`,
        requestId: event.context.requestId ?? '',
        actor: {
          userId: event.context.userId ?? '',
          role: event.context.role ?? '',
        },
        httpRequest: {
          requestMethod: method,
          requestUrl: req.url,
          status,
          durationMs,
        },
        payload,
        response,
      }),
    );
  });
});
