import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class ChangeOrderAutomation {
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

        // Test 2: Check internal network
        try {
            const response = await this.page.goto('http://10.100.85.31', { timeout: 15000 });
        } catch (e) {
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
        console.log('Waiting for Change Order form to be ready...');

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

    async selectChangeOrderType() {
        console.log('Selecting Change Order from ticket type dropdown...');

        if (!this.targetFrame) {
            throw new Error('Target frame not set');
        }

        // Check if the new UI selector exists
        const selector = await this.targetFrame.$('#ticket_type');

        // Select "Change Order" option (value="go_chg")
        await this.targetFrame.select('#ticket_type', 'go_chg');

        console.log('Change Order selected from dropdown');

        // Verify the selection
        const selectedValue = await this.targetFrame.evaluate(() => {
            const select = document.querySelector('#ticket_type');
            return select ? select.value : null;
        });

        console.log(`Verified selected value: ${selectedValue}`);

        if (selectedValue !== 'go_chg') {
            throw new Error(`Selection failed: expected go_chg, got ${selectedValue}`);
        }

        return true;
    }

    async enterChangeOrder(changeOrderNumber) {
        if (!changeOrderNumber || changeOrderNumber.trim() === '') {
            throw new Error('Change Order Number is required');
        }

        console.log(`Entering Change Order: ${changeOrderNumber}`);

        // Try new UI input field first
        let inputField = await this.targetFrame.$('input[name="searchKey"]');

        let inputSelector = 'input[name="searchKey"]';
        if (!inputField) {
            throw new Error('Change Order input field not found');
        }

        console.log(`Using input field selector: ${inputSelector}`);

        // Clear and fill the input field
        await inputField.click({ clickCount: 3 }); // Triple click to select all
        await inputField.type(changeOrderNumber);

        console.log(`Successfully entered Change Order Number: ${changeOrderNumber}`);

        // Verify the value was entered correctly
        const enteredValue = await this.targetFrame.evaluate((selector) => {
            const input = document.querySelector(selector);
            return input ? input.value : null;
        }, inputSelector);

        console.log(`Verified entered value: ${enteredValue}`);

        if (enteredValue !== changeOrderNumber) {
            throw new Error(`Value mismatch: expected ${changeOrderNumber}, got ${enteredValue}`);
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

                    // Re-check frames in case content loaded later
                    if (attempt === maxAttempts - 1) {
                        console.log('Last attempt: Re-checking popup frames for detail table...');
                        await this.recheckPopupFrames();
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

                    // Map only the specific fields we need
                    if (cleanHeader.includes('Requester')) {
                        data.requester = dataText;
                    } else if (cleanHeader.includes('Affected End User')) {
                        data.affected_end_user = dataText;
                    } else if (cleanHeader.includes('Category')) {
                        data.category = dataText;
                    } else if (cleanHeader.includes('Status')) {
                        data.status = dataText;
                    }
                }
            }

            return data;
        });

        // Also try to get Order Description if it exists (might be in a different part of the page)
        try {
            const orderDescription = await this.popupPage.evaluate(() => {
                // Look for common selectors for order description
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

            if (orderDescription && orderDescription.trim()) {
                tableData.order_description = orderDescription.trim();
            }
        } catch (e) {
            console.log('Could not extract order description:', e.message);
        }

        // Ensure we only return the fields we need
        const filteredData = {
            requester: tableData.requester || '',
            affected_end_user: tableData.affected_end_user || '',
            category: tableData.category || '',
            status: tableData.status || '',
            order_description: tableData.order_description || ''
        };


        // Now extract workflow tasks data
        const workflowData = await this.extractWorkflowTasks();

        return {
            changeOrderData: filteredData,
            workflowTasks: workflowData?.tasks || workflowData || []
        };
    }

    async debugPopupContent() {
        // Check for frames in the popup
        const frames = this.popupPage.frames();
        this.popupPage = frames[4];
        return;

    }

    async extractWorkflowTasks() {
        try {
            console.log('🔄 Extracting Workflow Tasks data...');

            if (!this.popupPage) {
                console.log('No popup page available for workflow extraction');
                return null;
            }

            // First, look for the workflow tasks button and click it
            console.log('Looking for Workflow Tasks button...');

            const workflowButton = await this.popupPage.$('#accrdnHyprlnk2');
            if (!workflowButton) {
                console.log('Workflow Tasks button not found');
                return null;
            }

            console.log('Found Workflow Tasks button, clicking...');
            await workflowButton.click();

            // Wait a moment for the content to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Look for the workflow tasks table
            console.log('Looking for workflow tasks table...');

            // Try to find workflow-related tables
            const workflowTableData = await this.popupPage.evaluate(() => {

                // Look for the specific workflow tasks table: #tbl901
                let workflowTable = document.querySelector('#tbl901');

                if (!workflowTable) {
                    // Try to find table with class "tab" and summary "Task List"
                    workflowTable = document.querySelector('table.tab[summary="Task List"]');
                    if (workflowTable) {
                        console.log('Found workflow table by class and summary');
                    }
                }

                if (!workflowTable) {
                    // Fallback: look for tables that contain workflow task headers
                    for (const table of allTables) {
                        const tableText = table.textContent.toLowerCase();
                        const hasTaskHeaders = tableText.includes('seq') && tableText.includes('task') &&
                            tableText.includes('assignee') && tableText.includes('status');
                        if (hasTaskHeaders) {
                            workflowTable = table;
                            console.log('Found workflow table by header content search');
                            break;
                        }
                    }
                }

                if (!workflowTable) {
                    // Look for tables near the workflow section
                    const workflowSection = document.querySelector('#accrdnHyprlnk2');
                    if (workflowSection) {
                        console.log('Looking for tables near workflow section');
                        let parent = workflowSection.parentElement;
                        let attempts = 0;
                        while (parent && !workflowTable && attempts < 5) {
                            const tables = parent.querySelectorAll('table');
                            if (tables.length > 0) {
                                workflowTable = tables[tables.length - 1]; // Get the last table (might be workflow tasks)
                                console.log('Found table near workflow section');
                                break;
                            }
                            parent = parent.parentElement;
                            attempts++;
                        }
                    }
                }

                if (!workflowTable) {
                    return { error: 'No workflow table found', debugInfo: `Checked ${allTables.length} tables` };
                }

                console.log(`Found workflow table: id="${workflowTable.id}", class="${workflowTable.className}"`);

                // Extract structured data from the workflow tasks table
                const data = {
                    tableId: workflowTable.id || 'no-id',
                    tableClass: workflowTable.className || 'no-class',
                    headers: [],
                    tasks: []
                };

                const rows = workflowTable.querySelectorAll('tr');

                // First row should contain headers
                if (rows.length > 0) {
                    const headerRow = rows[0];
                    const headerCells = headerRow.querySelectorAll('th');

                    for (let i = 0; i < headerCells.length; i++) {
                        data.headers.push(headerCells[i].textContent.trim());
                    }
                }

                // Process data rows (starting from row 1)
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const cells = row.querySelectorAll('td');
                    const taskData = {};

                    for (let j = 0; j < cells.length && j < data.headers.length; j++) {
                        const cell = cells[j];
                        const headerName = data.headers[j].toLowerCase();
                        let cellText = '';

                        // Check for links in the cell
                        const link = cell.querySelector('a');
                        if (link) {
                            cellText = link.textContent.trim();
                        } else {
                            cellText = cell.textContent.trim();
                        }

                        // Map to clean field names
                        if (headerName.includes('seq')) {
                            taskData.sequence = cellText;
                        } else if (headerName.includes('task')) {
                            taskData.task = cellText;
                        } else if (headerName.includes('description')) {
                            taskData.description = cellText;
                        } else if (headerName.includes('assignee')) {
                            taskData.assignee = cellText;
                        } else if (headerName.includes('group')) {
                            taskData.group = cellText;
                        } else if (headerName.includes('status')) {
                            taskData.status = cellText;
                        } else if (headerName.includes('start date')) {
                            taskData.start_date = cellText;
                        } else if (headerName.includes('completion date')) {
                            taskData.completion_date = cellText;
                        }
                    }

                    // Only add task if it has meaningful data
                    if (Object.keys(taskData).length > 0) {
                        data.tasks.push(taskData);
                    }
                }

                return data;
            });

            if (workflowTableData && !workflowTableData.error) {
                console.log('📋 Extracted Workflow Tasks Data:');
                return workflowTableData;
            } else {
                console.log('Could not extract workflow tasks data:', workflowTableData?.error || 'Unknown error');
                return null;
            }

        } catch (e) {
            console.log('Error extracting workflow tasks:', e.message);
            return null;
        }
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
    const automation = new ChangeOrderAutomation();

    try {
        // Initialize browser and page
        await automation.init();

        // Navigate to the application
        console.log('🚀 Starting Change Order automation...');
        await automation.navigateToApplication();

        // Find the target frame containing the form
        await automation.findTargetFrame();

        // Wait for form to be ready
        await automation.waitForFormReady();

        // Select Change Order from the ticket type dropdown (for new UI)
        await automation.selectChangeOrderType();

        // Extract form data for debugging

        // Enter the specific change order number

        const changeOrderNumber = "21236341";
        await automation.enterChangeOrder(changeOrderNumber);

        // Click the Go button to submit the search
        await automation.clickGoButton();

        // Wait for popup and extract data from the detail table
        let extractedData = null;
        extractedData = await automation.waitForPopupAndExtractData();

        console.log('✅ Change Order automation completed successfully!');
        console.log(`🔍 Entered Change Order: ${changeOrderNumber}`);

        if (extractedData) {
            if (extractedData.changeOrderData) {
                console.log('📊 Change Order Data:', JSON.stringify(extractedData.changeOrderData, null, 2));
            }
            if (extractedData.workflowTasks) {
                console.log('🔄 Workflow Tasks Data:', JSON.stringify(extractedData.workflowTasks, null, 2));
            }
            // Handle legacy format (if extractedData is just the change order data)
            if (!extractedData.changeOrderData && !extractedData.workflowTasks) {
                console.log('📊 Extracted Data:', JSON.stringify(extractedData, null, 2));
            }

            // Output structured data for GUI consumption (single line JSON)
            console.log(JSON.stringify(extractedData));
        }


        // Keep browser open for inspection
        await automation.close();

    } catch (error) {
        console.error('❌ Automation failed:', error.message);
        console.error('Stack trace:', error.stack);

        try {
            await automation.takeScreenshot('error_screenshot.png');
        } catch (screenshotError) {
            console.log('Could not take error screenshot:', screenshotError.message);
        }

        // Keep browser open even on error for debugging
        await automation.close();
    }
})();
