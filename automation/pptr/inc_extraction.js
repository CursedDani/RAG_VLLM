import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class IncidentExtraction {
    constructor() {
        this.browser = null;
        this.page = null;
        this.targetFrame = null;
        this.popupPage = null;
        this.baseUrl = 'http://10.100.85.31/CAisd/pdmweb1.exe';
    }

    async init() {
        // Ensure images directory exists
        const imagesDir = 'images';
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--window-size=1920,1080'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.authenticate({
            username: 'rinforma',
            password: 'ChatBot2025/*-+'
        });
        await this.page.setViewport({ width: 1920, height: 1080 });

        // Set up error handling
        this.page.on('error', (error) => {
            console.error('Page error:', error.message);
        });

        this.page.on('pageerror', (error) => {
            console.error('Page error:', error.message);
        });
    }

    async navigateToApplication() {
        console.log('Navigating to CA Service Desk Manager...');

        // Test internal network connection
        try {
            const response = await this.page.goto('http://10.100.85.31', { timeout: 15000 });
        } catch (e) {
            // Continue if test fails
        }

        const response = await this.page.goto(this.baseUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log(`Navigation response: ${response.status()} ${response.statusText()}`);

        if (response.status() !== 200) {
            throw new Error(`Failed to load application: HTTP ${response.status()}`);
        }

        // Wait for frames to load using a more reliable method
        console.log('Waiting for frames to load...');
        await this.waitForFramesToLoad();

        return response;
    }

    async waitForFramesToLoad() {
        // Wait for the frameset to be ready
        await this.page.waitForFunction(() => {
            return document.readyState === 'complete' &&
                window.frames &&
                window.frames.length > 0;
        }, { timeout: 60000 });

        // Additional wait for frame content to load
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const frames = this.page.frames();
            if (frames.length > 1) {
                // Try to access content of frames to ensure they're loaded
                let framesLoaded = 0;
                for (const frame of frames) {
                    try {
                        await frame.evaluate(() => document.readyState);
                        framesLoaded++;
                    } catch (e) {
                        // Frame not ready
                    }
                }

                if (framesLoaded >= frames.length - 1) { // Allow for one frame to potentially fail
                    console.log(`${framesLoaded} frames loaded successfully`);
                    break;
                }
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async findTargetFrame() {
        console.log('Searching for target frame...');

        const frames = this.page.frames();
        const frame = frames[1];
        this.targetFrame = frame;
        return frame;
    }

    async waitForFormReady() {
        console.log('Waiting for Incident form to be ready...');

        if (!this.targetFrame) {
            throw new Error('Target frame not set');
        }

        // Try to wait for new UI elements first
        try {
            await this.targetFrame.waitForSelector('#ticket_type', {
                timeout: 15000,
                visible: true
            });

            await this.targetFrame.waitForSelector('input[name="searchKey"]', {
                timeout: 15000,
                visible: true
            });

            console.log('New UI elements are ready');

            // Wait for form to be fully loaded
            await this.targetFrame.waitForFunction(() => {
                const selector = document.querySelector('#ticket_type');
                const input = document.querySelector('input[name="searchKey"]');
                return selector && input && document.readyState === 'complete';
            }, { timeout: 15000 });

            console.log('New form is fully ready');
            return;

        } catch (e) {
            console.log('New UI elements not found');
        }
    }

    async selectIncidentType() {
        console.log('Selecting Incident from ticket type dropdown...');

        if (!this.targetFrame) {
            throw new Error('Target frame not set');
        }

        // Check if the new UI selector exists
        const selector = await this.targetFrame.$('#ticket_type');

        // Select "Incident" option (value="go_in")
        await this.targetFrame.select('#ticket_type', 'go_in');

        console.log('Incident selected from dropdown');

        // Verify the selection
        const selectedValue = await this.targetFrame.evaluate(() => {
            const select = document.querySelector('#ticket_type');
            return select ? select.value : null;
        });

        console.log(`Verified selected value: ${selectedValue}`);

        if (selectedValue !== 'go_in') {
            throw new Error(`Selection failed: expected go_in, got ${selectedValue}`);
        }

        return true;
    }

    async enterIncidentNumber(incidentNumber) {
        if (!incidentNumber || incidentNumber.trim() === '') {
            throw new Error('Incident Number is required');
        }

        console.log(`Entering Incident: ${incidentNumber}`);

        // Try new UI input field first
        let inputField = await this.targetFrame.$('input[name="searchKey"]');

        let inputSelector = 'input[name="searchKey"]';
        if (!inputField) {
            throw new Error('Incident input field not found');
        }

        console.log(`Using input field selector: ${inputSelector}`);

        // Clear and fill the input field
        await inputField.click({ clickCount: 3 }); // Triple click to select all
        await inputField.type(incidentNumber);

        console.log(`Successfully entered Incident Number: ${incidentNumber}`);

        // Verify the value was entered correctly
        const enteredValue = await this.targetFrame.evaluate((selector) => {
            const input = document.querySelector(selector);
            return input ? input.value : null;
        }, inputSelector);

        console.log(`Verified entered value: ${enteredValue}`);

        if (enteredValue !== incidentNumber) {
            throw new Error(`Value mismatch: expected ${incidentNumber}, got ${enteredValue}`);
        }

        return true;
    }

    async clickGoButton() {
        console.log('Looking for Go button...');

        let goButton = null;

        if (!goButton) {
            // Try to find by text content or specific attributes
            goButton = await this.targetFrame.evaluateHandle(() => {
                // Look for the specific new UI button
                const newButton = document.querySelector('a#imgBtn0');
                if (newButton) return newButton;

                // Look for buttons with "Go" text
                const links = Array.from(document.querySelectorAll('a'));
                const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
                const elements = [...links, ...buttons];

                return elements.find(el =>
                    el.textContent?.includes('Go') ||
                    el.title?.includes('Go') ||
                    el.value?.includes('Go') ||
                    (el.onclick && el.onclick.toString().includes('ImgBtnExecute'))
                ) || null;
            });
        }

        if (!goButton) {
            throw new Error('Go button not found');
        }

        console.log('Clicking Go button...');

        // Set up popup window listener before clicking
        const popupPromise = new Promise((resolve) => {
            this.page.once('popup', resolve);
        });

        await goButton.click();

        // Wait for either popup or navigation
        const result = await Promise.race([
            popupPromise.then(popup => ({ type: 'popup', popup })),
            this.page.waitForNavigation({ timeout: 10000 }).then(() => ({ type: 'navigation' })).catch(() => null),
            new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 5000))
        ]);

        if (result && result.type === 'popup') {
            console.log('Popup window detected');
            this.popupPage = result.popup;

            try {
                await this.popupPage.waitForFunction(() => document.readyState !== 'loading', { timeout: 10000 }).catch(() => { });
                console.log('Popup page loaded successfully');
            } catch (e) {
                console.log('Popup loading warning:', e.message);
                // Continue anyway as the popup might still be usable
            }
        }

        console.log('Go button clicked successfully');
        return true;
    }

    async waitForPopupAndExtractData() {
        console.log('Waiting for popup window to load...');

        if (!this.popupPage) {
            throw new Error('Popup page not available');
        }

        // First, let's see what we have in the popup and find the right frame
        console.log('Debugging popup content...');
        await this.debugPopupContent();

        // Try multiple approaches to wait for content
        let tableFound = false;
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`Attempt ${attempt}: Looking for detail table...`);

                // Wait for the detail table to be present with shorter timeout
                await this.popupPage.waitForSelector('#dtltbl0', { timeout: 5000 });
                console.log('Detail table found in popup');
                tableFound = true;
                break;
            } catch (e) {
                console.log(`Attempt ${attempt} failed: ${e.message}`);

                if (attempt < maxAttempts) {
                    console.log('Waiting 2 seconds before retry...');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Check if popup is still alive
                    try {
                        await this.popupPage.evaluate(() => document.title);
                    } catch (popupError) {
                        throw new Error('Popup window closed unexpectedly');
                    }
                }
            }
        }

        // Extract data from the table
        const tableData = await this.popupPage.evaluate(() => {
            // Try primary table first
            let table = document.querySelector('#dtltbl0');

            // If not found, try any table with class "detailro"
            if (!table) {
                table = document.querySelector('table.detailro');
            }

            // If still not found, try any table
            if (!table) {
                table = document.querySelector('table');
            }

            if (!table) return null;

            const data = {};

            // Get all rows
            const rows = table.querySelectorAll('tr');
            console.log(`Found ${rows.length} rows in table`);

            // Process rows in pairs (header row + data row)
            for (let i = 0; i < rows.length; i += 2) {
                const headerRow = rows[i];
                const dataRow = rows[i + 1];

                if (!headerRow || !dataRow) continue;

                // Get header cells and data cells
                const headers = headerRow.querySelectorAll('th');
                const dataCells = dataRow.querySelectorAll('td');

                // Map headers to data
                for (let j = 0; j < headers.length && j < dataCells.length; j++) {
                    const headerText = headers[j].textContent.trim().replace(/&nbsp;/g, '').replace(/\s+/g, ' ');
                    const dataCell = dataCells[j];

                    let dataText = '';

                    // Check if the cell contains a link with span
                    const linkSpan = dataCell.querySelector('a span.lookup1em');
                    if (linkSpan) {
                        dataText = linkSpan.textContent.trim();
                    } else {
                        // Get text content, handling &nbsp; and multiple spaces
                        dataText = dataCell.textContent.trim().replace(/&nbsp;/g, '').replace(/\s+/g, ' ');
                    }

                    // Clean up header text by removing labels and extra characters
                    let cleanHeader = headerText.replace(/&nbsp;/g, '').trim();

                    // Map the specific fields we need for incidents
                    if (cleanHeader.includes('Requester') || cleanHeader.includes('Customer') || cleanHeader.includes('Reporter')) {
                        data.requester = dataText;
                    } else if (cleanHeader.includes('Affected End User') || cleanHeader.includes('End User')) {
                        data.affected_end_user = dataText;
                    } else if (cleanHeader.includes('Category')) {
                        data.category = dataText;
                    } else if (cleanHeader.includes('Status')) {
                        data.status = dataText;
                    } else if (cleanHeader.includes('Priority')) {
                        data.priority = dataText;
                    } else if (cleanHeader.includes('Severity')) {
                        data.severity = dataText;
                    } else if (cleanHeader.includes('Type') && !cleanHeader.includes('Incident Type')) {
                        data.type = dataText;
                    } else if (cleanHeader.includes('Incident Type')) {
                        data.incident_type = dataText;
                    } else if (cleanHeader.includes('Summary') || cleanHeader.includes('Subject')) {
                        data.summary = dataText;
                    } else if (cleanHeader.includes('Active') || cleanHeader.includes('active')) {
                        data.active = dataText;
                    } else if (cleanHeader.includes('Assignee') || cleanHeader.includes('Assigned To')) {
                        data.assignee = dataText;
                    } else if (cleanHeader.includes('Group') || cleanHeader.includes('Assignment Group')) {
                        data.assignment_group = dataText;
                    }
                }
            }

            return data;
        });

        // Also try to get Incident Description if it exists (might be in a different part of the page)
        try {
            const incidentDescription = await this.popupPage.evaluate(() => {
                // Look for common selectors for incident description
                const descSelectors = [
                    'textarea[name*="description"]',
                    'textarea[id*="description"]',
                    'td[pdmqa="description"]',
                    'span[pdmqa="description"]',
                    'textarea[name*="Description"]',
                    'textarea[id*="Description"]',
                    'input[name*="description"]',
                    'input[id*="description"]'
                ];

                for (const selector of descSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent || element.value || '';
                    }
                }

                // Also look in table cells for description
                const cells = document.querySelectorAll('td, th');
                for (const cell of cells) {
                    const cellText = cell.textContent.toLowerCase();
                    if (cellText.includes('description') || cellText.includes('descripción')) {
                        // Find the next cell or related content
                        const nextCell = cell.nextElementSibling;
                        if (nextCell) {
                            return nextCell.textContent.trim();
                        }
                    }
                }

                return null;
            });

            if (incidentDescription && incidentDescription.trim()) {
                tableData.incident_description = incidentDescription.trim();
            }
        } catch (e) {
            console.log('Could not extract incident description:', e.message);
        }

        // Ensure we only return the fields we need for incidents
        const filteredData = {
            requester: tableData.requester || '',
            affected_end_user: tableData.affected_end_user || '',
            category: tableData.category || '',
            status: tableData.status || '',
            priority: tableData.priority || '',
            severity: tableData.severity || '',
            type: tableData.type || '',
            incident_type: tableData.incident_type || '',
            summary: tableData.summary || '',
            incident_description: tableData.incident_description || '',
            active: tableData.active || '',
            assignee: tableData.assignee || '',
            assignment_group: tableData.assignment_group || ''
        };

        return {
            incidentData: filteredData
        };
    }

    async debugPopupContent() {
        // Check for frames in the popup
        const frames = this.popupPage.frames();
        this.popupPage = frames[4];
        return;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Browser closed');
        }
    }

    // Method to keep browser open for manual inspection
    async keepOpen() {
        console.log('Browser will remain open for manual inspection...');
        console.log('Press Ctrl+C to close the browser and exit.');

        // Keep the script running
        return new Promise(() => { });
    }
}

// Main execution
(async () => {
    const automation = new IncidentExtraction();

    try {
        // Initialize browser and page
        await automation.init();

        // Navigate to the application
        console.log('🚀 Starting Incident extraction...');
        await automation.navigateToApplication();

        // Find the target frame containing the form
        await automation.findTargetFrame();

        // Wait for form to be ready
        await automation.waitForFormReady();

        // Select Incident from the ticket type dropdown
        await automation.selectIncidentType();

        // Enter the specific incident number
        const incidentNumber = "12345678"; // Replace with actual incident number
        await automation.enterIncidentNumber(incidentNumber);

        // Click the Go button to submit the search
        await automation.clickGoButton();

        // Wait for popup and extract data from the detail table
        let extractedData = null;
        extractedData = await automation.waitForPopupAndExtractData();

        console.log('✅ Incident extraction completed successfully!');
        console.log(`🔍 Entered Incident: ${incidentNumber}`);

        if (extractedData) {
            if (extractedData.incidentData) {
                console.log('📊 Incident Data:', JSON.stringify(extractedData.incidentData, null, 2));
            }
            // Handle legacy format (if extractedData is just the incident data)
            if (!extractedData.incidentData) {
                console.log('📊 Extracted Data:', JSON.stringify(extractedData, null, 2));
            }

            // Output structured data for GUI consumption (single line JSON)
            console.log(JSON.stringify(extractedData));
        }

        // Close browser
        await automation.close();

    } catch (error) {
        console.error('❌ Incident extraction failed:', error.message);
        console.error('Stack trace:', error.stack);

        try {
            await automation.takeScreenshot('error_screenshot_incident.png');
        } catch (screenshotError) {
            console.log('Could not take error screenshot:', screenshotError.message);
        }

        // Close browser even on error
        await automation.close();
    }
})();
