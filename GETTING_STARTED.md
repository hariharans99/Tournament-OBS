# 🚀 Getting Started — Tournament OBS / SPX Graphics Controller

A step-by-step guide to get your live esports overlay up and running.

---

## ✅ Prerequisites

Before you begin, make sure you have the following installed on your computer:

| Requirement | Version | Download |
|---|---|---|
| **Node.js** | v16 or newer | https://nodejs.org |
| **OBS Studio** | Latest | https://obsproject.com |
| A **Google Sheet** | — | https://sheets.google.com |

> **Tip:** To check if Node.js is already installed, open a terminal and run:
> ```
> node --version
> ```

---

## 📦 Step 1 — Install Dependencies

Open a terminal (Command Prompt or PowerShell) in the project folder and run:

```bash
npm install
```

This downloads all required packages into the `node_modules/` folder. You only need to do this **once**.

---

## ▶️ Step 2 — Start the Server

In the same terminal, run:

```bash
node server.js
```

You should see output confirming the server is running. **Keep this terminal open** while using the program.

> **Note:** The server runs on **port 5656** by default (configured in `config.json`).

---

## 🖥️ Step 3 — Open the Control Panel

Once the server is running, open your browser and go to:

```
http://localhost:5656
```

This is the **SPX Graphics Controller** — your dashboard for controlling all overlays.

---

## 🎮 Step 4 — Connect Your Google Sheet

To sync live tournament data from Google Sheets to your overlays:

1. **Share your Google Sheet publicly**:
   - Open your Google Sheet in the browser.
   - Click **Share** (top-right).
   - Under *General access*, select **"Anyone with the link"** → **Viewer**.

2. **Copy the full browser URL** from your address bar (it looks like):
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit?gid=...
   ```

3. **Configure SPX**:
   - In the Control Panel, open the **Tournament** rundown.
   - Click **Tournament Live Scoreboard**.
   - Paste your Google Sheet URL into the **Google Sheet CSV URL** field.
   - Click **PLAY**.

> ⚠️ **Important:** The sheet must be set to **"Anyone with the link can view"** — otherwise SPX cannot read the data.

---

## 📡 Step 5 — Add the Overlay to OBS

1. In OBS, add a new **Browser Source**.
2. Set the URL to:
   ```
   http://localhost:5656/renderer/scalable
   ```
3. Set **Width** to `1920` and **Height** to `1080`.
4. Check **"Refresh browser when scene becomes active"** (optional but recommended).

Your overlay is now live and will update automatically as you control it from the SPX dashboard.

---

## 🔄 Alternative Start Methods

| Method | Command | Use Case |
|---|---|---|
| **Simple start** | `node server.js` | Standard use |
| **Dev mode (auto-restart)** | `npm run dev` | Development / editing files |
| **PM2 (background service)** | `npm start` | Keep running after terminal closes |

> **Note:** PM2 must be installed globally first: `npm install -g pm2`

---

## 📁 Key Files & Folders

| Path | Description |
|---|---|
| `server.js` | Main server entry point |
| `config.json` | Port, paths, and app settings |
| `package.json` | Project dependencies |
| `ASSETS/templates/tournament/` | Overlay HTML templates |
| `DATAROOT/MyFirstProject/` | Rundown data and project config |
| `LOG/` | Server log files |

---

## 🛠️ Troubleshooting

### ❌ `node` is not recognized
Node.js is not installed. Download it from https://nodejs.org and restart your terminal after installing.

### ❌ Port already in use (EADDRINUSE)
Another program is using port 5656. Either:
- Stop the other program, **or**
- Change the port in `config.json` under `"port"`.

### ❌ Overlay not updating from Google Sheets
- Make sure the Google Sheet is shared publicly (see Step 4).
- Make sure you pasted the full **browser address bar URL**, not the share link.
- Check that you clicked **PLAY** on the scoreboard item in SPX.

### ❌ `npm install` fails
- Make sure you're running the command inside the project folder.
- Try running as Administrator (right-click → *Run as Administrator*).

---

## 🔗 Useful Links

- **SPX Graphics Official Site**: https://spxgraphics.com
- **Full Project README**: `README.md`
- **Release Notes**: `RELEASE_NOTES.md`
- **Contributing Guide**: `CONTRIBUTING.md`
