import puppeteer from "puppeteer";

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://youtube.com');
    await page.waitForSelector('input[name="search_query"]');
    await page.type('input[name="search_query"]', 'jet2 holiday');
    await page.keyboard.press('Enter', { delay: 5000 });
    await page.screenshot({ path: 'images/example.png' });

    await browser.close();
})();