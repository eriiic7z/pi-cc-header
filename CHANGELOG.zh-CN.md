# 变更日志

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
