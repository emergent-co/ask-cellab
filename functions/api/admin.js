// /api/admin — 관리자 API (비밀번호 보호)
//   GET  ?action=list            접수 목록
//   GET  ?action=file&key=...    첨부파일 열람
//   POST {action:'status',id,status}   상태 변경
// 인증: 쿼리 ?pw= 또는 헤더 x-admin-pw (ADMIN_PASSWORD와 일치해야 함)

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const pw = url.searchParams.get('pw') || request.headers.get('x-admin-pw') || '';

  if (!env.ADMIN_PASSWORD || pw !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const action = url.searchParams.get('action');

  if (action === 'file') {
    if (!env.FILES) return new Response('R2 미연결', { status: 500 });
    const obj = await env.FILES.get(url.searchParams.get('key'));
    if (!obj) return new Response('Not found', { status: 404 });
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set('etag', obj.httpEtag);
    h.set('cache-control', 'private, max-age=3600');
    return new Response(obj.body, { headers: h });
  }

  if (action === 'list') {
    if (!env.DB) return json({ ok: false, error: 'D1 미연결' }, 500);
    const { results } = await env.DB.prepare(
      'SELECT id,type,brand,status,data,files,created_at FROM submissions ORDER BY created_at DESC LIMIT 500'
    ).all();
    return json({ ok: true, items: results });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    if (body.action === 'status' && body.id) {
      const allowed = ['접수됨', '처리중', '완료'];
      const st = allowed.indexOf(body.status) >= 0 ? body.status : '접수됨';
      await env.DB.prepare('UPDATE submissions SET status=? WHERE id=?').bind(st, body.id).run();
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: 'bad request' }, 400);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
