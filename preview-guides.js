// Build the same A4 sheets for preview and printing, using the rendered font metrics.
window.refreshPageGuides = (() => {
  let frame;
  const sources = new WeakMap();
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(paginate);
  }

  // Split an oversized block at child boundaries, then at text boundaries as needed.
  // Cloning preserves links, lists and inline formatting on both sheets.
  function splitNode(node, fits) {
    if (node.nodeType === Node.TEXT_NODE) {
      const chars = Array.from(node.textContent);
      let low = 0, high = chars.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fits(document.createTextNode(chars.slice(0, mid).join('')))) low = mid;
        else high = mid - 1;
      }
      // Prefer a word boundary when it doesn't leave most of the line unused.
      const prefix = chars.slice(0, low).join('');
      const boundary = prefix.search(/\s+\S*$/u);
      if (low < chars.length && boundary > prefix.length * .75) low = Array.from(prefix.slice(0, boundary + 1)).length;
      return [low ? document.createTextNode(chars.slice(0, low).join('')) : null,
        low < chars.length ? document.createTextNode(chars.slice(low).join('')) : null];
    }
    if (!node.childNodes.length) return [null, node.cloneNode(true)];
    const first = node.cloneNode(false), rest = node.cloneNode(false);
    const children = [...node.childNodes];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      first.append(child.cloneNode(true));
      if (fits(first)) continue;
      first.lastChild.remove();
      const [head, tail] = splitNode(child, part => {
        const candidate = first.cloneNode(true);
        candidate.append(part.cloneNode(true));
        return fits(candidate);
      });
      if (head) first.append(head);
      if (tail) rest.append(tail);
      children.slice(i + 1).forEach(x => rest.append(x.cloneNode(true)));
      if (node.tagName === 'OL') rest.start = (node.start || 1) + i;
      return [first.hasChildNodes() ? first : null, rest];
    }
    return [first, null];
  }

  function paginate() {
    const stack = document.querySelector('.paper-stack');
    if (!stack) return;
    if (!sources.has(stack)) sources.set(stack, stack.querySelector('.resume-page').cloneNode(true));
    const source = sources.get(stack);
    stack.style.transform = 'none';
    stack.replaceChildren();
    const pages = [];
    let page, body, section, sectionSource;
    let oversized = 0;
    function newPage() {
      page = source.cloneNode(false);
      page.classList.add('paginated-page');
      body = document.createElement('div');
      body.className = 'resume-body';
      page.append(body);
      stack.append(page);
      pages.push(page);
      section = null;
    }
    function fits() {
      const bottom = page.getBoundingClientRect().bottom - parseFloat(getComputedStyle(page).paddingBottom);
      return body.getBoundingClientRect().bottom <= bottom + .25;
    }
    function newSection() {
      section = sectionSource.cloneNode(false);
      const title = sectionSource.querySelector('.resume-section-title');
      if (title) section.append(title.cloneNode(true));
      body.append(section);
    }
    function appendBlock(block) {
      if (!section) newSection();
      section.append(block);
      if (fits()) return;
      block.remove();
      // Move the title with its first item; never leave an orphaned heading.
      if (section.children.length <= 1) { section.remove(); section = null; }
      if (body.children.length || page.querySelector('.resume-header')) {
        newPage();
      }
      if (!section) newSection();
      section.append(block);
      if (fits()) return;
      block.remove();
      oversized++;
      while (block) {
        const [head, tail] = splitNode(block, candidate => {
          const probe = candidate.cloneNode(true);
          section.append(probe);
          const result = fits();
          probe.remove();
          return result;
        });
        if (!head) {
          // An indivisible object (for example an image) must remain visible.
          section.append(block);
          page.classList.add('page-oversized');
          break;
        }
        section.append(head);
        block = tail;
        if (block) { newPage(); newSection(); }
      }
    }
    newPage();
    const header = source.querySelector('.resume-header');
    if (header) page.prepend(header.cloneNode(true));
    for (sectionSource of source.querySelectorAll('.resume-body > section')) {
      section = null;
      for (const item of sectionSource.children) {
        if (!item.matches('.resume-section-title')) appendBlock(item.cloneNode(true));
      }
    }
    pages.forEach((sheet, i) => {
      const label = document.createElement('div');
      label.className = 'page-number no-print';
      label.textContent = `${i + 1} / ${pages.length}`;
      sheet.append(label);
      sheet.setAttribute('aria-label', `이력서 ${i + 1}페이지`);
    });
    document.querySelector('.page-report')?.remove();
    const report = document.createElement('div');
    report.className = 'page-report no-print';
    const heading = document.createElement('strong');
    heading.textContent = `A4 · ${pages.length}페이지`;
    const note = document.createElement('p');
    note.textContent = '항목이 남은 공간에 들어가지 않으면 다음 페이지로 이동합니다.' +
      (oversized ? ' 한 페이지보다 긴 항목은 다음 장에 이어집니다.' : '');
    report.append(heading, note);
    const box = document.querySelector('.preview-box');
    box.before(report);
    const wrap = box.parentElement;
    const style = getComputedStyle(wrap);
    const available = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const scale = Math.min(1, available / stack.offsetWidth);
    stack.style.transform = `scale(${scale})`;
    box.style.width = `${stack.offsetWidth * scale}px`;
    box.style.height = `${stack.offsetHeight * scale}px`;
  }
  document.fonts?.addEventListener('loadingdone', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('beforeprint', paginate);
  window.addEventListener('afterprint', schedule);
  document.addEventListener('load', event => {
    if (event.target.matches?.('.resume-photo')) {
      // Cached images in the rebuilt pages do not require another pagination pass.
      const stack = event.target.closest('.paper-stack');
      const source = sources.get(stack);
      const original = source?.querySelector('.resume-photo');
      if (original && !original.dataset.measured) {
        original.dataset.measured = 'true';
        schedule();
      }
    }
  }, true);
  return schedule;
})();
