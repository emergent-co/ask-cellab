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

    try { await notify(env, { id, type, brand, data, files }); }
    catch (e) { /* 메일 실패해도 접수는 정상 처리 */ }

    return json({ ok: true, id: id });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

async function notify(env, s) {
  if (!env.RESEND_API_KEY) return;
  const typeName = s.type === 'as' ? 'A/S 문의' : '구매 문의';
  const brandName = s.brand === 'sh' ? 'SH Scientific' : s.brand === 'lf' ? 'Leadfluid' : '-';

  const rows = Object.keys(s.data).map(function (k) {
    let v = s.data[k];
    if (v && typeof v === 'object') v = JSON.stringify(v);
    return '<tr><td style="padding:5px 14px 5px 0;color:#888;white-space:nowrap;vertical-align:top">' +
      esc(k) + '</td><td style="padding:5px 0">' + esc(String(v == null ? '' : v)) + '</td></tr>';
  }).join('');

  const html =
    '<div style="font-family:sans-serif;max-width:560px">' +
    '<h2 style="margin:0 0 4px">새 ' + typeName + ' 접수</h2>' +
    '<p style="color:#888;margin:0 0 16px;font-size:13px">브랜드: ' + brandName +
    ' &nbsp;·&nbsp; 접수번호: ' + esc(s.id) + '</p>' +
    '<table style="border-collapse:collapse;font-size:14px;line-height:1.5">' + rows + '</table>' +
    (s.files.length ? '<p style="margin-top:14px;font-size:14px">첨부파일 ' + s.files.length +
      '건 — 관리자 페이지에서 확인하세요.</p>' : '') +
    '<p style="margin-top:20px"><a href="https://ask.cellab.kr/admin.html" ' +
    'style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 18px;' +
    'border-radius:8px;font-size:14px">관리자 페이지에서 접수 확인</a></p></div>';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'onboarding@resend.dev',
      to: env.ADMIN_EMAIL || 'emgt.yhlee@gmail.com',
      subject: '[셀렙] 새 ' + typeName + ' 접수 - ' + brandName,
      html: html
    })
  });
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
