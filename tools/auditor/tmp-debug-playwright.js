const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.exposeBinding('sendAuditorEvent', async ({ page }, eventType, payload) => {
    console.log('BINDING', eventType, payload && payload.interactionId);
  });
  const collectorPath = path.resolve('c:/Users/User/Desktop/Asstro_POS/tools/auditor/evidence-collector.ts');
  let collectorCode = fs.readFileSync(collectorPath, 'utf8');
  collectorCode = collectorCode.replace('export function injectEvidenceCollector()', 'function injectEvidenceCollector()');
  collectorCode += '\n\ninjectEvidenceCollector();';
  const jsCode = ts.transpileModule(collectorCode, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  await context.addInitScript({ content: jsCode });
  const page = await context.newPage();
  page.on('console', msg => console.log('console:', msg.text()));
  page.on('pageerror', err => console.log('pageerror:', err.message));
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.mouse.click(200, 200);
  await page.waitForTimeout(2000);
  await browser.close();
})();
