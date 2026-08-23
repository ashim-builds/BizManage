# 🖥️ BizManage Offline Desktop Application Setup Guide (.exe / .dmg / .AppImage)

BizManage is engineered with **Full PWA Offline Support** and **Local Storage Queue Architecture**, enabling it to run as a **100% Standalone Offline Desktop Application** for Windows, macOS, and Linux.

---

## ⚡ How Offline Mode Works in BizManage Desktop

1. **Local Offline Counter Billing**:
   * Cashiers can open the POS counter (`/transactions/pos`) and issue sales receipts even when internet/Wi-Fi is completely turned off.
   * Offline sales are tagged as `OFFLINE-XXXXXX` and stored safely in local encrypted storage.

2. **Automatic Background Sync**:
   * As soon as internet connectivity is restored, the live status indicator switches from **`⚡ Offline (Pending)`** to **`🌐 Syncing`**, automatically pushing queued transactions to the cloud database.

3. **Thermal Receipt Printing Offline**:
   * Hardware thermal bill printing (80mm & 58mm) works 100% offline via local USB / ESC-POS printer connections.

---

## 🛠️ Packaging BizManage as a Windows Native `.exe` Desktop App (Tauri Framework)

### Prerequisites:
* **Node.js**: v18 or later
* **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
* **C++ Build Tools**: Visual Studio C++ Build Tools (for Windows `.exe` installer compilation)

---

### Step 1: Install Tauri CLI
Run the following command in your terminal:
```bash
pnpm add -D @tauri-apps/cli
```

### Step 2: Initialize Tauri Desktop Application Wrapper
Run:
```bash
npx tauri init
```

Answer the prompts as follows:
* **App Name**: `BizManage Desktop`
* **Window Title**: `BizManage ERP & POS Counter`
* **Web assets location**: `../apps/web/out`
* **Dev Server URL**: `http://localhost:3000`

---

### Step 3: Configure `src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "pnpm --filter web dev",
    "beforeBuildCommand": "pnpm --filter web build && pnpm --filter web export",
    "devPath": "http://localhost:3000",
    "distDir": "../apps/web/out"
  },
  "package": {
    "productName": "BizManage Desktop",
    "version": "2.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": true
    },
    "bundle": {
      "active": true,
      "category": "Business",
      "copyright": "2026 BizManage ERP",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.bizmanage.desktop",
      "targets": ["msi", "nsis"]
    },
    "windows": [
      {
        "title": "BizManage ERP & POS Billing Counter",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

---

### Step 4: Build Windows Installer Executable (`BizManage-Setup.exe`)

Run the build command:
```bash
npx tauri build
```

Your standalone installer executable will be generated at:
```
src-tauri/target/release/bundle/nsis/BizManage_2.0.0_x64-setup.exe
```

---

## 💻 Alternative: Running as Installed Desktop PWA (Zero Installation)

1. Open **Chrome**, **Edge**, or **Brave** browser.
2. Navigate to your deployed BizManage web app URL (e.g. `https://bizmanage.app`).
3. Click the **Install Icon** (`🖥️`) in the browser address bar or menu.
4. Click **"Install BizManage App"**.
5. BizManage is now placed on your **Windows Desktop** / **Start Menu** as a native app icon that launches in its own window and works 100% offline!
