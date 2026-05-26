// POST /api/submit — 접수 처리: D1 저장 + 메일 알림
// 요청 본문(JSON): { type:'as'|'purchase', brand:'sh'|'lf', data:{...}, files:[{key,name}] }
// 응답: { ok, id }

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const type = body.type === 'as' ? 'as' : 'purchase';
    const brand = (body.brand === 'sh' || body.brand === 'lf') ? body.brand : '';
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    const files = Array.isArray(body.files) ? body.files : [];

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const created_at = new Date().toISOString();

    if (!env.DB) {
      return json({ ok: false, error: 'D1 데이터베이스(DB)가 연결되지 않았습니다.' }, 500);
    }

    await env.DB.prepare(
      'INSERT INTO submissions (id,type,brand,status,data,files,created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(id, type, brand, '접수됨', JSON.stringify(data), JSON.stringify(files), created_at).run();

    let mailResult = 'skipped';
    try { mailResult = (await notify(env, { id, type, brand, data, files })) || 'sent'; }
    catch (e) { mailResult = 'error: ' + String(e); }

    return json({ ok: true, id: id, mailResult: mailResult });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

async function notify(env, s) {
  if (!env.FORMSPREE_URL) return 'no_FORMSPREE_URL_env';
  const typeName = s.type === 'as' ? 'A/S 문의' : '구매 문의';
  const brandName = s.brand === 'sh' ? 'SH Scientific' : s.brand === 'lf' ? 'Leadfluid' : '-';

  const body = {
    _subject: '[셀렙] 새 ' + typeName + ' 접수 - ' + brandName,
    _replyto: env.ADMIN_EMAIL || 'emgt.yhlee@gmail.com',
    접수번호: s.id,
    접수유형: typeName,
    브랜드: brandName
  };
  Object.keys(s.data).forEach(function (k) {
    let v = s.data[k];
    if (v && typeof v === 'object') v = JSON.stringify(v);
    body[k] = v == null ? '' : v;
  });
  body.첨부파일수 = s.files.length;
  body.관리자페이지 = 'https://ask.cellab.kr/admin.html';

  const res = await fetch(env.FORMSPREE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body)
  });
  return 'formspree_status_' + res.status;
}

function esc(s) {
  return String(s).replace(/[&<>]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
