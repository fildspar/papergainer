# PaperGainer

> **no papers, no pain.**

上传学术 PDF，AI 生成中文主要思路分析。纯静态前端，无需服务器，无需注册，数据全部保存在本地浏览器中。

---

## 功能特性

- **PDF 拖拽上传**：直接拖入 PDF 文件即可，支持批量分析多个文件
- **5 种分析模板**：结构化学术 / 要点速览 / 对比分析 / 通俗解读 / 自定义提示词
- **分析结果缓存**：同一论文不同模板的结果缓存到本地，切换模板无需重复调用 API
- **AI 思考链展示**：推理模型（如 MiniMax-M2.5）的思考过程以折叠形式展示
- **分析历史记录**：自动保存最近 50 条记录，支持随时重新查看
- **导出 Markdown**：一键导出分析结果，或复制全文
- **论文获取导航**：内置 12 个常用学术平台快捷入口（Google Scholar、arXiv、PubMed、Sci-Hub 等）
- **亮色 / 暗色双主题**：一键切换
- **零依赖零构建**：纯 HTML + CSS + Vanilla JS，用浏览器直接打开即可运行

---

## 快速开始

### 方式一：部署到 GitHub Pages（推荐）

1. **Fork** 本项目到你的 GitHub 账号
2. 进入仓库 **Settings → Pages**
3. Source 选择 `Deploy from a branch`，Branch 选择 `main`，目录选择 `/ (root)`
4. 保存后等待约 1 分钟，访问 `https://你的用户名.github.io/papergainer/`
5. 在网页右上角点击 ⚙ 设置，填入你的 API Key 即可使用

### 方式二：本地运行

```bash
git clone https://github.com/你的用户名/papergainer.git
cd papergainer
# 直接用浏览器打开 index.html
# 或用本地服务器（避免 CORS 问题）：
python3 -m http.server 8080
# 访问 http://localhost:8080
```

### 配置 API

点击右上角 **⚙ 设置**，填入以下信息：

| 字段 | 说明 |
|------|------|
| Base URL | 国际版：`https://api.minimax.chat/v1`<br>国内版：`https://api.minimaxi.com/v1` |
| API Key | 在 [MiniMax 控制台](https://www.minimaxi.com) 申请，以 `eyJ` 开头 |
| 模型名称 | 如 `MiniMax-Text-01`、`abab6.5s-chat`、`MiniMax-M2.5` |

> API Key 仅存储在本地浏览器 localStorage，不会上传到任何服务器。

---

## 分析模板

| 模板 | 适用场景 |
|------|----------|
| ◈ 结构化学术 | 固定分节：研究背景 / 核心方法 / 实验设计 / 主要结论 / 局限性 |
| ◎ 要点速览 | 一句话总结 + 核心要点，适合快速浏览 |
| ⇌ 对比分析 | 与已有工作的创新点对比 |
| ◉ 通俗解读 | 用非专业语言解释，适合跨领域阅读 |
| ✦ 自定义 | 使用在设置页配置的自定义提示词 |

---

## 项目结构

```
papergainer/
├── index.html          # 主页：PDF 上传 + 论文获取导航 + 历史记录
├── paper.html          # 详情页：AI 分析结果看板
├── settings.html       # 设置页：API 配置 + 自定义模板
├── 说明.md             # 中文详细使用说明
├── css/
│   ├── base.css        # CSS 变量与双主题系统
│   ├── components.css  # 通用组件样式
│   └── pages.css       # 页面级布局样式
├── js/
│   ├── config.js       # localStorage 配置管理
│   ├── main.js         # 三页面路由入口
│   ├── templates.js    # 5 个 AI 分析模板定义
│   ├── ai/
│   │   ├── minimax.js  # MiniMax API 封装（OpenAI 兼容）
│   │   └── modes.js    # 三种分析模式 + pdf.js 懒加载
│   └── ui/
│       ├── detail.js   # 详情页渲染（Markdown、思考链、模板切换）
│       ├── toast.js    # Toast 通知组件
│       ├── search.js   # 搜索栏组件
│       └── card.js     # 论文卡片组件
└── assets/
```

---

## 注意事项

- **扫描件 PDF**：图片型 PDF 无法提取文字，请使用包含可选中文字的 PDF
- **CORS 限制**：直接双击打开 HTML 时，部分浏览器会有限制，建议用本地 HTTP 服务器或部署到 Pages
- **API 费用**：每次分析会调用 MiniMax API，请留意用量和额度

---

## License

MIT
