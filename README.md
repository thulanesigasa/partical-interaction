# Partical

## English

An interactive visual project built with `Three.js + TensorFlow.js + MediaPipe` (entry file: `index.html`).

### Features

- Particle shape switching and glow effects
- Camera-based gesture interaction
- Dynamic Emotion Orb visualization
- Fullscreen mode and basic control panel

### Quick Start

1. Clone the repository:

    ```bash
    git clone https://github.com/Anton-Ding/partical-interaction.git
    cd partical-interaction
    ```

2. Run a local web server (required for ES Modules to load correctly without CORS errors):
    ```bash
    python -m http.server
    ```

3. Open your browser and navigate to `http://localhost:8000/`.

4. On first run, allow camera permissions and ensure CDN resources are reachable.

### Usage

- Rendering and gesture detection initialize automatically after page load.
- Use top and bottom controls to switch particle shapes and colors.
- Active gesture mode is displayed in the top-left area.

### License (Important)

This project is released under a non-commercial license.

- ✅ Allowed: personal learning, research, non-commercial sharing, and modification
- ❌ Prohibited: any commercial use (including selling, paid integration, or profit-driven scenarios)

See [LICENSE](./LICENSE) for full terms.

### Commercial License & Contact

For commercial use, please contact the author to obtain written permission first.

- Contact details: [CONTACT.md](./CONTACT.md)

## 中文

一个基于 `Three.js + TensorFlow.js + MediaPipe` 的交互式视觉项目（入口文件：`index.html`）。

### 功能简介

- 粒子形态切换与发光效果
- 摄像头手势识别交互
- 情感球体（Emotion Orb）动态表现
- 全屏与基础控制面板

### 快速开始

1. 克隆仓库：

    ```bash
    git clone https://github.com/Anton-Ding/partical-interaction.git
    cd partical-interaction
    ```

2. 启动本地 Web 服务器 (必需的，以便加载外部 ES Modules，避免跨域错误)：
    ```bash
    python -m http.server
    ```

3. 打开浏览器并访问 `http://localhost:8000/`.

4. 首次运行请允许浏览器摄像头权限，并确保网络可访问 CDN 资源。

### 使用说明

- 页面加载后会自动初始化渲染与手势识别。
- 顶部和底部控制区可切换粒子形态与颜色。
- 手势模式会在界面左上区域提示。

### 许可协议（重要）

本项目采用非商业用途许可协议。

- ✅ 允许：个人学习、研究、非商业分享与修改
- ❌ 禁止：任何商业用途（含售卖、商用集成、盈利场景）

详细条款见 [LICENSE](./LICENSE)。

### 商业授权与联系

如需商业使用，请先联系作者获取书面授权。

- 联系方式见 [CONTACT.md](./CONTACT.md)
