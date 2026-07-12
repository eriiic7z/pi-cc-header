# 变更日志

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
