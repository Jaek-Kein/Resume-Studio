// Vector PDF export. DOM ranges supply layout only: no screenshot, canvas text,
// OS printer, or hidden OCR layer is used. Photos remain embedded image objects.
window.downloadResumePDF = (() => {
  const assetBase = new URL('.', document.currentScript.src);
  const fontBytes = new Map();
  const bundled = {400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'};
  const cleanFamily = text => text.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  async function bytes(url) {
    if (!fontBytes.has(url)) fontBytes.set(url, fetch(url).then(response => {
      if (!response.ok) throw new Error(`글꼴 파일을 불러오지 못했습니다 (${response.status}).`);
      return response.arrayBuffer();
    }).catch(error => { fontBytes.delete(url); throw error; }));
    return fontBytes.get(url);
  }
  async function fontFaces() {
    const faces = Object.entries(bundled).map(([weight,name]) => ({
      family:'pretendard',weight:Number(weight),ranges:null,
      url:new URL(`media/fonts/Pretendard-${name}.woff`,assetBase).href
    }));
    const stylesheet = document.getElementById('resume-webfont');
    if (!stylesheet || /pretendard/i.test(stylesheet.href)) return faces;
    const seen = new Set();
    async function readCSS(url) {
      if (seen.has(url)) return;
      seen.add(url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('선택한 웹폰트 CSS를 불러오지 못했습니다.');
      const css = await response.text();
      for (const match of css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) await readCSS(new URL(match[1],url).href);
      for (const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
        const declaration = document.createElement('span').style;
        declaration.cssText = match[1];
        const family = cleanFamily(declaration.getPropertyValue('font-family'));
        const source = /url\(\s*['"]?([^'"\s)]+)/.exec(declaration.getPropertyValue('src'));
        if (!family || !source) continue;
        const weights = (declaration.getPropertyValue('font-weight') || '400').split(/\s+/).map(Number);
        const ranges = declaration.getPropertyValue('unicode-range').split(',').filter(Boolean).map(range => {
          const [a,b] = range.trim().replace(/^U\+/i,'').split('-');
          return [parseInt(a.replace(/\?/g,'0'),16),parseInt((b||a).replace(/\?/g,'F'),16)];
        });
        faces.push({family,weight:weights[0]||400,maxWeight:weights[1],ranges:ranges.length?ranges:null,url:new URL(source[1],url).href});
      }
    }
    await readCSS(stylesheet.href);
    return faces;
  }
  function color(css) {
    const channels=css.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];
    const divisor=css.startsWith('color(')?1:255;
    return {color:PDFLib.rgb(...channels.slice(0,3).map(x=>Math.min(1,x/divisor))),opacity:channels[3]??1};
  }
  function rectPath(x,y,w,h,r) {
    const k=.55228475;
    return `M ${x+r} ${y} L ${x+w-r} ${y} C ${x+w-r+k*r} ${y} ${x+w} ${y+r-k*r} ${x+w} ${y+r} L ${x+w} ${y+h-r} C ${x+w} ${y+h-r+k*r} ${x+w-r+k*r} ${y+h} ${x+w-r} ${y+h} L ${x+r} ${y+h} C ${x+r-k*r} ${y+h} ${x} ${y+h-r+k*r} ${x} ${y+h-r} L ${x} ${y+r} C ${x} ${y+r-k*r} ${x+r-k*r} ${y} ${x+r} ${y} Z`;
  }
  async function createPDF(stack, title) {
    const {PDFDocument,PDFString} = PDFLib;
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(title);
    doc.setCreator('Resume Studio');
    doc.setProducer('Resume Studio / pdf-lib (vector text)');
    const faces = await fontFaces(), embedded = new Map();
    async function chooseFont(style, text) {
      const code = text.codePointAt(0), weight = Number(style.fontWeight)||400;
      const families = style.fontFamily.split(',').map(cleanFamily);
      // A bundled, embedded Korean font is also available when a system fallback
      // has no downloadable font program. Positions still come from the DOM.
      if (!families.includes('pretendard')) families.push('pretendard');
      for (const family of families) {
        const candidates = faces.filter(f=>f.family===family&&(!f.ranges||f.ranges.some(([a,b])=>code>=a&&code<=b)))
          .sort((a,b)=>Math.abs(weight-Math.min(Math.max(weight,a.weight),a.maxWeight||a.weight))-Math.abs(weight-Math.min(Math.max(weight,b.weight),b.maxWeight||b.weight)));
        for (const face of candidates) {
          if (!embedded.has(face.url)) {
            const data = await bytes(face.url), metrics = fontkit.create(new Uint8Array(data));
            embedded.set(face.url,{font:await doc.embedFont(data,{subset:true}),metrics});
          }
          const entry = embedded.get(face.url);
          if (entry.metrics.hasGlyphForCodePoint(code)) return entry;
        }
      }
      throw new Error(`PDF 글꼴에 '${text}' 문자가 없습니다. 다른 웹폰트를 선택해 주세요.`);
    }
    for (const sheet of stack.querySelectorAll('.resume-page')) {
      const bounds=sheet.getBoundingClientRect(), scale=(210/25.4*72)/bounds.width;
      const height=bounds.height*scale;
      const page=doc.addPage([210/25.4*72,height]);
      const position=rect=>({x:(rect.left-bounds.left)*scale,y:height-(rect.bottom-bounds.top)*scale,width:rect.width*scale,height:rect.height*scale});
      function box(element,style) {
        const p=position(element.getBoundingClientRect());
        const radius=Math.min(parseFloat(style.borderTopLeftRadius)||0,p.width/scale/2,p.height/scale/2)*scale;
        const bg=color(style.backgroundColor), opacity=Number(style.opacity);
        if (bg.opacity) page.drawSvgPath(rectPath(0,0,p.width,p.height,radius),{x:p.x,y:p.y+p.height,color:bg.color,opacity:bg.opacity*opacity});
        const edges=['Top','Right','Bottom','Left'];
        const widths=edges.map(edge=>parseFloat(style[`border${edge}Width`])||0);
        if (radius&&widths.every(w=>w===widths[0])&&widths[0]) {
          const border=color(style.borderTopColor);
          page.drawSvgPath(rectPath(0,0,p.width,p.height,radius),{x:p.x,y:p.y+p.height,borderColor:border.color,borderWidth:widths[0]*scale,borderOpacity:border.opacity*opacity});
        } else edges.forEach((edge,i)=>{
          if (!widths[i]) return;
          const c=color(style[`border${edge}Color`]),w=widths[i]*scale;
          const coords=[[p.x,p.y+p.height-w/2,p.x+p.width,p.y+p.height-w/2],[p.x+p.width-w/2,p.y,p.x+p.width-w/2,p.y+p.height],[p.x,p.y+w/2,p.x+p.width,p.y+w/2],[p.x+w/2,p.y,p.x+w/2,p.y+p.height]][i];
          page.drawLine({start:{x:coords[0],y:coords[1]},end:{x:coords[2],y:coords[3]},thickness:w,color:c.color,opacity:c.opacity*opacity});
        });
      }
      async function textNode(node,style) {
        const range=document.createRange(), size=parseFloat(style.fontSize)*scale;
        const paint=color(style.color);
        // Grapheme ranges keep browser line wrapping, letter spacing and Korean
        // positions. Every visible grapheme is emitted as actual PDF text.
        const segments=new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(node.textContent);
        for (const {segment,index} of segments) {
          if (/^[\r\n\t]+$/.test(segment)) continue;
          range.setStart(node,index);range.setEnd(node,index+segment.length);
          const rect=range.getBoundingClientRect();
          if (!rect.width||!rect.height) continue;
          const text=style.textTransform==='uppercase'?segment.toUpperCase():style.textTransform==='lowercase'?segment.toLowerCase():segment;
          const {font,metrics}=await chooseFont(style,text);
          const p=position(rect), units=metrics.unitsPerEm;
          const ascent=metrics.ascent/units*size,descent=metrics.descent/units*size;
          const baseline=p.y+(p.height-(ascent-descent))/2-descent;
          page.drawText(text,{x:p.x,y:baseline,size,font,color:paint.color,opacity:paint.opacity});
        }
      }
      async function walk(element) {
        if (element.matches('.no-print')) return;
        const style=getComputedStyle(element);
        if (style.display==='none'||style.visibility==='hidden') return;
        box(element,style);
        if (element.tagName==='IMG') {
          const source=await fetch(element.src).then(r=>r.arrayBuffer());
          const image=/^data:image\/png/i.test(element.src)?await doc.embedPng(source):await doc.embedJpg(source);
          const p=position(element.getBoundingClientRect());
          const factor=Math.max(p.width/image.width,p.height/image.height);
          page.pushOperators(PDFLib.pushGraphicsState(),PDFLib.rectangle(p.x,p.y,p.width,p.height),PDFLib.clip(),PDFLib.endPath());
          page.drawImage(image,{x:p.x+(p.width-image.width*factor)/2,y:p.y+(p.height-image.height*factor)/2,width:image.width*factor,height:image.height*factor});
          page.pushOperators(PDFLib.popGraphicsState());
        }
        for (const child of element.childNodes) {
          if (child.nodeType===Node.TEXT_NODE) await textNode(child,style);
          else if (child.nodeType===Node.ELEMENT_NODE) await walk(child);
        }
        if (element.matches('a[href]')) {
          const url=new URL(element.href);
          if (!['http:','https:'].includes(url.protocol)) return;
          const range=document.createRange();range.selectNodeContents(element);
          for (const rect of range.getClientRects()) {
            if (!rect.width||!rect.height) continue;
            const p=position(rect);
            const annotation=doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[p.x,p.y,p.x+p.width,p.y+p.height],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(url.href)}}));
            page.node.addAnnot(annotation);
          }
        }
      }
      await walk(sheet);
    }
    return doc.save();
  }
  return async function downloadResumePDF({title='resume'}={}) {
    for (const [global,file] of [['PDFLib','pdf-lib.min.js'],['fontkit','fontkit.min.js']]) {
      if (window[global]) continue;
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=new URL(`vendor/${file}`,assetBase).href;
        script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('PDF 모듈을 불러오지 못했습니다. 다시 시도해 주세요.'));};
        document.head.append(script);
      });
    }
    const source=document.querySelector('.paper-stack');
    if (!source) throw new Error('미리보기를 먼저 생성해 주세요.');
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-20000px;top:0;width:210mm;pointer-events:none';
    host.setAttribute('aria-hidden','true');
    const stack=source.cloneNode(true);
    stack.style.transform='none';
    stack.querySelectorAll('.no-print').forEach(el=>el.remove());
    // Materialize the two CSS-generated tag separators so they are real text.
    stack.querySelectorAll('.template-ats .skills span:not(:last-child),.template-minimal .skills span:not(:last-child)').forEach(el=>{
      el.append(document.createTextNode(el.closest('.template-ats')?',':' ·'));
      el.classList.add('pdf-separator');
    });
    const style=document.createElement('style');
    style.textContent='.pdf-separator::after{content:none!important}';
    host.append(style,stack);document.body.append(host);
    try {
      await Promise.all([...stack.querySelectorAll('img')].map(img=>img.decode()));
      const data=await createPDF(stack,title);
      const url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download=`${title.replace(/[\\/:*?"<>|]/g,'_')}_resume.pdf`;
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    } finally {host.remove();}
  };
})();
