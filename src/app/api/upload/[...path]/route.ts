/**
 * Edge Function — proxy de upload/download sem limite de tamanho.
 *
 * O proxy serverless padrão (/api/proxy) usa e.text() e tem limite de 4.5MB —
 * inviável para vídeos. Esta rota Edge faz streaming puro diretamente para/do
 * backend, sem bufferizar na memória.
 *
 * Rota: /api/upload/[...path]
 * Exemplos:
 *   PUT /api/upload/content/upload-video/file/:pythonJobId  — envio de vídeo
 *   GET /api/upload/content/media/:jobId/:file              — preview de vídeo (streaming)
 */
export const runtime = 'edge';

const BACKEND = process.env.BACKEND_API_URL || 'http://191.252.209.43:3001';

/** Proxy genérico — preserva body, headers e suporte a range requests */
async function handle(request: Request, params: { path: string[] }) {
  const path       = params.path.join('/');
  const url        = new URL(request.url);
  const query      = url.search; // inclui o "?" se houver query string
  const backendUrl = `${BACKEND}/api/${path}${query}`;

  // Monta headers — preserva Content-Type, Authorization, Range e X-* customizados
  const headers: Record<string, string> = {};
  const ct    = request.headers.get('content-type');
  const auth  = request.headers.get('authorization');
  const range = request.headers.get('range');
  if (ct)    headers['Content-Type']   = ct;
  if (auth)  headers['Authorization']  = auth;
  if (range) headers['Range']          = range;
  for (const [k, v] of request.headers.entries()) {
    if (k.toLowerCase().startsWith('x-')) headers[k] = v;
  }

  try {
    const isGet = request.method === 'GET' || request.method === 'HEAD';

    const resp = await fetch(backendUrl, {
      method:  request.method,
      headers,
      // GET/HEAD não têm body; POST/PUT streamam o body para o backend
      ...(isGet ? {} : {
        body:   request.body,
        // @ts-ignore — duplex necessário para streaming request bodies no fetch
        duplex: 'half',
      }),
    });

    // Para GET (preview de vídeo/imagem): stream o body de resposta diretamente
    if (isGet) {
      const respHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=3600',
      };
      const passThrough = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      for (const h of passThrough) {
        const v = resp.headers.get(h);
        if (v) respHeaders[h] = v;
      }
      // Streaming direto — sem bufferizar (suporta range requests para vídeos)
      return new Response(resp.body, { status: resp.status, headers: respHeaders });
    }

    // Para POST/PUT (upload): retorna a resposta JSON do backend
    const text = await resp.text();
    return new Response(text, {
      status:  resp.status,
      headers: {
        'Content-Type':                resp.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return Response.json({ error: `Upload proxy: ${err.message}` }, { status: 502 });
  }
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  return handle(request, params);
}

export async function HEAD(request: Request, { params }: { params: { path: string[] } }) {
  return handle(request, params);
}

export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  return handle(request, params);
}

export async function PUT(request: Request, { params }: { params: { path: string[] } }) {
  return handle(request, params);
}
