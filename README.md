# GLEAM 成本核算器

用于按项目成员、项目周期、外部耗费、与光 AI 积分成本、利润率和税点计算对外报价。

## 当前可还原内容

- 项目起止日期与 2026 年中国工作日核算
- 每位内部成员独立录入月工资和投入天数
- 成员库入口（当前为空，不包含“小保”）
- 外部耗费：类目、承接人 / 供应商、费用
- 与光 AI 积分换算：`1 元 = 12.5 积分`
- 目标利润率滑块
- 风险预估费用比例（默认 15%，可手动调整）
- 税点、未税报价、含税报价和成本明细
- 修改含税报价后反算利润率
- Apple 风格圆角与磨砂玻璃界面

## 源码位置

| 路径 | 用途 |
| --- | --- |
| `app/page.tsx` | 页面功能和计算逻辑，是主要源码 |
| `app/globals.css` | 页面样式 |
| `app/layout.tsx` | 标题、描述和图标 |
| `public/favicon.svg` | 网站图标 |
| `pages-src/` | Cloudflare Pages 的浏览器入口 |
| `.openai/hosting.json` | 原 ChatGPT Sites 项目标识 |
| `vite.pages.config.ts` | Cloudflare Pages 静态构建配置 |
| `wrangler.jsonc` | Cloudflare Pages 输出目录配置 |

`index.html`、`assets/` 和根目录 `favicon.svg` 是由 `npm run build:pages` 自动同步的静态成品，不是主要编辑入口。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm ci
npm run dev
```

默认本地地址为 `http://localhost:5173/`。

## 构建与检查

原 ChatGPT Sites / Vinext 构建：

```bash
npm run build
```

Cloudflare Pages 静态构建：

```bash
npm run build:pages
```

静态构建输出在 `dist-pages/`。该命令还会把当前首页、资源和图标同步到仓库根目录，以兼容现有 Cloudflare 项目直接读取仓库根目录的设置。

代码检查：

```bash
npm run lint
```

## 恢复现有网站

### 原预览链接

`.openai/hosting.json` 保留了现有 Sites 项目 ID，因此只要该项目仍在原账号下，就可以从这份源码重新构建并发布到原 Sites 项目。源码能够还原页面和功能；能否继续使用完全相同的 `chatgpt.site` 地址，取决于原 Sites 项目是否仍存在及账号是否有发布权限。

### Cloudflare Pages

推荐配置：

- Production branch：`main`
- Build command：`npm run build:pages`
- Build output directory：`dist-pages`
- Node.js：22.13 或更高版本

如果 Cloudflare 项目保持“直接读取仓库根目录”的旧配置，也必须把 `index.html`、`assets/` 和 `favicon.svg` 一起提交，不能只提交 HTML。

## 已知限制

中国法定节假日和调休日期目前只录入了 2026 年。跨到其他年份时，普通周末仍会计算，但法定节假日和调休需要补充对应年份的数据。
