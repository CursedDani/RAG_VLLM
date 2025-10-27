import puppeteer from 'puppeteer';

(async () => {
    let browser;
    try {
        console.log('Starting Puppeteer in debug mode...');

        browser = await puppeteer.launch({
            headless: false,
            devtools: false,
        });

        const page = await browser.newPage();

        // Set up NTLM authentication
        await page.authenticate({
            username: 'guadaran',
            password: 'Nomeacuerdo12]'
        });



        // Test 2: Check internal network
        try {
            console.log('Test 2: Accessing internal IP...');
            const response = await page.goto('http://10.100.85.31', { timeout: 15000 });
            console.log('✓ Internal server response status:', response.status());
        } catch (e) {
            console.log('✗ Internal server failed:', e.message);
        }

        // Test 3: Check specific application URL
        try {
            console.log('Test 3: Accessing application URL...');
            const response = await page.goto('http://10.100.85.31/CAisd/pdmweb1.exe');
            console.log('✓ Application response status:', response.status());
            await page.waitForSelector('input[name="number"]');

            await page.type('#chgnum', '21078419');
            await page.click('a[name="imgBtn3"]');

            // Check current URL
            const currentUrl = page.url();
            console.log('Current URL:', currentUrl);

            // Take screenshot for debugging
            await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

        } catch (e) {
            console.log('✗ Application failed:', e.message);
        }


    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
