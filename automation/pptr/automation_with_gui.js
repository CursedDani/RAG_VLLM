const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let automationProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'CA Service Desk Manager - Data Extraction Results',
        resizable: true,
        minimizable: true,
        maximizable: true,
        show: false // Don't show until ready
    });

    mainWindow.loadFile('gui.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Start the automation process after GUI is ready
        console.log('GUI window ready. Starting automation...');
        startAutomation();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        // Kill automation process if still running
        if (automationProcess && !automationProcess.killed) {
            automationProcess.kill();
        }
        app.quit();
    });
}

function startAutomation() {
    const { spawn } = require('child_process');

    // Run the automation script
    automationProcess = spawn('node', ['final_automation.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    let outputBuffer = '';

    automationProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Automation output:', output);

        // Try to parse JSON from the output
        outputBuffer += output;

        // Look for complete JSON objects in the output
        const lines = outputBuffer.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
                try {
                    const extractedData = JSON.parse(line);
                    if (extractedData.changeOrderData || extractedData.workflowTasks) {
                        // Send data to GUI
                        if (mainWindow) {
                            mainWindow.webContents.send('data-received', extractedData);
                        }
                        // Remove processed line from buffer
                        outputBuffer = lines.slice(i + 1).join('\n');
                        break;
                    }
                } catch (e) {
                    // Not valid JSON, continue
                }
            }
        }
    });

    automationProcess.stderr.on('data', (data) => {
        console.error('Automation error:', data.toString());
    });

    automationProcess.on('close', (code) => {
        console.log(`Automation process exited with code ${code}`);
        if (mainWindow) {
            if (code !== 0) {
                // Show error message in GUI
                mainWindow.webContents.send('automation-error', {
                    message: `Automation failed with exit code ${code}`
                });
            }
        }
    });

    automationProcess.on('error', (error) => {
        console.error('Failed to start automation:', error);
        if (mainWindow) {
            mainWindow.webContents.send('automation-error', {
                message: `Failed to start automation: ${error.message}`
            });
        }
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();
});

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

// Handle app termination
process.on('SIGINT', () => {
    if (automationProcess && !automationProcess.killed) {
        automationProcess.kill();
    }
    app.quit();
});

process.on('SIGTERM', () => {
    if (automationProcess && !automationProcess.killed) {
        automationProcess.kill();
    }
    app.quit();
});
