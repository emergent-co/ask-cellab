// POST /api/upload — 사진·영상 파일을 Cloudflare R2에 저장
// 요청: 본문 = 파일 바이너리, 헤더 x-filename = 파일명(encodeURIComponent)
// 응답: { ok, key, name }

export async function onRequestPost({ request, env }) {
  try {
    if (!env.FILES) {
      return json({ ok: false, error: 'R2 버킷(FILES)이 연결되지 않았습니다.' }, 500);
    }
    const rawName = request.headers.get('x-filename') || 'file';
    const filename = safeDecode(rawName);
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const safe = filename.replace(/[^\w.\-가-힣]/g, '_').slice(-80);
    const key = 'as/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safe;

    await env.FILES.put(key, request.body, { httpMetadata: { contentType } });
    return json({ ok: true, key: key, name: filename });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
