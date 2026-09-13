// Run with Playwright available through NODE_PATH; optionally set CHROME_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.waitForSelector('.paginated-page');
    const original = await page.locator('.paper-stack').evaluate(stack => {
      const source = stack.querySelector('article').cloneNode(true);
      source.classList.remove('paginated-page');
      source.querySelector('.page-number')?.remove();
      return source.outerHTML;
    });
    async function fixture(template, oversized = false) {
      await page.evaluate(({ original, template, oversized }) => {
        const box = document.querySelector('.preview-box');
        box.innerHTML = `<div class="paper-stack">${original}</div>`;
        const article = box.querySelector('article');
        article.className = `resume-page template-${template}`;
        article.style.setProperty('--resume-font', 'Arial, sans-serif');
        const body = article.querySelector('.resume-body');
        const section = document.createElement('section');
        section.innerHTML = '<h2 class="resume-section-title">경력</h2>';
        for (let i = 0; i < (oversized ? 1 : 18); i++) {
          const entry = document.createElement('div');
          entry.className = 'entry';
          entry.dataset.item = i;
          entry.innerHTML = `<div class="entry-head"><strong>항목 ${i}</strong><time>2024 – 현재</time></div>`;
          const list = document.createElement('ul');
          for (let j = 0; j < (oversized ? 4 : 6); j++) {
            const li = document.createElement('li');
            li.textContent = oversized ? `내용 ${j} ` + '긴 설명과 한글 😀 testing '.repeat(450) : `업무 내용 ${i}-${j}`;
            list.append(li);
          }
          entry.append(list);
          section.append(entry);
        }
        body.replaceChildren(section);
        window.expectedText = [...section.children].slice(1).map(x => x.textContent).join('');
        window.refreshPageGuides();
      }, { original, template, oversized });
      await page.waitForSelector('.paginated-page');
    }
    async function check(oversized = false) {
      const result = await page.evaluate(() => {
        const sheets = [...document.querySelectorAll('.paginated-page')];
        const scale = document.querySelector('.paper-stack').getBoundingClientRect().width / document.querySelector('.paper-stack').offsetWidth;
        return {
          count: sheets.length,
          overflow: sheets.some(sheet => sheet.querySelector('.resume-body').getBoundingClientRect().bottom > sheet.getBoundingClientRect().bottom - parseFloat(getComputedStyle(sheet).paddingBottom) * scale + 1),
          text: [...document.querySelectorAll('.resume-body .entry')].map(x => x.textContent).join(''),
          expected: window.expectedText,
          entries: document.querySelectorAll('.resume-body .entry').length,
          orphan: [...document.querySelectorAll('.resume-body section')].some(s => s.children.length < 2)
        };
      });
      assert.ok(result.count > 1);
      assert.equal(result.overflow, false, 'content must fit within A4 margins');
      assert.equal(result.orphan, false, 'headings must stay with content');
      assert.equal(result.text, result.expected, 'pagination must preserve all text in order');
      if (!oversized) assert.equal(result.entries, 18, 'ordinary entries must remain whole');
      return result.count;
    }
    for (const template of ['korean', 'ats', 'minimal', 'modern', 'compact', 'europass']) {
      await fixture(template);
      const count = await check();
      const pdf = await page.pdf({ preferCSSPageSize: true });
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, count, 'PDF and preview page counts must match');
      console.log(`${template}: ${count} sheets, PDF matches`);
    }
    if (process.env.PREVIEW_SCREENSHOT) await page.screenshot({ path: process.env.PREVIEW_SCREENSHOT, fullPage: true });
    await fixture('modern', true);
    await check(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    await check(true);
    assert.ok(await page.evaluate(() => document.querySelector('.preview-box').getBoundingClientRect().right <= innerWidth), 'mobile preview must fit the viewport');
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.waitForTimeout(100);
    await check(true);
    // Editing down to a short or empty document must remove all obsolete sheets.
    for (const summary of ['짧은 소개입니다.', '']) {
      await page.evaluate(summary => {
        localStorage.setItem('resume-studio-v3', JSON.stringify({
          version: 3, resume: { name: '페이지 확인', summary },
          preferences: { fontFamily: 'system' }
        }));
      }, summary);
      await page.reload();
      await page.waitForSelector('.paginated-page');
      assert.equal(await page.locator('.paginated-page').count(), 1);
      await page.locator('[data-path="resume.summary"]').fill('수정한 자기소개');
      await page.waitForFunction(() => document.querySelector('.summary')?.textContent === '수정한 자기소개');
      await page.waitForSelector('.paginated-page');
      assert.equal(await page.locator('.paginated-page').count(), 1);
    }
    assert.deepEqual(errors, []);
    console.log('Oversized Unicode text, resize, mobile and console checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
