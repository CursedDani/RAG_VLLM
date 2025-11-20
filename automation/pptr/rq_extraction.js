import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class RequestExtraction {
    constructor() {
        this.browser = null;
        this.page = null;
        this.targetFrame = null;
        this.popupPage = null;
        this.baseUrl = 'http://10.100.85.31/CAisd/pdmweb1.exe';
    }

    async init() {
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
    }

    async navigateToApplication() {
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

        if (response.status() !== 200) {
            throw new Error(`Failed to load application: HTTP ${response.status()}`);
        }

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
                    break;
                }
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async findTargetFrame() {
        const frames = this.page.frames();
        const frame = frames[1];
        this.targetFrame = frame;
        return frame;
    }

    async waitForFormReady() {
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

            // Wait for form to be fully loaded
            await this.targetFrame.waitForFunction(() => {
                const selector = document.querySelector('#ticket_type');
                const input = document.querySelector('input[name="searchKey"]');
                return selector && input && document.readyState === 'complete';
            }, { timeout: 15000 });

            return;

        } catch (e) {
            // Form not ready
        }
    }

    async selectRequestType() {
        if (!this.targetFrame) {
            throw new Error('Target frame not set');
        }

        // Check if the new UI selector exists
        const selector = await this.targetFrame.$('#ticket_type');

        // Select "Request" option (value="go_cr")
        await this.targetFrame.select('#ticket_type', 'go_cr');

        // Verify the selection
        const selectedValue = await this.targetFrame.evaluate(() => {
            const select = document.querySelector('#ticket_type');
            return select ? select.value : null;
        });

        if (selectedValue !== 'go_cr') {
            throw new Error(`Selection failed: expected go_cr, got ${selectedValue}`);
        }

        return true;
    }

    async enterRequestNumber(requestNumber) {
        if (!requestNumber || requestNumber.trim() === '') {
            throw new Error('Request Number is required');
        }

        // Try new UI input field first
        let inputField = await this.targetFrame.$('input[name="searchKey"]');

        let inputSelector = 'input[name="searchKey"]';
        if (!inputField) {
            throw new Error('Request input field not found');
        }

        // Clear and fill the input field
        await inputField.click({ clickCount: 3 }); // Triple click to select all
        await inputField.type(requestNumber);

        // Verify the value was entered correctly
        const enteredValue = await this.targetFrame.evaluate((selector) => {
            const input = document.querySelector(selector);
            return input ? input.value : null;
        }, inputSelector);

        if (enteredValue !== requestNumber) {
            throw new Error(`Value mismatch: expected ${requestNumber}, got ${enteredValue}`);
        }

        return true;
    }

    async clickGoButton() {
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
            this.popupPage = result.popup;

            try {
                await this.popupPage.waitForFunction(() => document.readyState !== 'loading', { timeout: 10000 }).catch(() => { });
            } catch (e) {
                // Continue anyway as the popup might still be usable
            }
        }

        return true;
    }

    async waitForPopupAndExtractData() {
        if (!this.popupPage) {
            throw new Error('Popup page not available');
        }

        await this.debugPopupContent();

        // Try multiple approaches to wait for content
        let tableFound = false;
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Wait for the detail table to be present with shorter timeout
                await this.popupPage.waitForSelector('#dtltbl0', { timeout: 5000 });
                tableFound = true;
                break;
            } catch (e) {
                if (attempt < maxAttempts) {
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

                    // Map the specific fields we need for requests
                    if (cleanHeader.includes('Requester') || cleanHeader.includes('Customer')) {
                        data.requester = dataText;
                    } else if (cleanHeader.includes('Affected End User') || cleanHeader.includes('End User')) {
                        data.affected_end_user = dataText;
                    } else if (cleanHeader.includes('Category')) {
                        data.category = dataText;
                    } else if (cleanHeader.includes('Status')) {
                        data.status = dataText;
                    } else if (cleanHeader.includes('Priority')) {
                        data.priority = dataText;
                    } else if (cleanHeader.includes('Type') && !cleanHeader.includes('Request Type')) {
                        data.type = dataText;
                    } else if (cleanHeader.includes('Request Type')) {
                        data.request_type = dataText;
                    } else if (cleanHeader.includes('Summary') || cleanHeader.includes('Subject')) {
                        data.summary = dataText;
                    } else if (cleanHeader.includes('Active') || cleanHeader.includes('active')) {
                        data.active = dataText;
                    }
                }
            }

            return data;
        });

        // Also try to get Request Description if it exists (might be in a different part of the page)
        try {
            const requestDescription = await this.popupPage.evaluate(() => {
                // Look for common selectors for request description
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

            if (requestDescription && requestDescription.trim()) {
                tableData.request_description = requestDescription.trim();
            }
        } catch (e) {
            // Could not extract request description
        }

        // Ensure we only return the fields we need for requests
        const filteredData = {
            requester: tableData.requester || '',
            affected_end_user: tableData.affected_end_user || '',
            category: tableData.category || '',
            status: tableData.status || '',
            priority: tableData.priority || '',
            type: tableData.type || '',
            request_type: tableData.request_type || '',
            summary: tableData.summary || '',
            request_description: tableData.request_description || '',
            active: tableData.active || ''
        };

        return {
            requestData: filteredData
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
        }
    }
}

// Main execution
(async () => {
    const automation = new RequestExtraction();

    try {
        await automation.init();
        await automation.navigateToApplication();
        await automation.findTargetFrame();
        await automation.waitForFormReady();
        await automation.selectRequestType();

        const requestNumber = process.argv[2];

        if (!requestNumber) {
            throw new Error('Request Number is required. Usage: node rq_extraction.js <RQ_NUMBER>');
        }

        await automation.enterRequestNumber(requestNumber);
        await automation.clickGoButton();

        let extractedData = null;
        extractedData = await automation.waitForPopupAndExtractData();

        if (extractedData) {
            // Save to JSON file
            const outputDir = 'output';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${outputDir}/request_${requestNumber}_${timestamp}.json`;

            fs.writeFileSync(filename, JSON.stringify(extractedData, null, 2), 'utf-8');

            // Output structured data for API consumption (single line JSON)
            console.log(JSON.stringify(extractedData));
        }

        await automation.close();

    } catch (error) {
        await automation.close();
        process.exit(1);
    }
})();
