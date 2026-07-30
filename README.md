# pi-cc-header

[中文](#中文)

Claude Code–style startup header for [Pi](https://pi.dev) — pixel-animated Pi logo with a 9-color palette, toggleable IBM stripes and Minecraft gradient themes, paired with a configurable info bar displaying version, model, resource stats, AGENTS.md marker, cwd, and a customizable slogan.

![pi-cc-header](https://raw.githubusercontent.com/eriiic7z/pi-cc-header/main/assets/screenshot.png)

## Install

```bash
pi install npm:pi-cc-header
```

Takes effect on your **next session (window, same below)** or **`/reload`**.

## Features

- 14-frame Pi logo animation
- Customizable slogan displayed in the header
- Adjustable animation speed (25/50/75/100 ms)
- Startup status bar: version, model, thinking level, skills (with pkg skills count), prompts, extensions (with uninstalled extension residue marker), cwd, and AGENTS.md state marker
- 9-color palette: Anthropic brand orange, Clawd crab red, and more
- Version number coloring
- IBM-style horizontal stripes
- Minecraft-style pixel theme and 4-level 24-bit true-color gradient

![pi-cc-header demo](https://raw.githubusercontent.com/eriiic7z/pi-cc-header/main/assets/demo.gif)

## Commands

| Command | Description | Takes effect |
| --- | --- | --- |
| `/hc c/a/r/o/y/g/w/b/p` | Set logo color: c=clawd a=anthropic r=red o=orange y=yellow g=green w=white b=blue p=purple | Immediate |
| `/hv` | Cycle version color: OFF → Pi only → Pi+ver | Immediate |
| `/hi` | Toggle IBM-style on/off | Immediate |
| `/hm` | Toggle Minecraft-style on/off | Immediate |
| `/hps` | Toggle pkg skills visibility (`6 skills` / `6/7 skills`) | Immediate |
| `/hdf` | Reset to developer defaults | Immediate |
| `/htg` | Enable / disable pi-cc-header | Next session |
| `/hs` <text> / `/hs` / `/hs -c` / `/hs -d` | Set / toggle / toggle color / delete slogan (max 85 chars) | Immediate |
| `/hsp` <ms> / `/hsp` | Set / show animation speed (25/50/75/100) | Immediate |

### Disabling and resetting

Use `/hdf` to reset all settings to developer defaults (Clawd crab red). Changes take effect immediately. **This does not save your current config** — you will need to reconfigure from scratch.

Disabling pi-cc-header with `/htg` locks all style commands (except `/htg` itself) to prevent blind configuration. Run `/htg` again to re-enable with your previous config — **changes take effect the next session**.

## Credits

Logo animation adapted from [pi.dev/install.sh](https://pi.dev/install.sh).

---

## 中文

Claude Code 风格的 [Pi](https://pi.dev) 启动头部 — 像素动画 Pi logo，九色调色板，可开关的 IBM 横线和 Minecraft 渐变主题，搭配可配置信息栏，展示版本信息、模型信息、资源统计、AGENTS.md 标记、路径信息，以及可定制标语。

![pi-cc-header](https://raw.githubusercontent.com/eriiic7z/pi-cc-header/main/assets/screenshot.png)

## 安装

```bash
pi install npm:pi-cc-header
```

安装后在 **下一次会话（窗口，下同）** 或 **`/reload`** 生效。

## 功能

- 14 帧 Pi logo 动画
- 可定制标语
- 动画速度可调（25/50/75/100 ms）
- 启动状态栏：版本、模型、思考级别、技能统计（含随包 skills 统计）、提示词模板统计、扩展统计（含已卸载扩展残留标记）、当前目录，以及 AGENTS.md 状态标记
- 九色调色板：Anthropic 品牌橙、Clawd 螃蟹红等
- 版本号颜色设定
- IBM 风格水平横线
- Minecraft 风格像素主题，4 级 24-bit 真彩色渐变

![pi-cc-header 演示](https://raw.githubusercontent.com/eriiic7z/pi-cc-header/main/assets/demo.gif)

## 命令

| 命令 | 说明 | 生效方式 |
| --- | --- | --- |
| `/hc c/a/r/o/y/g/w/b/p` | 设置 logo 颜色：c=clawd 螃蟹红 a=anthropic 品牌橙 r=red 红 o=orange 橙 y=yellow 黄 g=green 绿 w=white 白 b=blue 蓝 p=purple 紫 | 即时生效 |
| `/hv` | 切换版本号颜色模式 | 即时生效 |
| `/hi` | 开关 IBM 横线 | 即时生效 |
| `/hm` | 开关 Minecraft 风格 | 即时生效 |
| `/hps` | 切换随包 skills 可见性(`6 skills` / `6/7 skills`) | 即时生效 |
| `/hdf` | 恢复开发者默认配置 | 即时生效 |
| `/htg` | 启用 / 禁用 pi-cc-header | 下一次会话生效 |
| `/hs` <文字> / `/hs` / `/hs -c` / `/hs -d` | 设置 / 开关 / 切换颜色 / 删除标语（最长 85 字符） | 即时生效 |
| `/hsp` <ms> / `/hsp` | 设置 / 显示动画速度（25/50/75/100） | 即时生效 |

### 禁用与重置

使用`/hdf`可将用户配置恢复为开发者默认配置（Clawd 螃蟹红），更改即时生效，**此命令不会保存用户配置，重置后用户需重新进行配置**。
使用`/htg`禁用 pi-cc-header 后，所有样式命令会被锁定无法使用（`/htg`除外），防止盲操配置。重新执行 `/htg` 即可恢复禁用前的配置。**更改将在下一次会话生效**。

## 致谢

Logo 动画取自 [pi.dev/install.sh](https://pi.dev/install.sh)。
