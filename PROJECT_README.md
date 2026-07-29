# SPX Graphics Controller — Complete Project File Guide

> **Server:** `node server.js` → Open browser at `http://localhost:5656`
> **OBS Source:** Add Browser Source pointing to `http://localhost:5656/renderer`
> **Your Tournament Graphics:** `ASSETS/templates/tournament/ELIMINATION_BANNER.html`

---

## Project Structure Overview

```
SPX-GC-master/
├── server.js                        ← Main entry point — start here
├── config.json                      ← Your app settings & preferences
├── package.json                     ← Node.js dependency list
├── ecosystem.config.js              ← PM2 process manager config
│
├── ASSETS/                          ← All your graphic templates & media
│   ├── templates/
│   │   └── tournament/
│   │       └── ELIMINATION_BANNER.html  ← YOUR custom tournament template
│   ├── csv/                         ← CSV data files folder
│   ├── excel/                       ← Excel data files folder
│   ├── media/                       ← Images & videos used in graphics
│   ├── plugins/                     ← Extra UI buttons & controller plugins
│   └── ExtraFunctions/
│       └── demoFunctions.js         ← Custom JS functions for the controller
│
├── DATAROOT/                        ← All your projects & rundowns
│   └── MyFirstProject/
│       ├── profile.json             ← Project template library
│       └── data/
│           └── MyFirstRundown.json  ← Your rundown (the live cue list)
│
├── routes/                          ← Server page & API route handlers
│   ├── routes-application.js        ← Main app pages (controller, renderer)
│   ├── routes-api.js                ← Internal API (Excel reader, file ops)
│   ├── routes-api-v1.js             ← Public REST API for external control
│   ├── routes-casparcg.js           ← CasparCG broadcast server routes
│   └── routes-webplayer.js          ← Web-based playout route
│
├── utils/                           ← Server-side helper utilities
│   ├── spx_server_functions.js      ← Core server helper functions
│   ├── spx_getconf.js               ← Config file reader & generator
│   ├── spx_auth.js                  ← Login & authentication logic
│   ├── logger.js                    ← Winston logging setup
│   ├── playout_casparCG.js          ← CasparCG playout controller
│   ├── playout_webplayer.js         ← Web renderer playout controller
│   ├── sockets.js                   ← Socket.IO real-time event setup
│   ├── api-handlers.js              ← Shared API handler utilities
│   └── talk.vbs                     ← Windows text-to-speech helper
│
├── views/                           ← HTML page templates (Handlebars)
│   ├── view-controller.handlebars   ← Main control panel UI
│   ├── view-renderer.handlebars     ← Transparent overlay (used in OBS)
│   ├── view-home.handlebars         ← Homepage / project selector
│   └── ... (see details below)
│
├── static/                          ← CSS, fonts, images & JS for the UI
│   └── js/
│       ├── spx_gc.js                ← Main controller frontend logic
│       └── ... (see details below)
│
├── locales/                         ← Language translation files
│   ├── english.json                 ← English UI text (active)
│   └── ... (8 languages total)
│
├── LOG/                             ← Server log files (auto-generated)
├── package-lock.json                ← Exact dependency version lock file
├── .gitignore                       ← Files excluded from Git tracking
├── LICENSE.txt                      ← MIT License
├── README.md                        ← Original SPX project readme
├── RELEASE_NOTES.md                 ← Version changelog
├── CONTRIBUTING.md                  ← How to contribute
└── SECURITY.md                      ← Security policy
```

---

## Key Files Explained

### `server.js`
The **main entry point** of the application. Run this to start everything:
```bash
node server.js
```
- Starts the Express web server on port `5656`
- Reads `config.json` on startup
- Loads all routes, sets up Socket.IO (real-time communication), and serves all pages

---

### `config.json`
Your **main settings file**. Auto-generated on first run. Key settings:

| Setting | What it does |
|---|---|
| `port` | Server port (default: `5656`) |
| `dataroot` | Path to your projects folder (DATAROOT) |
| `hostname` | Display name for this SPX instance |
| `resolution` | Output resolution: `HD` (1920×1080) or `4K` |
| `langfile` | UI language (e.g. `english.json`) |
| `launchBrowser` | Auto-open browser on server start |
| `casparcg.servers` | Add CasparCG broadcast server connections here |
| `osc.enable` | Enable OSC protocol control (default: false) |

---

### `package.json`
Lists all **Node.js packages** the project depends on. Run `npm install` once to install them all into `node_modules/`.

---

### `ecosystem.config.js`
Configuration for **PM2** (a process manager). Lets you run SPX as a background service that auto-restarts. Used with `npm start`.

---

## ASSETS Folder

### `ASSETS/templates/tournament/ELIMINATION_BANNER.html`
**Your custom tournament template.** This is the elimination animation graphic that:
- Fetches live team data from your **Google Sheets CSV URL**
- Reads the matching team's `Status`, `Kills`, and `Position` columns
- Plays a red animated banner in OBS when you click PLAY in SPX
- Clears the banner when you click STOP

### `ASSETS/csv/`
Place `.csv` data files here for templates that read from CSV. SPX auto-generates example CSV files here when you click the CSV export button in the controller.

### `ASSETS/excel/`
Place `.xlsx` Excel files here for templates that read from spreadsheets.

### `ASSETS/media/`
Store images and video files here that are used inside your graphic templates.

### `ASSETS/plugins/`
Contains **extra controller UI plugins** — additional buttons or widgets that appear in the SPX control panel sidebar:
- `panicButton/` — One-click clear-all-graphics button
- `animateAllOut/` — Animate all visible graphics out at once
- `welcomeOverlay/` — Welcome message overlay plugin
- `spxLinks/` — Custom quick-link buttons

### `ASSETS/ExtraFunctions/demoFunctions.js`
Custom JavaScript functions that are loaded globally into the SPX controller. Extend this file to add your own custom controller behaviour.

---

## DATAROOT Folder

### `DATAROOT/MyFirstProject/profile.json`
The **project template library** — defines which graphic templates are available to add to a rundown inside this project. Each entry defines a template's default fields and settings.

### `DATAROOT/MyFirstProject/data/MyFirstRundown.json`
Your **live rundown cue list**. This is the list of graphic items the operator controls during a live show. Each item has its own template type and data values.

> [!WARNING]
> SPX overwrites this file automatically whenever you edit items in the controller UI. Do not edit it manually while SPX is running.

---

## Routes Folder

| File | What it handles |
|---|---|
| `routes-application.js` | All browser-facing pages: controller, home, renderer, settings |
| `routes-api.js` | Internal SPX operations: reading Excel/CSV, file management |
| `routes-api-v1.js` | **Public REST API** — control SPX externally via HTTP (e.g., from Stream Deck, Google Sheets Apps Script, etc.) |
| `routes-casparcg.js` | Connection management for CasparCG broadcast servers |
| `routes-webplayer.js` | Web-based playout endpoint |

---

## Utils Folder

| File | What it does |
|---|---|
| `spx_server_functions.js` | Core helper functions used across the server (file ops, path resolution, etc.) |
| `spx_getconf.js` | Reads `config.json` at startup, generates defaults if missing |
| `spx_auth.js` | Handles user login, session management, and API key authentication |
| `logger.js` | Sets up the Winston logger — writes logs to the `LOG/` folder |
| `playout_casparCG.js` | Sends play/stop/update commands to CasparCG broadcast servers |
| `playout_webplayer.js` | Sends play/stop/update commands to the web renderer via Socket.IO |
| `sockets.js` | Defines real-time Socket.IO events between server and browser |
| `api-handlers.js` | Shared helper functions for API route handlers |
| `talk.vbs` | Windows VBScript for text-to-speech audio cue announcements |

---

## Views Folder — UI Pages

| File | URL | Purpose |
|---|---|---|
| `view-home.handlebars` | `/` | Home page / project selector |
| `view-controller.handlebars` | `/controller` | **Main control panel** — play graphics here |
| `view-renderer.handlebars` | `/renderer` | **OBS Browser Source URL** — transparent graphic overlay |
| `view-shows.handlebars` | `/shows` | List of all projects |
| `view-showconfig.handlebars` | `/showconfig` | Edit project settings |
| `view-appconfig.handlebars` | `/appconfig` | Edit app settings (config.json editor) |
| `view-api-v1.handlebars` | `/api/v1` | REST API documentation page |
| `view-episodes.handlebars` | `/episodes` | List of rundowns within a project |
| `view-login.handlebars` | `/login` | Login screen |
| `view-admin.handlebars` | `/admin` | Admin panel |
| `view-controllermini.handlebars` | `/controllermini` | Compact control panel view |
| `view-rendererscalable.handlebars` | `/renderer/scalable` | Scalable resolution renderer |
| `view-fileBrowser.handlebars` | (popup) | File browser dialog for selecting assets |
| `view-authpolicy.handlebars` | `/authpolicy` | User auth policy settings |
| `view-registration.handlebars` | `/registration` | User registration page |
| `view-empty.handlebars` | — | Blank page placeholder |

---

## static/js — Frontend JavaScript

| File | What it does |
|---|---|
| `spx_gc.js` | **Main controller page logic** — all button actions, keyboard shortcuts, rundown management |
| `spx_showConfig.js` | Project/show settings page logic |
| `spx_fileBrowser.js` | File browser popup logic |
| `spx_dragdrop.js` | Handles drag & drop reordering of rundown items |
| `spx_controllerImportFunctions.js` | Imports templates into a rundown |
| `spx_rendererUtils.js` | Renderer page helper functions |
| `ograf_functions.js` | Handles EBU OGraf graphic format support |
| `anime.min.js` | Animation library used for UI transitions |
| `axios.min.js` | HTTP library for making API calls from the browser |
| `socket.io.js` | Real-time communication between browser and server |
| `bootstrap.bundle.min.js` | Bootstrap CSS/JS framework for the UI |
| `Sortable.min.js` | Enables sortable/draggable lists |
| `fontawesome.all.min.js` | Icon font library |
| `vanilla-js-tooltip.js` | Tooltip popup library |

---

## locales — Language Files

JSON files containing all UI text strings. Change the active language by editing `config.json`:
```json
"langfile": "english.json"
```

| File | Language |
|---|---|
| `english.json` | English (**currently active**) |
| `finnish.json` | Finnish |
| `german.json` | German |
| `dutch.json` | Dutch |
| `swedish.json` | Swedish |
| `portuguese.json` | Portuguese |
| `japanese.json` | Japanese |
| `simplifiedChinese.json` | Chinese (Simplified) |

---

## LOG Folder

Server log files are automatically written here. The `.gitignore` file inside ensures log files are never committed to Git. Log level is controlled in `config.json`:
```json
"loglevel": "info"
```
Options: `info` (normal), `verbose` (detailed), `debug` (maximum detail).

---

## Quick Reference

| Task | How |
|---|---|
| **Start the server** | `node server.js` in terminal |
| **Open the control panel** | Browser → `http://localhost:5656` |
| **Connect to OBS** | OBS Browser Source → `http://localhost:5656/renderer` |
| **Eliminate a team** | SPX Controller → change Team Name → click PLAY |
| **Update team data** | Edit your Google Sheet — SPX fetches live on each PLAY |
| **Change server port** | Edit `config.json` → `port` value |
| **Add a new project** | SPX UI → Projects → Add New Project |
| **Control SPX via API** | HTTP requests to `http://localhost:5656/api/v1/` |
| **View API docs** | Browser → `http://localhost:5656/api/v1` |
| **Check server logs** | Look in the `LOG/` folder |
