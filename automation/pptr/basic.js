import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({'headless': false});
    const page = await browser.newPage();
    await page.viewport({ width: 1280, height: 800 });
    await page.goto('https://bot.sannysoft.com');
    await page.screenshot({ path: 'images/example.png', fullPage: true });
    const contents = await page.content();
    console.log(contents);
    await browser.close();
})();