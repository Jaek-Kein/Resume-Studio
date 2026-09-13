// NODE_PATH must contain playwright and pdfjs-dist. Optional CHROME_PATH and LINK_ARTIFACTS.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const output = process.env.LINK_ARTIFACTS || path.join(require('node:os').tmpdir(), 'resume-link-check');
fs.mkdirSync(output, { recursive: true });
const viewer = `<!doctype html><link rel="stylesheet" href="/pdfjs/web/pdf_viewer.css">
<style>body{margin:0}#container{position:absolute;inset:0;overflow:auto}</style>
<div id="container"><div id="viewer" class="pdfViewer"></div></div>
<script type="module">
import * as pdfjsLib from '/pdfjs/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc='/pdfjs/build/pdf.worker.mjs';
const {EventBus,PDFLinkService,PDFViewer}=await import('/pdfjs/web/pdf_viewer.mjs');
const eventBus=new EventBus();
const linkService=new PDFLinkService({eventBus,externalLinkTarget:2});
const viewer=new PDFViewer({container:document.getElementById('container'),eventBus,linkService});
linkService.setViewer(viewer);
const doc=await pdfjsLib.getDocument({url:'/artifacts/'+new URLSearchParams(location.search).get('file')}).promise;
window.pdfAnnotations=[];
for(let i=1;i<=doc.numPages;i++)window.pdfAnnotations.push(...await (await doc.getPage(i)).getAnnotations());
viewer.setDocument(doc);linkService.setDocument(doc);
</script>`;
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (name === '/viewer') { res.setHeader('Content-Type', 'text/html'); res.end(viewer); return; }
  const base = name.startsWith('/pdfjs/') ? pdfRoot : name.startsWith('/artifacts/') ? output : root;
  const relative = name.replace(/^\/(pdfjs|artifacts)\//, '').replace(/^\//, '') || 'index.html';
  const file = path.resolve(base, relative);
  if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.pdf':'application/pdf'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
    // Only verify navigation, without depending on external services or sending resume data.
    await context.route('https://**/*', route => route.fulfill({ contentType:'text/html', body:'Link destination reached' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    const targets = ['https://github.com/example', 'https://blog.example.com/posts?a=1&b=2#intro', 'https://project.example.com/demo'];
    async function clickLink(tab, selector, target) {
      const popupPromise = context.waitForEvent('page');
      await tab.locator(selector).first().click();
      const popup = await popupPromise;
      await popup.waitForURL(target);
      await popup.close();
    }
    for (const template of ['korean','ats','minimal','modern','compact','europass']) {
      await page.evaluate(template => localStorage.setItem('resume-studio-v3', JSON.stringify({
        version:3,
        resume:{name:'Link verification',github:'  github.com/example  ',blog:'//blog.example.com/posts?a=1&b=2#intro',projects:[{id:'p',name:'Project',link:'project.example.com/demo',description:'Project description'}]},
        preferences:{template,fontFamily:'system',sectionOrder:['projects'],hiddenSections:[]}
      })), template);
      await page.reload();
      await page.waitForSelector('.paginated-page .entry-link a');
      for (const target of targets) await clickLink(page, `.paper-stack a[href="${target}"]`, target);
      await page.evaluate(() => { window.print = () => { window.printReady = true; }; });
      await page.locator('[data-action="print"]').first().click();
      await page.waitForFunction(() => window.printReady);
      const file = `${template}.pdf`;
      const pdf = await page.pdf({path:path.join(output,file),preferCSSPageSize:true,printBackground:true});
      // These are embedded PDF actions, not a viewer detecting URL-shaped text.
      assert.match(pdf.toString('latin1'), /\/Subtype\s*\/Link/);
      assert.match(pdf.toString('latin1'), /\/S\s*\/URI/);
      const pdfPage = await context.newPage();
      pdfPage.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
      await pdfPage.goto(`${origin}/viewer?file=${file}`);
      await pdfPage.waitForFunction(() => window.pdfAnnotations?.length >= 3);
      const annotations = await pdfPage.evaluate(() => window.pdfAnnotations.map(a => ({subtype:a.subtype,url:a.url,rect:a.rect})));
      for (const target of targets) {
        assert.ok(annotations.some(a => a.subtype==='Link' && a.url===target && a.rect[2]>a.rect[0] && a.rect[3]>a.rect[1]), `Missing PDF link: ${target}`);
        await clickLink(pdfPage, `.annotationLayer a[href="${target}"]`, target);
      }
      await pdfPage.close();
      console.log(`${template}: preview navigation, embedded PDF URI annotations, PDF.js link clicks passed`);
    }
    // Editing existing data keeps raw input while normalizing only the link destination.
    const github = page.locator('[data-path="resume.github"]');
    for (const [input, expected] of [
      [' HTTP://example.com/path?q=1#part ', 'http://example.com/path?q=1#part'],
      ['example.com:8443/path', 'https://example.com:8443/path'],
      ['https://example.com/a?x=1&y=2', 'https://example.com/a?x=1&y=2']
    ]) {
      await github.fill(input);
      await page.waitForSelector(`.paginated-page .contact a[href="${expected}"]`);
      assert.equal(await github.inputValue(), input);
    }
    for (const input of ['', '   ', 'javascript:alert(1)', 'data:text/html,test']) {
      await github.fill(input);
      await page.waitForSelector('.paginated-page');
      assert.equal(await page.locator('.contact a').count(), 1, 'only the Blog link remains');
    }
    assert.deepEqual(errors, []);
    console.log(`PDF artifacts: ${output}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
