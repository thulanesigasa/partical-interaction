# Particle Interaction App

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

## Credits & Inspiration

This project was heavily inspired by the interaction models developed in [Anton-Ding/partical-interaction](https://github.com/Anton-Ding/partical-interaction).
All credits for the original implementation goes to the respective author.
