const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');

const favoritesFilePath = path.join(app.getPath('userData'), 'favorites.json');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'renderer.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile('index.html');
}

// Handler to add a favorite country
ipcMain.handle('add-favorite', async (event, country) => {
    let favorites = [];
    try {
        favorites = await fs.readJson(favoritesFilePath);
    } catch (error) {
        // File might not exist yet; start with an empty array
    }

    if (!favorites.includes(country)) {
        favorites.push(country);
        await fs.writeJson(favoritesFilePath, favorites);
    }
    return favorites; // Return updated list of favorites
});

// Handler to get all favorite countries
ipcMain.handle('get-favorites', async () => {
    try {
        const favorites = await fs.readJson(favoritesFilePath);
        return favorites || [];
    } catch {
        return [];
    }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

