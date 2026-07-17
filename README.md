# pi-cc-header

[中文](#中文)

Claude Code–style startup header for [pi coding agent](https://pi.dev).

![pi-cc-header](assets/screenshot.png)

## Features

- 14-frame Pi logo animation
- Session info row: version, model, thinking level, extensions, skills, cwd
- 9-color palette: Anthropic brand orange, Clawd crab red, and more
- Version number coloring
- IBM-style horizontal stripes
- Minecraft-style pixel theme and 4-level 24-bit true-color gradient
- Startup resource list visibility control

![pi-cc-header demo](assets/demo.gif)

## Commands

| Command | Description | Takes effect |
| --- | --- | --- |
| `/hc c/a/r/o/y/g/w/b/p` | Set logo color: c=clawd a=anthropic r=red o=orange y=yellow g=green w=white b=blue p=purple | Immediate |
| `/hv` | Cycle version color: OFF → Pi only → Pi+ver | Immediate |
| `/hi` | Toggle IBM-style on/off | Immediate |
| `/hm` | Toggle Minecraft-style on/off | Immediate |
| `/hrl` | Toggle resource list visibility | Next session |
| `/hdf` | Reset to developer defaults | Immediate |
| `/htg` | Enable / disable pi-cc-header | Next session |

### Enabling, disabling, and resetting

pi-cc-header is enabled by default on first install. Disabling it with `/htg` locks all style commands (except `/htg` itself) to prevent blind configuration. Run `/htg` again to re-enable with your previous config — **changes take effect the next session**.

Use `/hdf` to reset all settings to developer defaults (Clawd crab red). **This overwrites your config immediately with no backup** — you will need to reconfigure from scratch.

## Auto behavior

- Force `quietStartup = true` on every session start
- Force clear scrollback on every session start

## Credits

Logo animation adapted from [pi.dev/install.sh](https://pi.dev/install.sh).

---

## 中文

[pi coding agent](https://pi.dev) 的 Claude Code 风格启动头部。

![pi-cc-header](assets/screenshot.png)

## 功能

- 14 帧 Pi logo 动画
- 会话信息行：版本、模型、思考级别、扩展、技能、当前目录
- 九色调色板：Anthropic 品牌橙、Clawd 螃蟹红等
- 版本号颜色设定
- IBM 风格水平横线
- Minecraft 风格像素主题，4 级 24-bit 真彩色渐变
- 启动时资源列表可见性控制

![pi-cc-header 演示](assets/demo.gif)

## 命令

| 命令 | 说明 | 生效方式 |
| --- | --- | --- |
| `/hc c/a/r/o/y/g/w/b/p` | 设置 logo 颜色：c=clawd 螃蟹红 a=anthropic 品牌橙 r=red 红 o=orange 橙 y=yellow 黄 g=green 绿 w=white 白 b=blue 蓝 p=purple 紫 | 即时生效 |
| `/hv` | 切换版本号颜色模式 | 即时生效 |
| `/hi` | 开关 IBM 横线 | 即时生效 |
| `/hm` | 开关 Minecraft 风格 | 即时生效 |
| `/hrl` | 切换资源清单显示/隐藏 | 下一次会话生效 |
| `/hdf` | 恢复开发者默认配置 | 即时生效 |
| `/htg` | 启用 / 禁用 pi-cc-header | 下一次会话生效 |

### 启用禁用与重置

首次安装默认自动启用。使用`/htg`禁用 pi-cc-header 后，所有样式命令会被锁定无法使用（`/htg`除外），防止盲操配置。重新执行 `/htg` 即可恢复禁用前的配置。**更改将在下一次会话生效**。
使用`/hdf`可将用户配置恢复为开发者默认配置（Clawd 螃蟹红），更改即时生效。**此命令不会保存用户配置，重置后用户需重新进行配置**。

## 自动行为

- 每次启动强制 `quietStartup = true`
- 每次启动强制清屏

## 致谢

Logo 动画取自 [pi.dev/install.sh](https://pi.dev/install.sh)。
