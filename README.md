# 栖苑歌单

栖苑太困辽的个人歌单展示网站，支持歌单浏览、搜索筛选、随机点歌、付费标记，以及通过 Excel 上传更新歌单数据。

- 直播间：https://live.bilibili.com/10049827
- 个人空间：https://space.bilibili.com/303246676
- 线上访问：https://qylive.pages.dev

## 功能特性

### 歌单展示
- 歌曲列表展示，支持滚动加载更多（每页 20 首）
- 按歌名 / 歌手实时搜索
- 三维筛选：语言（中文 / 日文 / 英文）、风格（甜歌 / 苦情）、曲风（流行 / 国风）
- 打乱顺序
- 点击任意歌曲行，自动复制「点歌 歌名」到剪贴板
- 随机一首：弹窗展示随机歌曲，可复制歌名或重新随机
- 付费（SC）歌曲金色徽章标记，金额来自数据字段

### 响应式设计
- PC 端：筛选按钮一行排列，歌曲四列布局
- 平板 / 手机端（≤1024px）：筛选按钮三行分组居中，歌曲两行卡片布局
- 背景图针对手机 / 平板 / PC 三档宽度做了人物焦点位置偏移
- 适配 iPhone 刘海屏 / 底部横条安全区域
- 随机背景图（2 张），页面刷新时随机切换，窗口缩放时不换图

### 歌单管理（upload.html）
- 选择本地 Excel 文件，自动解析并预览转换后的 JSON 数据
- 支持中文分号「；」和英文分号「;」两种曲风分隔方式
- 付费（SC）标记智能合并：Excel 中 SC 列为空时，自动沿用线上已有付费标记，避免覆盖丢失
- 一键推送到 GitHub，自动更新 songs.json 和页面最后更新日期

## 项目结构

```
live/
├── index.html          # 歌单展示主页
├── upload.html         # 歌单更新管理页
├── style.css           # 样式表
├── app.js              # 主页交互逻辑
├── songs.json          # 歌单数据（min 压缩存储）
├── lib/
│   └── xlsx.full.min.js # Excel 解析库（本地化，不依赖 CDN）
├── bgi-w-idol.webp     # 背景图 1
├── bgi-w-witch.webp    # 背景图 2
├── e22a6dd3...avif     # 头像图片
├── favicon.ico         # 站点图标
└── README.md
```

## 歌单数据格式

`songs.json` 为歌曲对象数组，每首歌包含以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| title | string | 歌名 |
| singer | string | 歌手 |
| genre | string | 曲风（流行 / 国风） |
| style | string | 风格（甜歌 / 苦情，可为空） |
| lang | string | 语言（中文 / 日文 / 英文） |
| sc | string | 付费金额，非空即显示 SC ¥xx 徽章，可为空字符串 |

示例：
```json
[{"title":"撞地球","singer":"鱼儿七","genre":"流行","style":"","lang":"中文","sc":"30"}]
```

## Excel 上传模板

`upload.html` 接受的 Excel 文件格式固定，第一行为表头，后续每行为一首歌曲：

| 列 | 表头 | 说明 |
|---|---|---|
| A | 歌名 | 歌曲名称 |
| B | 歌手 | 歌手名称 |
| C | 类型 | 曲风，可用「；」或「;」分隔曲风与风格，如「流行；甜歌」 |
| D | 语言 | 中文 / 英文 / 日文（含关键字即可自动归一化） |
| E | SC | 付费金额，留空表示非付费或沿用线上已有标记 |

> 表头格式不可更改，由上传方使用固定模板。

## 本地预览

项目使用 `fetch` 加载 `songs.json`，不能直接双击 `index.html` 打开（浏览器 file:// 协议限制），需启动本地静态服务器：

```bash
# 方式一：Python
python -m http.server 8123

# 方式二：Node.js
npx serve .
```

然后访问 http://localhost:8123

## 部署

项目为纯静态站点，可直接部署到任意静态托管服务。当前使用 Cloudflare Pages：

- 构建命令：无
- 输出目录：根目录
- 推送至 GitHub main 分支后自动部署

## 技术栈

- 纯 HTML + CSS + JavaScript，无前端框架
- SheetJS（xlsx）：浏览器端 Excel 解析
- GitHub API：歌单数据在线更新
- Cloudflare Pages：静态托管与 CDN
