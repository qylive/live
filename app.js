
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
        render();
    } catch (err) {
        console.error('加载歌单失败：', err);
        showToast('歌单文件加载失败，请检查songs.json', true);
    }
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
    const kw = document.querySelector('.search-input').value.toLowerCase();
    filtered = allSongs.filter(s => {
        if (lang !== 'all' && s.lang !== lang) return false;
        if (style !== 'all' && s.style !== style) return false;
        if (qufeng !== 'all' && s.genre !== qufeng) return false;
        if (kw && !`${s.title}${s.singer}`.toLowerCase().includes(kw)) return false;
        return true;
    });
    page = 1;
    render();
}
// 搜索
document.querySelector('.search-input').oninput = doFilter;
// 打乱
document.querySelector('.shuffle-btn').onclick = () => {
    filtered.sort(() => Math.random() - 0.5);
    page = 1;
    render();
};
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
