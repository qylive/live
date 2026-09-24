// Cloudflare Pages Functions 代理：转发 B站直播间状态接口（同源请求，规避浏览器跨域限制）
// 部署后访问 https://qylive.pages.dev/api/live-status 返回 {"live_status":0|1|2,"title":"..."}
// 注意：向 B 站发起请求必须携带浏览器样式请求头，否则会被 B 站风控（403）拒绝
export async function onRequest(context) {
    try {
        const resp = await fetch('https://api.live.bilibili.com/room/v1/Room/get_info?room_id=10049827', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bilibili.com/',
                'Origin': 'https://www.bilibili.com',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        const json = await resp.json();
        const d = (json && json.data) || {};
        return new Response(JSON.stringify({
            live_status: Number(d.live_status) || 0,
            title: d.title || ''
        }), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ live_status: 0, title: '', error: 'proxy failed' }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }
}
