// Cloudflare Pages Functions 代理：转发 B站直播间状态接口（同源请求，规避浏览器跨域限制）
// 部署后访问 https://qylive.pages.dev/api/live-status
//   正常返回 {"live_status":0|1|2,"title":"..."}；所有上游均被风控时返回 {"live_status":-1,"error":"..."}
//
// 背景：Cloudflare 数据中心出口 IP 可能被 B 站风控（返回 code 非 0、data 为空）。
// 旧代码未校验业务 code，误把风控空数据当作「未开播(0)」，导致正在直播却不显示状态。
// 现采用「get_info（含标题）为主 + room_init（风控宽松）兜底」的多接口容灾，并严格校验 code。

const ROOM_ID = 10049827;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 统一的 JSON 请求头（浏览器样式，降低被风控概率）
const BASE_HEADERS = {
    'User-Agent': UA,
    'Referer': `https://live.bilibili.com/${ROOM_ID}`,
    'Origin': 'https://live.bilibili.com',
    'Accept': 'application/json, text/plain, */*',
};

/**
 * 主接口：get_info，可同时拿到 live_status 与房间标题。
 * @returns {{status:number,title:string}|null} 成功返回状态对象；HTTP/业务失败或被风控返回 null
 */
async function fetchGetInfo() {
    try {
        const url = `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${ROOM_ID}&from=1&platform=web`;
        const resp = await fetch(url, { headers: BASE_HEADERS });
        if (!resp.ok) return null;
        const json = await resp.json();
        // 必须校验业务 code：code!==0 或 data 缺失即视为失败（风控常见为 data=null）
        if (!json || json.code !== 0 || !json.data) return null;
        const status = Number(json.data.live_status);
        if (Number.isNaN(status)) return null;
        return { status, title: json.data.title || '' };
    } catch (e) {
        return null;
    }
}

/**
 * 备用接口：room_init，网页初始化用，风控更宽松、无需签名，但不含标题。
 * @returns {number|null} 成功返回 live_status；失败返回 null
 */
async function fetchRoomInit() {
    try {
        const url = `https://api.live.bilibili.com/room/v1/Room/room_init?id=${ROOM_ID}&from=1&platform=web`;
        const resp = await fetch(url, { headers: BASE_HEADERS });
        if (!resp.ok) return null;
        const json = await resp.json();
        if (!json || json.code !== 0 || !json.data) return null;
        const status = Number(json.data.live_status);
        return Number.isNaN(status) ? null : status;
    } catch (e) {
        return null;
    }
}

// 统一的响应头：JSON + 不缓存（直播状态需实时）
const RESP_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
};

export async function onRequest(context) {
    // 1. 主接口 get_info
    const main = await fetchGetInfo();
    if (main) {
        return new Response(
            JSON.stringify({ live_status: main.status, title: main.title }),
            { headers: RESP_HEADERS }
        );
    }

    // 2. 主接口被风控/失败 → 备用 room_init 兜底（标题留空）
    const fallbackStatus = await fetchRoomInit();
    if (fallbackStatus !== null) {
        return new Response(
            JSON.stringify({ live_status: fallbackStatus, title: '' }),
            { headers: RESP_HEADERS }
        );
    }

    // 3. 所有上游均失败：返回 live_status=-1，前端据此保持原样（不误报开播/停播）
    return new Response(
        JSON.stringify({ live_status: -1, title: '', error: 'all upstreams blocked or failed' }),
        { headers: RESP_HEADERS }
    );
}
