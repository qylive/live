
// 随机背景图片数组
const bgList = [
    "bgi-w-idol.webp",
    "bgi-w-witch.webp"
];
// 页面加载时随机选一次图，之后不再变更（resize 只重算位置，不换图）
const currentBg = bgList[Math.floor(Math.random() * bgList.length)];

// 根据窗口宽度计算背景水平焦点位置（适配手机/平板/PC）
function calcBgPos(img) {
    const winWidth = window.innerWidth;
    if (img === "bgi-w-idol.webp") {
        if (winWidth <= 480) return "80%";
        else if (winWidth <= 768) return "70%";
        else if (winWidth <= 1024) return "65%";
        else return "center";
    } else {
        // bgi-w-witch：PC居中，平板30%，大屏手机15%，小屏10%
        if (winWidth <= 480) return "10%";
        else if (winWidth <= 768) return "15%";
        else if (winWidth <= 1024) return "30%";
        else return "center";
    }
}

// 应用背景：通过 CSS 变量设置伪元素背景层（iOS 兼容的 fixed 方案）
function applyBg() {
    document.body.style.setProperty('--bg-url', `url(${currentBg})`);
    document.body.style.setProperty('--bg-pos', calcBgPos(currentBg));
}
// 页面载入执行
applyBg();
// 窗口缩放只重算位置，不重新随机背景图
window.addEventListener('resize', applyBg);

let allSongs = [];
let filtered = [];
let page = 1;
const size = 20;
// 当前弹窗内选中的歌曲对象
let currentRandomSong = null;
// ========== 绿色堆叠气泡提示 ==========
function showToast(msg, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = msg;
    if (isError) toast.classList.add('error');
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
// HTML 转义，防止歌名/歌手等文本中的特殊字符破坏页面结构
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
// 复制文本（带降级）：优先 navigator.clipboard，不可用时用 execCommand 兜底
function copyText(text, okMsg) {
    const fallbackCopy = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    };
    const done = () => showToast(okMsg || `已复制：${text}`);
    const fail = () => showToast('复制失败，请手动复制', true);
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => {
            if (fallbackCopy()) done(); else fail();
        });
    } else {
        if (fallbackCopy()) done(); else fail();
    }
}
// 渲染歌曲 - PC端四列 / 移动端两行
// 付费(SC)标记：songs.json 中带非空 sc 字段即为付费歌曲
// 从同级 songs.json 加载歌曲数据
async function loadSongJson() {
    try {
        const res = await fetch('./songs.json');
        if (!res.ok) throw new Error('文件不存在或读取失败');
        allSongs = await res.json();
        filtered = [...allSongs];
        buildSingerOptions();
        render();
    } catch (err) {
        console.error('加载歌单失败：', err);
        showToast('歌单文件加载失败，请检查songs.json', true);
    }
}
// ====================== 歌手下拉框：从歌单数据聚合提取 ======================
// 拆分合唱歌手名的分隔符（不含字母 x，避免误拆 萧忆情Alex 这类名字）
const SINGER_SEP_RE = /[、,，/／&＆]|\s+feat\.?\s+/i;
// 当前选中的歌手名（'all' = 全部歌手）
let currentSinger = 'all';
function splitSingers(singer) {
    return String(singer || '').split(SINGER_SEP_RE).map(s => s.trim()).filter(Boolean);
}
// 聚合统计：按拆分后的歌手名计数（一首歌里出现的每个歌手名各计一次），数量降序排列
function buildSingerOptions() {
    const dropdown = document.getElementById('singerSelectDropdown');
    if (!dropdown) return;
    const countMap = {};
    allSongs.forEach(s => {
        splitSingers(s.singer).forEach(name => {
            countMap[name] = (countMap[name] || 0) + 1;
        });
    });
    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
    // 首项「全部歌手」，其余按数量降序追加；当前选中项高亮
    dropdown.innerHTML = '';
    const mk = (name, count) => {
        const li = document.createElement('li');
        li.className = 'singer-opt' + (currentSinger === name ? ' active' : '');
        li.dataset.name = name;
        const nm = document.createElement('span');
        nm.className = 'singer-opt-name';
        nm.textContent = count === undefined ? '全部歌手' : name;
        li.appendChild(nm);
        if (count !== undefined) {
            const ct = document.createElement('span');
            ct.className = 'singer-opt-count';
            ct.textContent = count;
            li.appendChild(ct);
        }
        dropdown.appendChild(li);
    };
    mk('all');
    entries.forEach(([name, count]) => mk(name, count));
}
// ====================== 渲染函数：纯DIV生成，无table ======================
function render() {
  const wrapEl = document.getElementById('list');
  const pageData = filtered.slice((page - 1) * size, page * size);
  let htmlStr = '';

  // 第一页绘制PC表头
  if(page === 1) {
    htmlStr += `
      <div class="song-header-pc">
        <div class="col-index">#</div>
        <div class="col-title">歌名</div>
        <div class="col-singer">歌手</div>
        <div class="col-cate">类别</div>
      </div>
    `;
  }

  // 循环生成每行歌曲DIV
  pageData.forEach((item, i) => {
    const index = page * size - size + i + 1;
    const category = `${item.lang}·${item.genre}${item.style ? '/' + item.style : ''}`;
    const showBadge = !!(item.sc && item.sc.trim() !== '');
    const scVal = item.sc?.trim() || "30";
    const badgeText = `SC ¥${scVal}`;
    const badgeHtml = showBadge ? `<span class="badge-sc">${escapeHtml(badgeText)}</span>` : '';
    const mobileBadge = showBadge ? `<span class="badge-sc" style="font-size:10px; padding:1px 4px;">${escapeHtml(badgeText)}</span>` : '';

    // PC端行
    htmlStr += `
      <div class="song-row-pc" onclick="copyThis(${page * size - size + i})">
        <div class="col-index">${index}</div>
        <div class="col-title">${escapeHtml(item.title)}${badgeHtml}</div>
        <div class="col-singer">${escapeHtml(item.singer)}</div>
        <div class="col-cate">${escapeHtml(category)}</div>
      </div>
    `;
    // 移动端行
    htmlStr += `
      <div class="song-row-mobile" onclick="copyThis(${page * size - size + i})">
        <div class="mobile-left">
          <span class="mobile-index">#${index}</span>
          <div class="mobile-title-wrap">
            <div class="mobile-title">${escapeHtml(item.title)}${mobileBadge}</div>
            <div class="mobile-singer">${escapeHtml(item.singer)}</div>
          </div>
        </div>
        <span class="mobile-category">${escapeHtml(category)}</span>
      </div>
    `;
  });

  // 追加或覆盖页面
  if(page === 1) wrapEl.innerHTML = htmlStr;
  else wrapEl.innerHTML += htmlStr;
  document.getElementById('song-count').innerText = filtered.length + ' 首歌';
}
// 点击整行复制
function copyThis(index) {
    const item = filtered[index];
    if (!item) return;
    copyText(`点歌 ${item.title}`);
}

// 弹窗DOM绑定
const randomModal = document.getElementById('randomModal');
const modalSongTitle = document.getElementById('modalSongTitle');
const modalSingerText = document.getElementById('modalSingerText');
const tagLang = document.getElementById('tagLang');
const tagGenre = document.getElementById('tagGenre');
const tagStyle = document.getElementById('tagStyle');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalReRandomBtn = document.getElementById('modalReRandomBtn');

// 刷新随机歌曲、填充弹窗所有内容
function refreshRandomSong() {
    if (filtered.length === 0) {
        showToast('暂无可播放歌曲', true);
        randomModal.classList.remove('show');
        return;
    }
    // 随机抽取筛选后的歌曲
    currentRandomSong = filtered[Math.floor(Math.random() * filtered.length)];
    const isPaid = !!(currentRandomSong.sc && currentRandomSong.sc.trim() !== '');
    // sc兜底30
    const scVal = currentRandomSong.sc?.trim() || "30";
    const modalBadgeText = `SC ¥${scVal}`;
    // 填充歌名+动态付费徽章
    let titleHtml = currentRandomSong.title;
    if(isPaid) {
        titleHtml += `<span class="modal-title-badge">${modalBadgeText}</span>`;
    }
    modalSongTitle.innerHTML = titleHtml;

    // 填充歌手
    modalSingerText.textContent = `歌手：${currentRandomSong.singer}`;

    // 基础两个标签必显示
    tagLang.textContent = currentRandomSong.lang;
    tagGenre.textContent = currentRandomSong.genre;

    // 风格为空则隐藏标签，有内容才展示
    if(currentRandomSong.style && currentRandomSong.style.trim() !== ''){
        tagStyle.textContent = currentRandomSong.style;
        tagStyle.style.display = 'inline-block';
    }else{
        tagStyle.style.display = 'none';
    }
    randomModal.classList.add('show');
}

// 打开弹窗
function openRandomModal(){
    refreshRandomSong();
}

// 复制歌名
function copyModalSong(){
    if(!currentRandomSong) return;
    copyText(`点歌 ${currentRandomSong.title}`);
}

// 绑定所有点击事件
modalCopyBtn.onclick = copyModalSong;
modalReRandomBtn.onclick = refreshRandomSong;
// 点击黑色遮罩空白区域关闭弹窗
randomModal.onclick = function(e){
    if(e.target === randomModal){
        randomModal.classList.remove('show');
    }
}

// 随机一首按钮绑定打开弹窗
document.querySelector('.random-btn').onclick = openRandomModal;

// 筛选
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(`.filter-btn[data-type="${btn.dataset.type}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        doFilter();
    };
});
function doFilter() {
    const lang = document.querySelector('.filter-btn[data-type="lang"].active')?.dataset.val || 'all';
    const style = document.querySelector('.filter-btn[data-type="style"].active')?.dataset.val || 'all';
    const qufeng = document.querySelector('.filter-btn[data-type="qufeng"].active')?.dataset.val || 'all';
    const singer = currentSinger;
    const kw = document.querySelector('.search-input').value.toLowerCase();
    filtered = allSongs.filter(s => {
        if (lang !== 'all' && s.lang !== lang) return false;
        if (style !== 'all' && s.style !== style) return false;
        if (qufeng !== 'all' && s.genre !== qufeng) return false;
        // 歌手筛选：模糊匹配（选中歌手名，匹配歌手字段包含该名字的歌曲，合唱歌曲含多个名字也能命中）
        if (singer !== 'all' && !s.singer.toLowerCase().includes(singer.toLowerCase())) return false;
        if (kw && !`${s.title}${s.singer}`.toLowerCase().includes(kw)) return false;
        return true;
    });
    page = 1;
    render();
}
// 搜索
document.querySelector('.search-input').oninput = doFilter;
// 歌手下拉框筛选（自定义组件交互）
const singerWrap = document.getElementById('singerSelectWrap');
const singerBtn = document.getElementById('singerSelectBtn');
const singerLabel = document.getElementById('singerSelectLabel');
const singerDropdown = document.getElementById('singerSelectDropdown');
function toggleSingerDropdown(force) {
    if (!singerDropdown) return;
    const willOpen = force !== undefined ? force : singerDropdown.hidden;
    singerDropdown.hidden = !willOpen;
    singerBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    singerWrap.classList.toggle('open', willOpen);
}
function setSinger(name) {
    currentSinger = name;
    singerLabel.textContent = name === 'all' ? '全部歌手' : name;
    document.querySelectorAll('.singer-opt').forEach(li => li.classList.toggle('active', li.dataset.name === name));
    toggleSingerDropdown(false);
    doFilter();
}
singerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSingerDropdown();
});
singerDropdown.addEventListener('click', (e) => {
    const li = e.target.closest('.singer-opt');
    if (li) setSinger(li.dataset.name);
});
// 点击外部区域收起下拉
document.addEventListener('click', (e) => {
    if (singerWrap && !singerWrap.contains(e.target) && !singerDropdown.hidden) toggleSingerDropdown(false);
});
// Esc 收起下拉
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && singerDropdown && !singerDropdown.hidden) toggleSingerDropdown(false);
});
// 滚动加载
document.querySelector('.list-container').onscroll = function () {
    const el = this;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
        if (page * size < filtered.length) {
            page++;
            render();
        }
    }
};
// 初始化加载歌单数据
loadSongJson();

// ===== 欢迎动画：遮罩播放完毕后移除，避免遮挡页面交互 =====
const welcomeOverlay = document.getElementById('welcome-overlay');
if (welcomeOverlay) {
    // 只响应遮罩自身动画结束（子元素动画的 animationend 会冒泡，需过滤，否则会提前移除遮罩）
    welcomeOverlay.addEventListener('animationend', (e) => {
        if (e.target === welcomeOverlay) welcomeOverlay.remove();
    });
}

// ===== B站直播间开播状态检测（仅进入页面时查询一次，不轮询） =====
// 状态由本地 danmu 监控程序检测后推送 GitHub 仓库 live-status.json（静态文件，走 CDN）
// 仅当 live_status===1（直播中）时才展示律动动画；其他一切情况均保持原样
async function checkLiveStatus() {
    const avatarLink = document.querySelector('.avatar-link');
    if (!avatarLink) return;
    try {
        const resp = await fetch('./live-status.json?_t=' + Date.now());
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && (data.live_status === 1 || data.live_status === '1')) {
            avatarLink.classList.add('live');
        }
    } catch (e) { /* 网络失败保持原样 */ }
}
checkLiveStatus();
