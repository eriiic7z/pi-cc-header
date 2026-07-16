# 变更日志

## v0.8.2 (2026-07-16)

### 变更

- package.json description：改写为 Claude Code 风格定位 —— 九色调色板、IBM 横线、Minecraft 渐变主题

## v0.8.1 (2026-07-16)

### 修复

- README：中文区补上了缺失的截图，中英文区图片引用完全对称

---

## v0.8.0 (2026-07-16)

### 新增

- Clawd 螃蟹红 `c` 颜色 — sRGB(251, 73, 52)，Claude Code 小螃蟹的明亮橙色
- Anthropic 品牌橙 `a` 颜色 — rgb(217, 119, 87)（原 `c` 键改为品牌色标识；现为默认色）
- 九色调色板（c a r o y g w b p）

### 变更

- `/hl` 改名为 `/hi` — 提示改为「开关 IBM 横线」
- `/hg` 改名为 `/hm` — 提示改为「开关 Minecraft 风格」
- `/hc` 调色板更新：c=clawd 螃蟹红 a=anthropic 品牌橙 r=red 红 o=orange 橙 y=yellow 黄 g=green 绿 w=white 白 b=blue 蓝 p=purple 紫
- `/hdf` 开发者默认配置：颜色 → `c`，版本号颜色 → Pi+ver
- README 功能描述：改为「14 帧 Minecraft 风格像素 Pi logo 动画」
- README：在功能与命令之间插入演示 GIF 动图
- package.json keywords：添加 `extension` 以在 pi.dev 搜索列表显示
- package.json files：添加 `assets` 使截图和 GIF 在 npm 与 pi 官网正常渲染

### 修复

- `/hv`、`/hi`、`/hm`、`/hdf` 不再重复输出 header 和对话 — `clearMode` 从 `"viewport"` 改为 `"none"`
- `/hrl` 不再在 `ctx.reload()` 前重复创建 header

---

## v0.7.4 (2026-07-14)

### 新增

- 螃蟹橙 `c` 颜色（Claude Code 强调色），现为默认色

### 变更

- 绿色 CMAP 对齐 GMAP L3（24-bit RGB）
- 蓝色 CMAP 对齐 GMAP L3（24-bit RGB）
- 白色 GMAP 渐变以暖白为底色重新调整

## v0.7.3 (2026-07-14)

### 变更

- CMAP/GMAP 颜色顺序调整为 赤/橙/黄/绿/白/蓝/紫

### 修复

- `/hc` 命令不再清除输入框边框和状态栏
- 样式命令切换不再清除输入框边框和状态栏 — `apply()` 现在对命令调用仅清可见区域，全量清屏仅用于会话启动

## v0.7.1 (2026-07-13)

### 新增

- `/hrl` 命令：切换启动时资源清单的显示/隐藏

### 变更

- `/htg` 禁用：改用手动恢复 TUI 替代 `ctx.reload()`，更改在下次会话生效
- 清屏操作移至 `apply()` 以覆盖资源清单输出

### 修复

- `/htg` 重新启用缺少 `clearOnStart` 导致资源清单残留
- 移除 `apply()` 中的 `setFooter()` 和 `setWorkingIndicator()` — 不再覆盖原生状态栏

## v0.7.0 (2026-07-13)

### 新增

- `/htg` 命令：切换 pi-cc-header 启用/禁用（配置保留）
- `/hdf` 命令：恢复开发者默认配置
- 禁用状态下锁定所有样式命令（防盲操）
- `ccHeader` 配置中的 `disabled` 标记，跨 reload/重启持久化

### 变更

- `/hgd` 改名为 `/hg`
- `/pi-look` 改名为 `/htg`（原 `/h-off`）
- 全部命令统一为 `h` + 字母命名：`/hl`、`/hc`、`/hv`、`/hg`、`/htg`、`/hdf`
- 每次启动强制清屏（无条件，删除 `/clear-on-start`）
- 每次启动强制 `quietStartup = true`

### 移除

- `/clear-on-start` 命令（现为自动行为，不可开关）

## v0.6.0 (2026-07-12)

### 新增

- 4 级 24-bit 真彩色渐变（亮→暗），应用在最后一帧
- `/hgd` 命令：开关渐变效果
- `GMAP` 颜色渐变映射表 — 渐变自动跟随 `/hc` 颜色切换
- `logoColorKey` 重构：存储颜色键名而非 ANSI 编码

### 变更

- Pi 像素和横线使用 `l1`–`l4` / `s1`–`s4` 动态渐变色阶
- `logoBrand` 和 `colorCell` 使用 `CMAP[logoColorKey]` 动态取色

## v0.5.1 (2026-07-12)

### 修复

- 重启/reload 后设置丢失：`/hl`、`/hc`、`/hv` 现已持久化到 `settings.json` 的 `ccHeader` 键下

## v0.5.0 (2026-07-12)

### 新增

- 七色调色板：赤、橙、黄、绿、蓝、紫、白
- `/hc` 命令：设置颜色（`/hc r`、`/hc b` 等）
- `/hv` 命令：版本号颜色三态（OFF / Pi 变色 / Pi+版本号变色）
- `CMAP` 颜色映射表，动态 `logo` / `logoStripe` 颜色类型
- `logoBrand` 函数 — Pi 版本文字跟随 logo 颜色

### 变更

- 横线开关改名为 `/hl`
- 最后一帧 Pi 和横线使用动态颜色

## v0.4.1 (2026-07-12)

### 新增

- `/lined` 命令开关 IBM 横线
- `stripeEnabled` 标志和 `recomputeFrames()` 函数

### 变更

- `PRECOMPUTED_LOGO_FRAMES` 由 `const` 改为 `let`

## v0.4.0 (2026-07-12)

### 新增

- IBM 风格水平横线：最后一帧非 Pi 像素渲染为 `──`
- 横线区域限制在 Pi 行（y≥2），左右对称（x≤6）
- 跳过顶部空行（y=1）

### 变更

- `LogoColor` 和 `colorCell` 新增 `stripe` 颜色类型

## v0.3.0 (2026-07-12)

### 移除

- 全部鼠标追踪、点击重播和输入监听代码
- `handleInput`、`restart`、`enableMouse`、`disableMouse` 方法

### 变更

- `timer` 恢复为 `readonly` —— 纯动画 header

## v0.2.1 (2026-07-12)

### 变更

- 简化鼠标追踪：始终开启，非 logo 点击不触发 toggle
- 非 logo 鼠标事件忽略

## v0.2.0 (2026-07-11)

### 新增

- 帧预计算，零开销渲染
- 鼠标追踪与 SGR 事件解析
- logo 区域点击重播动画
- 非 logo 点击关闭追踪，2 秒后自动恢复
- 输入监听（`tui.addInputListener` / `ctx.ui.onTerminalInput`）

### 变更

- 删除无用 `gap` 变量
- 合并 `info[i]` 双重判空

## v0.1.0 (2026-07-10)

### 新增

- 初始发布：取自 pi.dev/install.sh 的 Pi logo 像素动画
- 14 帧动画，基于 phase 的颜色逻辑
- Header 显示 Pi 版本、模型、思考级别、扩展/技能数量、当前目录
- `clear-on-start` 和 `pi-look` 命令
