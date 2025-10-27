const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'CA Service Desk Manager - Data Extraction Results',
        icon: null, // You can add an icon path here if needed
        resizable: true,
        minimizable: true,
        maximizable: true
    });

    mainWindow.loadFile('gui.html');

    // Open DevTools in development (optional)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle data from the automation script
ipcMain.handle('display-data', (event, data) => {
    if (mainWindow) {
        mainWindow.webContents.send('data-received', data);
    }
});

// Function to display data in GUI (called from automation script)
function displayDataInGUI(extractedData) {
    return new Promise((resolve) => {
        if (mainWindow) {
            mainWindow.webContents.send('data-received', extractedData);
            resolve();
        } else {
            // If window is not ready, wait a bit and try again
            setTimeout(() => {
                if (mainWindow) {
                    mainWindow.webContents.send('data-received', extractedData);
                }
                resolve();
            }, 1000);
        }
    });
}

module.exports = { displayDataInGUI };
