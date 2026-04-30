# DIV2 Map Maker

A browser-based map-pin tool for **The Division 2**, set over a dark-themed real-world Washington DC map. Place, label, categorise, save, load, and share custom pins with no account or server required.

---

## Features

| Feature | Details |
|---|---|
| 🗺️ **Dark map** | CartoDB Dark Matter tiles styled to match The Division 2's aesthetic |
| 🏙️ **Zone labels** | 21 in-game named zones (White House, Capitol Hill, Georgetown, …) overlaid on the map |
| 📍 **Click-to-place pins** | Click anywhere on the map to open the Add Pin dialog (up to 100 pins per map) |
| 🏷️ **Pin labels** | Optional free-text label (max 50 characters) per pin |
| 🎨 **6 categories** | Loot 💰, Enemy ⚔️, Mission 🎯, Safe House 🏠, Landmark 🔎, Custom ⭐ — each colour-coded |
| 📋 **Pin list** | Sidebar/bottom panel lists all pins; click a row to fly the map to that pin |
| 🗑️ **Remove pins** | Delete individual pins from the popup or the pin list, or clear all at once |
| 💾 **Save** | Downloads the current map as a `.json` file |
| 📂 **Load** | Restores a previously saved `.json` file |
| 🔗 **Share** | Encodes the entire map (name + pins) into a shareable URL |
| 📱 **Mobile-first** | Responsive layout — collapsible bottom sheet on phones, fixed sidebar on desktop |

---

## Getting Started

The app is a **zero-build static site** (plain HTML, CSS, and JavaScript). No npm install or build step is needed.

### Run locally

```bash
# Clone the repository
git clone https://github.com/Serk4/div2-map-maker.git
cd div2-map-maker

# Serve with any static file server, e.g.:
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` (or whichever port your server uses) in your browser.

> Opening `index.html` directly via `file://` works for most features, but the Share URL and Clipboard API require an HTTP origin.

---

## How to Use

### Placing pins

1. Click (or tap) anywhere on the map.
2. The **Add Pin** dialog opens, showing the coordinates.
3. Optionally enter a label (e.g. *Named Drop*, *Stronghold Entrance*).
4. The active category is applied automatically — change it in the **Pin Category** panel first.
5. Click **Add Pin** (or press Enter) to confirm.

### Changing the active category

Open the control panel and select one of the six category buttons. The selected category is highlighted and will be applied to the next pin you place.

### Managing pins

- **Fly to a pin** — click its row in the Pin List.
- **Remove a single pin** — click the popup on the map and press *Remove Pin*, or click the `×` button in the Pin List.
- **Clear all pins** — click **🗑️ Clear All** and confirm the prompt.

### Saving and loading

- **Save** — click **💾 Save** to download a `.json` file to your device.
- **Load** — click **📂 Load** and pick a previously saved `.json` file. The current map is replaced.

The saved JSON format is human-readable:

```json
{
  "version": 1,
  "name": "My Division 2 Map",
  "savedAt": "2025-01-01T00:00:00.000Z",
  "pinCount": 2,
  "pins": [
    { "lat": 38.89764, "lng": -77.03653, "label": "Named Drop", "category": "loot" },
    { "lat": 38.90050, "lng": -77.02610, "label": "Stronghold", "category": "mission" }
  ]
}
```

### Sharing a map

1. Click **🔗 Share**.
2. The Share dialog shows a URL with your entire map encoded in the query string.
3. Click **Copy Link** and send it to anyone — opening the link restores your pins automatically.

> The URL limit is ~12 000 characters. Maps with many long labels may exceed this; use Save/Load in that case.

---

## Project Structure

```
div2-map-maker/
├── index.html          # App shell and markup
├── css/
│   └── style.css       # Mobile-first dark theme
├── js/
│   └── app.js          # All application logic (Leaflet map, pin CRUD, save/load/share)
└── web.config          # IIS / Azure Static Web Apps configuration
```

**Dependencies** (loaded from CDN, no local install needed):

| Library | Version | Purpose |
|---|---|---|
| [Leaflet](https://leafletjs.com/) | 1.9.4 | Interactive map rendering |
| [CartoDB Dark Matter](https://carto.com/basemaps/) | — | Dark tile layer |

---

## Deployment

### GitHub Pages (default)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that automatically deploys the site to GitHub Pages on every push to `main`.

Enable Pages in your repository settings:
1. Go to **Settings → Pages**.
2. Set the source to **GitHub Actions**.
3. Push to `main` — the workflow deploys the site automatically.

### Azure Web Apps (optional)

A second workflow (`.github/workflows/azure-deploy.yml`) is included for Azure deployment. It is disabled by default (`if: false`). To enable it:

1. Create an Azure Web App.
2. Add the following to your repository:
   - **Variable** `AZURE_WEBAPP_NAME` — the name of your Azure Web App.
   - **Secret** `AZURE_WEBAPP_PUBLISH_PROFILE` — the publish profile XML from the Azure portal.
3. Remove the `if: false` line from the workflow file.

### Any static host

Because the project has no build step, you can deploy it by simply copying the files to any web server or static hosting service (Netlify, Vercel, Cloudflare Pages, S3, etc.).

---

## Pin Categories

| Category | Colour | Suggested use |
|---|---|---|
| Loot 💰 | Yellow `#f1c40f` | Named drops, supply caches, exotic spawns |
| Enemy ⚔️ | Red `#e74c3c` | Named enemies, elite patrols, boss locations |
| Mission 🎯 | Blue `#3498db` | Main missions, side missions, projects |
| Safe House 🏠 | Green `#2ecc71` | Safe houses, control points, checkpoints |
| Landmark 🔎 | Purple `#9b59b6` | Landmarks, area entrances, POIs |
| Custom ⭐ | Orange `#e8a020` | Anything else |

---

## Browser Support

The app targets modern evergreen browsers. It uses standard APIs available in all current desktop and mobile browsers:

- `Fetch` / `FileReader` for file I/O
- `navigator.clipboard` (with `document.execCommand` fallback) for copying URLs
- `URL` / `URLSearchParams` for share link parsing
- CSS custom properties and `display: grid`

---

## License

This project is unofficial fan-made content and is not affiliated with or endorsed by Ubisoft. *Tom Clancy's The Division 2* is a trademark of Ubisoft Entertainment.
