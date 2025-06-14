export default {
  async fetch(req: Request, env: {}, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const upstream = 'https://pak.chat.pages.dev' + url.pathname + url.search;
    const resp = await fetch(upstream, {
      headers: { ...Object.fromEntries(req.headers) },
      cf: { brotli: true, cacheTtl: 0, cacheEverything: false }
    });
    return resp;
  }
};
