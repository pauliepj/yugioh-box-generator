const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { generateBox, exportYDK } = require("./generateBox");

function createWindow() {
  const win = new BrowserWindow({
    width: 450,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // so ipcRenderer works
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

// Find Downloads folder
function getDownloadsFolder() {
  return path.join(os.homedir(), "Downloads");
}

// Handle box generation
ipcMain.handle("generate-box", async (event, setName) => {
  try {
    const box = generateBox(setName); // returns { setName, cards }
    const ydk = exportYDK(box);

    const downloadsPath = getDownloadsFolder();
    if (!fs.existsSync(downloadsPath))
      fs.mkdirSync(downloadsPath, { recursive: true });

    const fileName = `box_${setName}.ydk`;
    const filePath = path.join(downloadsPath, fileName);

    fs.writeFileSync(filePath, ydk);

    // Return both the box name and full path to renderer
    return { success: true, boxName: box.setName, filePath };
  } catch (err) {
    console.error("Error generating box:", err);
    return { success: false, error: err.message };
  }
});

// Open the folder in file explorer
ipcMain.handle("open-folder", async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
