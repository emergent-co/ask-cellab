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

    /* 메일 알림은 브라우저에서 직접 Formspree로 전송 (Worker IP는 스팸 필터링됨) */
    return json({ ok: true, id: id });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

async function notify(env, s) {
  if (!env.FORMSPREE_URL) return 'no_FORMSPREE_URL_env';
  const typeName = s.type === 'as' ? 'A/S 문의' : '구매 문의';
  const brandName = s.brand === 'sh' ? 'SH Scientific' : s.brand === 'lf' ? 'Leadfluid' : '-';

  const lines = [
    '접수번호: ' + s.id,
    '접수유형: ' + typeName,
    '브랜드: ' + brandName,
    ''
  ];
  Object.keys(s.data).forEach(function (k) {
    let v = s.data[k];
    if (v && typeof v === 'object') v = JSON.stringify(v);
    lines.push(k + ': ' + (v == null ? '' : v));
  });
  if (s.files.length) lines.push('', '첨부파일 수: ' + s.files.length);
  lines.push('', '관리자 페이지: https://ask.cellab.kr/admin.html');

  const body = {
    _subject: '[셀렙] 새 ' + typeName + ' 접수 - ' + brandName,
    email: env.ADMIN_EMAIL || 'emgt.yhlee@gmail.com',
    name: typeName + ' / ' + brandName,
    message: lines.join('\n')
  };

  const res = await fetch(env.FORMSPREE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body)
  });
  let text = '';
  try { text = await res.text(); } catch (_) {}
  return 'formspree_' + res.status + '|' + text.slice(0, 300);
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
