// Screen-only A4 measurements; the browser still controls print pagination.
window.refreshPageGuides = (() => {
  let frame;
  const observer = new ResizeObserver(() => schedule());
  let observed;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  }
  function measure() {
    const page = document.querySelector('.resume-page');
    if (!page) return;
    if (observed !== page) {
      observer.disconnect();
      observer.observe(page);
      observed = page;
    }
    document.querySelectorAll('.page-guides,.page-report').forEach(el => el.remove());
    page.querySelectorAll('.page-crossing').forEach(el => el.classList.remove('page-crossing'));
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;height:297mm;width:0;visibility:hidden;pointer-events:none';
    page.append(probe);
    const pageHeight = probe.getBoundingClientRect().height;
    probe.remove();
    const rect = page.getBoundingClientRect();
    const scale = rect.width / page.offsetWidth;
    const unit = pageHeight;
    const count = Math.max(1, Math.ceil((rect.height - 1) / unit));
    const guides = document.createElement('div');
    guides.className = 'page-guides no-print';
    for (let i = 1; i < count; i++) {
      const line = document.createElement('div');
      line.className = 'page-boundary';
      line.style.top = `${i * unit / scale}px`;
      line.textContent = `여기부터 ${i + 1}페이지 · A4 기준`;
      guides.append(line);
    }
    const warnings = [];
    page.querySelectorAll('.entry,.row-entry,.summary,.kv-grid,.skills').forEach(el => {
      const box = el.getBoundingClientRect();
      const start = box.top - rect.top;
      const end = box.bottom - rect.top;
      if (Math.floor((start + 1) / unit) === Math.floor((end - 1) / unit)) return;
      el.classList.add('page-crossing');
      const label = el.querySelector('strong')?.textContent || el.closest('section')?.querySelector('h2')?.textContent || '항목';
      warnings.push(`${label}: ${box.height > unit ? '한 페이지보다 길어 나누어 출력됩니다.' : '페이지 경계에 걸쳐 있습니다. 인쇄 시 다음 페이지로 이동하거나 나뉠 수 있습니다.'}`);
    });
    page.append(guides);
    const report = document.createElement('div');
    report.className = 'page-report no-print';
    const heading = document.createElement('strong');
    heading.textContent = `A4 예상 ${count}페이지${warnings.length ? ` · 경계 확인 ${warnings.length}건` : ''}`;
    report.append(heading);
    const note = document.createElement('p');
    note.textContent = '점선은 A4 높이 기준입니다. 실제 페이지 나눔은 인쇄 미리보기에서 확인하세요.';
    report.append(note);
    if (warnings.length) {
      const list = document.createElement('ul');
      warnings.forEach(message => { const item = document.createElement('li'); item.textContent = message; list.append(item); });
      report.append(list);
    }
    document.querySelector('.preview-box').before(report);
  }
  document.fonts?.addEventListener('loadingdone', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('load', event => { if (event.target.matches?.('.resume-photo')) schedule(); }, true);
  return schedule;
})();
