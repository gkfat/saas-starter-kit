export default defineEventHandler((event) => {
  const start = Date.now();

  event.node.res.on('finish', () => {
    const { req, res } = event.node;
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    const severity = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARNING' : 'INFO';

    console.log(
      JSON.stringify({
        severity,
        message: `${req.method} ${req.url} ${statusCode}`,
        requestId: event.context.requestId ?? '',
        httpRequest: {
          requestMethod: req.method,
          requestUrl: req.url,
          status: statusCode,
          latency: `${(duration / 1000).toFixed(3)}s`,
          userAgent: req.headers['user-agent'] ?? '',
        },
      }),
    );
  });
});
