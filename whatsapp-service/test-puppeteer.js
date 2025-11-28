const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security'
            ]
        });
        console.log('Browser launched successfully!');
        const version = await browser.version();
        console.log('Browser version:', version);
        await browser.close();
        console.log('Browser closed.');
    } catch (error) {
        console.error('Failed to launch browser:', error);
        process.exit(1);
    }
})();
