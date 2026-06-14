# CYD Config Generator

A web-based tool for generating ESPHome YAML configurations for CYD (Cheap Yellow Display - ESP32-2432S028R) devices.

**Live: https://cropse.github.io/Yellow-CYD-party/**

![CYD Config Generator](https://img.shields.io/badge/Platform-GitHub%20Pages-blue)
![ESPHome](https://img.shields.io/badge/ESPHome-2024.6%2B-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Visual Button Grid**: 4x3 grid preview with live updates
- **Button Configuration**:
  - Stateless buttons (single action)
  - Checkable buttons (sync with Home Assistant entity state)
  - Dual actions (short press + long press)
- **Icon Picker**: Searchable Material Design Icons (7000+ icons)
- **Color Picker**: Native color picker + preset swatches
- **Home Assistant Actions**:
  - Script calls
  - Switch control (toggle, turn_on, turn_off)
  - Cover control (open, close, set position)
  - Media player control
  - Automation triggers
- **Presets**: Pre-configured templates (Living Room, Bedroom)
- **YAML Import/Export**: Save, edit, and reload ESPHome YAML configurations
- **YAML Output**: Copy or download generated configuration
- **Dark/Light Theme**: Toggle between themes
- **Offline Support**: Works offline after initial load (icon search requires internet)

## Supported Boards

The generator supports the following boards:

| Board | Resolution | RGB LED |
|---|---|---|
| ESP32-2432S028-2port (default) | 320×240 | ✅ |
| ESP32-E32R28T | 320×240 | ❌ |
| ESP32-3248S035C | 480×320 | ✅ |
| ESP32-E32R35T | 480×320 | ✅ |
| ESP32-E32R40T | 480×320 | ✅ |
| Guition JC4827543C | 480×272 | ❌ |

Use the board selector to choose the target hardware before generating YAML. The default board is ESP32-2432S028-2port.

Note: The Guition JC4827543C uses ESP32-S3 with ESP-IDF framework, QSPI display, and GT911 touch controller. Boards without an RGB LED (ESP32-E32R28T, Guition JC4827543C) hide the RGB LED controls and omit related configuration from the generated YAML.

## Usage

### Quick Start

1. Open the web app
2. Click on a button in the grid to edit it
3. Configure:
   - **Type**: Stateless or Checkable
   - **Label**: Button text
   - **Icon**: Click to open icon picker
   - **Color**: Use color picker or swatches
   - **Position**: Grid column and row
   - **Actions**: Short press and optional long press
4. Download the generated YAML file
5. Copy to your ESPHome folder and compile

### Button Types

#### Stateless Button
A simple button that triggers a Home Assistant action when pressed.

#### Checkable Button
A button that syncs its state with a Home Assistant entity:
- Shows different icons for ON/OFF states
- Visual indication of current state
- Requires entity ID and state icons

### Home Assistant Actions

| Action Type | Description | Fields |
|-------------|-------------|--------|
| Script | Call a Home Assistant script | Script ID |
| Switch | Control a switch entity | Entity ID, Operation (toggle/turn_on/turn_off) |
| Cover | Control a cover/blinds | Entity ID, Operation, Position (for set_cover_position) |
| Media Player | Control media playback | Entity ID, Operation (play_pause/next_track/stop) |
| Automation | Trigger an automation | Automation ID |

### Presets

- **Empty**: Blank configuration
- **Living Room**: Example living room setup with lights, media, curtains
- **Bedroom**: Example bedroom setup with lights, fan, TV

### Keyboard Shortcuts

- `Ctrl+S`: Download YAML file
- `Ctrl+D`: Download YAML file
- `Esc`: Close icon picker modal

## Deployment

### GitHub Pages

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Select source: "Deploy from a branch"
4. Select branch: `main` (or your preferred branch)
5. Select folder: `/ (root)`
6. Save and wait for deployment

The app is live at **https://cropse.github.io/Yellow-CYD-party/**

### Local Usage

Simply open `index.html` in a web browser. No server required.

## Generated YAML Structure

The generated YAML follows the ESPHome configuration format:

```yaml
substitutions:
  device_name: my-cyd
  nice_name: My CYD

esp32:
  board: esp32dev
  framework:
    type: arduino

# ... hardware config (display, touchscreen, SPI, etc.)

font:
  # Roboto fonts + Material Design Icons

color:
  # Per-button color definitions

binary_sensor:
  # Button press handlers with HA actions

packages:
  # State sync for checkable buttons

lvgl:
  # Button widgets in 4x3 grid
```

## Requirements

### ESPHome

- ESPHome 2024.6.0 or later (for LVGL support)
- `fonts/Arimo-Regular.ttf`
- `fonts/materialdesignicons-webfont.ttf`

### Home Assistant

- API encryption key configured
- Entities/scripts/automations as configured in buttons

## File Structure

```
Yellow-CYD-party/
├── index.html          # Web app (single file)
├── README.md           # This documentation
├── esphome/            # ESPHome configurations
│   ├── back-garden-cyd.yaml
│   ├── living-room-cyd.yaml
│   ├── templates/      # Reusable templates
│   ├── fonts/          # Font files
│   └── devices/        # Device definitions
└── back-garden-cyd.yaml
```

## Technical Details

### Technologies Used

- **HTML5**: Semantic structure
- **CSS3**: Mobile-first responsive design, CSS variables, flexbox/grid
- **JavaScript (ES6+)**: Vanilla JS, no dependencies
- **Material Design Icons**: CDN integration with caching

### Data Storage

- Configuration saved to `localStorage`
- MDI icon data cached in `localStorage` (7-day TTL)
- No server-side storage

### Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (with some limitations)
- Mobile browsers

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use and modify.

## Credits

This project is inspired by and builds upon:

- **[ESP32-CYD-ESPHome](https://github.com/makeitworktech/ESP32-CYD-ESPHome/)** by [makeitworktech](https://github.com/makeitworktech) - Original ESPHome YAML configurations for CYD devices that served as the foundation for this generator
- **[ESP32-Cheap-Yellow-Display](https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display)** by [witnessmenow](https://github.com/witnessmenow) - Hardware reference and CYD community resources

Additional resources:

- [ESPHome](https://esphome.io/) - ESP32 firmware framework
- [LVGL](https://lvgl.io/) - Light and Versatile Graphics Library
- [Material Design Icons](https://pictogrammers.com/library/mdi/) by [Pictogrammers](https://pictogrammers.com/) - Icon library