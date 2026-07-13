# pi-cc-header

[中文](#中文)

Animated Pi logo header for [pi coding agent](https://pi.dev).

## Features

- 14-frame pixel-animated Pi logo
- 7-color palette: red, orange, yellow, green, blue, purple, white
- 4-level 24-bit true-color gradient
- IBM-style horizontal stripes
- Version number color modes
- Displays Pi version, model, thinking level, extension/skill counts, and cwd

## Commands

| Command | Description |
| --- | --- |
| `/hl` | Toggle IBM-style horizontal stripes |
| `/hc r/o/y/g/b/p/w` | Set logo color |
| `/hv` | Cycle version color: OFF → Pi only → Pi+ver |
| `/hg` | Toggle 24-bit gradient |
| `/htg` | Enable / disable pi-cc-header |
| `/hdf` | Reset to developer defaults |

### Disabled state

When pi-cc-header is disabled (`/htg`), all style commands are locked to prevent blind configuration. Use `/htg` again to re-enable.

`/reload` and restart preserve the enabled/disabled state.

## Auto behavior

- Force `quietStartup = true` on every session start
- Force clear scrollback on every session start

## Credits

Logo animation adapted from [pi.dev/install.sh](https://pi.dev/install.sh).

---

## 中文

[pi coding agent](https://pi.dev) 的 Pi logo 动画 header。

## 功能

- 14 帧像素 Pi logo 动画
- 七色调色板：赤、橙、黄、绿、蓝、紫、白
- 4 级 24-bit 真彩色渐变
- IBM 风格水平横线
- 版本号颜色模式
- 显示 Pi 版本、模型、思考级别、扩展/技能数量、当前目录

## 命令

| 命令 | 说明 |
| --- | --- |
| `/hl` | 开关 IBM 横线 |
| `/hc r/o/y/g/b/p/w` | 设置 logo 颜色 |
| `/hv` | 切换版本号颜色模式 |
| `/hg` | 开关渐变 |
| `/htg` | 启用 / 禁用 pi-cc-header |
| `/hdf` | 恢复开发者默认配置 |

### 禁用状态

pi-cc-header 被禁用后，所有样式命令会被锁定，防止盲操配置。重新执行 `/htg` 即可恢复。

`/reload` 和重启均保持当前的启用/禁用状态。

## 自动行为

- 每次启动强制 `quietStartup = true`
- 每次启动强制清屏

## 致谢

Logo 动画取自 [pi.dev/install.sh](https://pi.dev/install.sh)。
