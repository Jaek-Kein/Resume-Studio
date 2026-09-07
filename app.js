(() => {
  const STORAGE_KEY = 'resume-studio-v3';
  const LEGACY_KEY = 'resume-studio-v2';
  const VERSION = 3;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = x => JSON.parse(JSON.stringify(x));
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = v => /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const lines = t => { const ls = String(t || '').split('\n').map(s => s.trim()).filter(Boolean); return ls.length ? `<ul>${ls.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; };
  const link = v => v ? `<a href="${esc(safeUrl(v))}" target="_blank" rel="noreferrer">${esc(v.replace(/^https?:\/\//,''))}</a>` : '';

  const templateLabels = { korean:'한국 표준형', ats:'ATS 단일컬럼', minimal:'미니멀', modern:'모던', compact:'컴팩트', europass:'Europass형' };
  const fontPresets = {
    system:{label:'시스템 Sans', stack:'Inter, Pretendard, "Noto Sans KR", system-ui, sans-serif'},
    pretendard:{label:'Pretendard', stack:'Pretendard, "Noto Sans KR", sans-serif', url:'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'},
    notoSans:{label:'Noto Sans KR', stack:'"Noto Sans KR", sans-serif', url:'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap'},
    notoSerif:{label:'Noto Serif KR', stack:'"Noto Serif KR", serif', url:'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;500;600;700&display=swap'},
    ibmPlex:{label:'IBM Plex Sans KR', stack:'"IBM Plex Sans KR", sans-serif', url:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap'},
    nanumGothic:{label:'Nanum Gothic', stack:'"Nanum Gothic", sans-serif', url:'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap'},
    nanumMyeongjo:{label:'Nanum Myeongjo', stack:'"Nanum Myeongjo", serif', url:'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap'},
    inter:{label:'Inter', stack:'Inter, sans-serif', url:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'},
    serif:{label:'기본 Serif', stack:'Georgia, "Noto Serif KR", serif'},
    mono:{label:'Monospace', stack:'"SFMono-Regular", Consolas, monospace'},
    custom:{label:'사용자 웹폰트', stack:'var(--custom-font), sans-serif'}
  };

  const sectionDefs = {
    objective:{label:'직무 목표', en:'Career Objective', kind:'text', path:'objective'},
    summary:{label:'자기소개', en:'Profile', kind:'text', path:'summary'},
    core:{label:'핵심 역량', en:'Core Competencies', kind:'tags', path:'coreCompetencies'},
    experience:{label:'경력', en:'Experience', kind:'collection', key:'experiences', type:'career'},
    internships:{label:'인턴', en:'Internships', kind:'collection', key:'internships', type:'career'},
    freelance:{label:'프리랜스', en:'Freelance', kind:'collection', key:'freelance', type:'career'},
    projects:{label:'프로젝트', en:'Projects', kind:'collection', key:'projects', type:'project'},
    education:{label:'학력', en:'Education', kind:'collection', key:'educations', type:'education'},
    skills:{label:'기술', en:'Skills', kind:'tags', path:'skills'},
    certificates:{label:'자격·인증', en:'Certifications', kind:'collection', key:'certificates', type:'certificate'},
    languages:{label:'어학', en:'Languages', kind:'collection', key:'languages', type:'language'},
    military:{label:'병역', en:'Military Service', kind:'single', type:'military'},
    koreanSpecial:{label:'보훈·장애·취업보호', en:'Additional Eligibility', kind:'single', type:'koreanSpecial'},
    awards:{label:'수상', en:'Awards', kind:'collection', key:'awards', type:'simple'},
    activities:{label:'대외활동·동아리', en:'Activities', kind:'collection', key:'activities', type:'simple'},
    volunteering:{label:'봉사활동', en:'Volunteering', kind:'collection', key:'volunteering', type:'simple'},
    training:{label:'교육·부트캠프', en:'Training', kind:'collection', key:'training', type:'simple'},
    research:{label:'연구·논문', en:'Research & Publications', kind:'collection', key:'research', type:'research'},
    patents:{label:'특허', en:'Patents', kind:'collection', key:'patents', type:'research'},
    opensource:{label:'오픈소스', en:'Open Source', kind:'collection', key:'opensource', type:'project'},
    overseas:{label:'해외 경험', en:'International Experience', kind:'collection', key:'overseas', type:'simple'},
    references:{label:'추천인', en:'References', kind:'collection', key:'references', type:'reference'},
    interests:{label:'취미·관심사', en:'Interests', kind:'tags', path:'interests'},
    custom:{label:'사용자 정의', en:'Custom', kind:'custom'}
  };
  const defaultOrder = Object.keys(sectionDefs);

  const emptyCollections = {
    experiences:[], internships:[], freelance:[], projects:[], educations:[], certificates:[], languages:[], awards:[], activities:[], volunteering:[], training:[], research:[], patents:[], opensource:[], overseas:[], references:[], customSections:[]
  };
  const blankResume = {
    name:'', englishName:'', title:'', email:'', phone:'', address:'', birth:'', gender:'', nationality:'', website:'', github:'', linkedin:'', photo:'',
    objective:'', summary:'', coreCompetencies:'', skills:'', interests:'',
    military:{status:'', branch:'', rank:'', specialty:'', start:'', end:'', dischargeReason:''},
    koreanSpecial:{veteran:'', disability:'', employmentProtection:'', driverLicense:'', travelRestriction:'', note:''},
    ...clone(emptyCollections)
  };
  const sampleResume = {
    ...clone(blankResume), name:'홍길동', englishName:'Gildong Hong', title:'Frontend Developer', email:'hello@example.com', phone:'010-1234-5678', address:'서울특별시', website:'portfolio.example.com', github:'github.com/example',
    objective:'사용자 경험과 제품 완성도를 함께 높이는 프론트엔드 개발자로 성장하고자 합니다.',
    summary:'React와 TypeScript를 중심으로 제품을 설계하고, 재사용 가능한 UI 구조와 안정적인 배포 흐름을 만드는 데 강점이 있습니다.',
    coreCompetencies:'프론트엔드 아키텍처, UI/UX 구현, 성능 최적화, 협업', skills:'React, TypeScript, Next.js, JavaScript, HTML/CSS, Zustand, Git, Figma', interests:'오픈소스, 사진, 음악',
    military:{status:'군필', branch:'육군', rank:'병장', specialty:'', start:'2020.01', end:'2021.07', dischargeReason:'만기전역'},
    experiences:[{id:uid(),company:'Example Studio',role:'Frontend Developer',location:'서울',start:'2024.03',end:'현재',description:'React와 TypeScript 기반 서비스 기능 개발\n공통 컴포넌트 체계를 구축하여 중복 UI 코드 감소\n웹 성능 지표 개선 및 배포 프로세스 정리'}],
    projects:[{id:uid(),name:'Resume Studio',role:'Frontend / Product',start:'2026.08',end:'2026.09',link:'github.com/example/resume-builder',description:'선택형 섹션 기반 이력서 편집기 구현\nA4 PDF 출력 및 로컬 저장 기능 구현'}],
    educations:[{id:uid(),school:'OO대학교',degree:'학사',major:'컴퓨터공학과',location:'서울',start:'2020.03',end:'2024.02',note:'GPA 4.1 / 4.5'}],
    certificates:[{id:uid(),name:'정보처리기사',issuer:'한국산업인력공단',date:'2024.06',credential:''}],
    languages:[{id:uid(),name:'한국어',level:'원어민'},{id:uid(),name:'English',level:'Business / B2'}]
  };
  const defaultPrefs = {
    template:'korean', accent:'#1f2937', fontFamily:'pretendard', customFontName:'', customFontUrl:'', fontSize:10.3, lineHeight:1.5, margin:17, showPhoto:true,
    panelOrder:'editor-left', sectionOrder:[...defaultOrder],
    hiddenSections:defaultOrder.filter(k => !['summary','experience','projects','education','skills','certificates','languages'].includes(k))
  };

  function normalizeState(raw){
    if(!raw) return {version:VERSION,resume:clone(sampleResume),preferences:clone(defaultPrefs)};
    const r = {...clone(blankResume), ...(raw.resume || {})};
    for(const [k,v] of Object.entries(emptyCollections)) if(!Array.isArray(r[k])) r[k]=clone(v);
    r.military = {...blankResume.military, ...(r.military||{})};
    r.koreanSpecial = {...blankResume.koreanSpecial, ...(r.koreanSpecial||{})};
    const p = {...clone(defaultPrefs), ...(raw.preferences || {})};
    if(raw.version===2){
      p.sectionOrder=[...new Set([...(raw.preferences?.sectionOrder||[]), ...defaultOrder])];
      p.hiddenSections=[...new Set([...(raw.preferences?.hiddenSections||[]), ...defaultPrefs.hiddenSections.filter(k=>!raw.preferences?.sectionOrder?.includes(k))])];
    } else {
      p.sectionOrder=[...new Set([...(p.sectionOrder||[]), ...defaultOrder])];
      p.hiddenSections=(p.hiddenSections||[]).filter(k=>sectionDefs[k]);
    }
    return {version:VERSION,resume:r,preferences:p};
  }
  function load(){
    try { const x=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(x) return normalizeState(x); } catch{}
    try { const x=JSON.parse(localStorage.getItem(LEGACY_KEY)); if(x) return normalizeState(x); } catch{}
    return normalizeState(null);
  }

  let state=load(), tab='content', dragKey=null, saveTimer=null;
  const history = createEditHistory(state);
  function updateHistoryButtons(){
    document.querySelectorAll('[data-action="undo"]').forEach(b=>b.disabled=!history.canUndo);
    document.querySelectorAll('[data-action="redo"]').forEach(b=>b.disabled=!history.canRedo);
  }
  function restoreHistory(direction){
    const active=document.activeElement, path=active?.dataset.path;
    const selection=path ? [active.selectionStart,active.selectionEnd] : null;
    const restored=history[direction]();
    if(!restored)return;
    state=restored;
    scheduleSave(false);
    render(true);
    if(path){
      const input=Array.from(app.querySelectorAll('[data-path]')).find(el=>el.dataset.path===path);
      input?.focus({preventScroll:true});
      if(input && selection[0]!==null)try{input.setSelectionRange(...selection);}catch{}
    }
  }
  document.addEventListener('keydown',event=>{
    if(event.isComposing || event.altKey || !(event.ctrlKey||event.metaKey))return;
    const key=event.key.toLowerCase();
    if(key!=='z' && key!=='y')return;
    event.preventDefault();
    restoreHistory(key==='y'||event.shiftKey?'redo':'undo');
  });
  const app=document.querySelector('#app');
  const field=(label,path,value,type='text',placeholder='')=>`<label class="field"><span>${label}</span><input data-path="${path}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
  const area=(label,path,value,rows=4)=>`<label class="field"><span>${label}</span><textarea data-path="${path}" rows="${rows}">${esc(value)}</textarea></label>`;
  const select=(label,path,value,options)=>`<label class="field"><span>${label}</span><select data-path="${path}">${options.map(o=>`<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o||'선택 안 함')}</option>`).join('')}</select></label>`;
  const repeat=(title,key,i,body)=>`<div class="repeat-card"><div class="section-row"><b>${title}</b><button class="danger" data-action="remove" data-key="${key}" data-index="${i}">삭제</button></div>${body}</div>`;
  const sectionHead=(k)=>`<h2 class="resume-section-title">${state.preferences.template==='korean'?sectionDefs[k].label:sectionDefs[k].en}${state.preferences.template==='modern'?'<span></span>':''}</h2>`;

  function getPath(path){ return path.split('.').reduce((o,k)=>o?.[/^\d+$/.test(k)?Number(k):k],state); }
  function setPath(path,value){ const p=path.split('.'); let o=state; for(let i=0;i<p.length-1;i++){const k=/^\d+$/.test(p[i])?Number(p[i]):p[i];o=o[k];} const last=/^\d+$/.test(p.at(-1))?Number(p.at(-1)):p.at(-1);o[last]=value; scheduleSave(path); if(path.includes('font')) ensureFont(); renderPreview(); }
  function scheduleSave(group=null){ if(group!==false)history.record(state,group);updateHistoryButtons();const s=document.querySelector('.save-status'); if(s)s.textContent='저장 중…'; clearTimeout(saveTimer); saveTimer=setTimeout(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));const e=document.querySelector('.save-status');if(e)e.textContent='자동 저장됨';},180); }
  function fontStack(){ const p=state.preferences; if(p.fontFamily==='custom') return `"${(p.customFontName||'Custom Resume Font').replace(/["']/g,'')}", sans-serif`; return fontPresets[p.fontFamily]?.stack || fontPresets.system.stack; }
  function ensureFont(){
    const p=state.preferences, preset=fontPresets[p.fontFamily]; let href=preset?.url;
    if(p.fontFamily==='custom') href=p.customFontUrl;
    const id='resume-webfont'; let el=document.getElementById(id);
    if(!href){el?.remove();return;}
    if(!el){el=document.createElement('link');el.id=id;el.rel='stylesheet';document.head.appendChild(el);} el.href=href;
  }

  function collectionEntry(type,x){
    if(type==='career') return `<div class="entry"><div class="entry-head"><div><strong>${esc(x.role||'직무')}</strong><span>${esc([x.company,x.location].filter(Boolean).join(' · '))}</span></div><time>${esc([x.start,x.end].filter(Boolean).join(' – '))}</time></div>${lines(x.description)}</div>`;
    if(type==='project') return `<div class="entry"><div class="entry-head"><div><strong>${esc(x.name||'프로젝트명')}</strong><span>${esc(x.role||'')}</span></div><time>${esc([x.start,x.end].filter(Boolean).join(' – '))}</time></div>${x.link?`<div class="entry-link">${link(x.link)}</div>`:''}${lines(x.description)}</div>`;
    if(type==='education') return `<div class="entry compact"><div class="entry-head"><div><strong>${esc(x.school||'학교명')}</strong><span>${esc([x.degree,x.major,x.location].filter(Boolean).join(' · '))}</span></div><time>${esc([x.start,x.end].filter(Boolean).join(' – '))}</time></div>${x.note?`<p class="entry-note">${esc(x.note)}</p>`:''}</div>`;
    if(type==='certificate') return `<div class="row-entry"><strong>${esc(x.name)}</strong><span>${esc([x.issuer,x.credential].filter(Boolean).join(' · '))}</span><time>${esc(x.date)}</time></div>`;
    if(type==='language') return `<div class="row-entry"><strong>${esc(x.name)}</strong><span>${esc(x.level)}</span><time>${esc(x.score||'')}</time></div>`;
    if(type==='research') return `<div class="entry compact"><div class="entry-head"><div><strong>${esc(x.name)}</strong><span>${esc(x.issuer||'')}</span></div><time>${esc(x.date||'')}</time></div>${x.link?`<div class="entry-link">${link(x.link)}</div>`:''}${x.description?`<p class="entry-note">${esc(x.description)}</p>`:''}</div>`;
    if(type==='reference') return `<div class="row-entry"><strong>${esc(x.name)}</strong><span>${esc([x.org,x.relation,x.contact].filter(Boolean).join(' · '))}</span><time></time></div>`;
    return `<div class="entry compact"><div class="entry-head"><div><strong>${esc(x.name)}</strong><span>${esc(x.issuer||x.org||'')}</span></div><time>${esc(x.date||[x.start,x.end].filter(Boolean).join(' – '))}</time></div>${x.description?`<p class="entry-note">${esc(x.description)}</p>`:''}</div>`;
  }

  function renderSection(k){
    const d=state.resume, def=sectionDefs[k]; if(!def)return '';
    if(def.kind==='text'){const v=d[def.path];return v?`<section>${sectionHead(k)}<p class="summary">${esc(v)}</p></section>`:'';}
    if(def.kind==='tags'){const a=String(d[def.path]||'').split(',').map(x=>x.trim()).filter(Boolean);return a.length?`<section>${sectionHead(k)}<div class="skills">${a.map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`:'';}
    if(def.kind==='collection'){const a=d[def.key]||[];return a.length?`<section>${sectionHead(k)}${a.map(x=>collectionEntry(def.type,x)).join('')}</section>`:'';}
    if(k==='military'){const m=d.military; const vals=[m.status,m.branch,m.rank,m.specialty,[m.start,m.end].filter(Boolean).join(' – '),m.dischargeReason].filter(Boolean);return vals.length?`<section>${sectionHead(k)}<div class="kv-grid">${[['복무 상태',m.status],['군별',m.branch],['계급',m.rank],['병과/특기',m.specialty],['복무기간',[m.start,m.end].filter(Boolean).join(' – ')],['전역 사유',m.dischargeReason]].filter(x=>x[1]).map(([a,b])=>`<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></section>`:'';}
    if(k==='koreanSpecial'){const m=d.koreanSpecial;const rows=[['보훈',m.veteran],['장애',m.disability],['취업보호',m.employmentProtection],['운전면허',m.driverLicense],['해외여행 결격사유',m.travelRestriction],['기타',m.note]].filter(x=>x[1]);return rows.length?`<section>${sectionHead(k)}<div class="kv-grid">${rows.map(([a,b])=>`<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></section>`:'';}
    if(k==='custom'){const a=d.customSections||[];return a.map(s=>s.enabled===false?'':`<section><h2 class="resume-section-title">${esc(s.title||'사용자 정의')}</h2><p class="summary">${esc(s.content||'')}</p></section>`).join('');}
    return '';
  }

  function previewHTML(){
    const d=state.resume,p=state.preferences, contacts=[d.email,d.phone,d.address].filter(Boolean);
    return `<div class="paper-stack" id="resume-print-area"><article class="resume-page template-${p.template}" style="--accent:${esc(p.accent)};--resume-font-size:${p.fontSize}pt;--resume-line-height:${p.lineHeight};--resume-margin:${p.margin}mm;--resume-font:${esc(fontStack())}"><header class="resume-header">${p.showPhoto&&d.photo&&p.template!=='ats'?`<img class="resume-photo" src="${d.photo}" alt="증명사진">`:''}<div class="identity"><h1>${esc(d.name||'이름')}</h1>${d.englishName?`<p class="english-name">${esc(d.englishName)}</p>`:''}${d.title?`<p class="headline">${esc(d.title)}</p>`:''}</div><div class="contact">${contacts.map(x=>`<span>${esc(x)}</span>`).join('')}${d.birth&&p.template==='korean'?`<span>${esc(d.birth)}</span>`:''}${link(d.website)}${link(d.github)}${link(d.linkedin)}</div></header><div class="resume-body">${p.sectionOrder.filter(k=>!p.hiddenSections.includes(k)).map(renderSection).join('')}</div></article></div>`;
  }
  function renderPreview(){const box=document.querySelector('.preview-box');if(box)box.innerHTML=previewHTML();window.refreshPageGuides();}

  function formForCollection(key,type){ const d=state.resume, a=d[key]||[], label=Object.values(sectionDefs).find(x=>x.key===key)?.label||key; return `<div class="form-section"><div class="section-row"><h3>${label}</h3><button class="ghost" data-action="add" data-key="${key}">+ 추가</button></div>${a.length?'':'<p class="empty-hint">필요한 경우 항목을 추가해 주세요.</p>'}${a.map((x,i)=>repeat(`${label} ${i+1}`,key,i,collectionFields(key,type,x,i))).join('')}</div>`; }
  function collectionFields(key,type,x,i){
    const b=`resume.${key}.${i}.`;
    if(type==='career')return `<div class="grid2">${field('회사/기관',b+'company',x.company)}${field('직무/역할',b+'role',x.role)}</div><div class="grid3">${field('지역',b+'location',x.location)}${field('시작',b+'start',x.start)}${field('종료',b+'end',x.end)}</div>${area('주요 업무 / 성과 (한 줄당 한 항목)',b+'description',x.description)}`;
    if(type==='project')return `<div class="grid2">${field('명칭',b+'name',x.name)}${field('역할',b+'role',x.role)}</div><div class="grid2">${field('시작',b+'start',x.start)}${field('종료',b+'end',x.end)}</div>${field('링크',b+'link',x.link)}${area('설명 / 성과',b+'description',x.description)}`;
    if(type==='education')return `<div class="grid2">${field('학교',b+'school',x.school)}${field('전공',b+'major',x.major)}</div><div class="grid3">${field('학위',b+'degree',x.degree)}${field('입학',b+'start',x.start)}${field('졸업',b+'end',x.end)}</div><div class="grid2">${field('지역',b+'location',x.location)}${field('비고 / GPA',b+'note',x.note)}</div>`;
    if(type==='certificate')return `${field('자격/인증명',b+'name',x.name)}<div class="grid2">${field('발급기관',b+'issuer',x.issuer)}${field('취득일',b+'date',x.date)}</div>${field('자격번호 / Credential',b+'credential',x.credential)}`;
    if(type==='language')return `<div class="grid3">${field('언어',b+'name',x.name)}${field('수준',b+'level',x.level)}${field('시험/점수',b+'score',x.score||'')}</div>`;
    if(type==='research')return `<div class="grid2">${field('명칭',b+'name',x.name)}${field('기관/저널',b+'issuer',x.issuer)}</div><div class="grid2">${field('일자',b+'date',x.date)}${field('링크',b+'link',x.link)}</div>${area('설명',b+'description',x.description,3)}`;
    if(type==='reference')return `<div class="grid2">${field('성명',b+'name',x.name)}${field('기관/직책',b+'org',x.org)}</div><div class="grid2">${field('관계',b+'relation',x.relation)}${field('연락처',b+'contact',x.contact)}</div>`;
    return `<div class="grid2">${field('명칭',b+'name',x.name)}${field('기관',b+'issuer',x.issuer)}</div><div class="grid2">${field('기간/일자',b+'date',x.date)}${field('지역',b+'location',x.location||'')}</div>${area('설명',b+'description',x.description,3)}`;
  }

  function contentHTML(){ const d=state.resume; const visible=k=>!state.preferences.hiddenSections.includes(k); let html=`<div class="form-section"><h3>기본 정보</h3><div class="photo-row"><div class="photo-thumb">${d.photo?`<img src="${d.photo}">`:'<span>사진</span>'}</div><div><label class="upload-btn">사진 선택<input id="photoInput" type="file" accept="image/*"></label>${d.photo?'<button class="text-btn" data-action="remove-photo">사진 제거</button>':''}<p class="field-help">JPG/PNG, 3MB 이하. ATS형에서는 자동 숨김됩니다.</p></div></div><div class="grid2">${field('이름','resume.name',d.name)}${field('영문 이름','resume.englishName',d.englishName)}</div><div class="grid2">${field('직무 / 헤드라인','resume.title',d.title)}${field('국적 (선택)','resume.nationality',d.nationality)}</div><div class="grid2">${field('이메일','resume.email',d.email,'email')}${field('연락처','resume.phone',d.phone)}</div><div class="grid3">${field('주소','resume.address',d.address)}${field('생년월일 (선택)','resume.birth',d.birth)}${field('성별 (선택)','resume.gender',d.gender)}</div>${field('포트폴리오','resume.website',d.website)}<div class="grid2">${field('GitHub','resume.github',d.github)}${field('LinkedIn','resume.linkedin',d.linkedin)}</div></div>`;
    if(visible('objective'))html+=`<div class="form-section"><h3>직무 목표</h3>${area('Career Objective','resume.objective',d.objective,4)}</div>`;
    if(visible('summary'))html+=`<div class="form-section"><h3>자기소개</h3>${area('Professional Summary','resume.summary',d.summary,5)}</div>`;
    if(visible('core'))html+=`<div class="form-section"><h3>핵심 역량</h3>${area('쉼표(,)로 구분','resume.coreCompetencies',d.coreCompetencies,3)}</div>`;
    for(const [k,def] of Object.entries(sectionDefs)){if(!visible(k)||!def.key)continue;html+=formForCollection(def.key,def.type);}
    if(visible('skills'))html+=`<div class="form-section"><h3>기술</h3>${area('쉼표(,)로 구분','resume.skills',d.skills,3)}</div>`;
    if(visible('military'))html+=`<div class="form-section"><h3>병역 사항</h3><div class="grid3">${select('복무 상태','resume.military.status',d.military.status,['','군필','미필','면제','복무 중','해당 없음'])}${field('군별','resume.military.branch',d.military.branch,'text','육군 / 해군 / 공군 등')}${field('계급','resume.military.rank',d.military.rank)}</div><div class="grid3">${field('병과 / 특기','resume.military.specialty',d.military.specialty)}${field('복무 시작','resume.military.start',d.military.start)}${field('복무 종료','resume.military.end',d.military.end)}</div>${field('전역 사유 / 면제 사유','resume.military.dischargeReason',d.military.dischargeReason)}</div>`;
    if(visible('koreanSpecial'))html+=`<div class="form-section"><h3>한국형 추가 사항</h3><p class="field-help">민감하거나 채용에 불필요할 수 있는 항목이므로 필요한 제출처에서만 사용하시길 권장합니다.</p><div class="grid3">${select('보훈 여부','resume.koreanSpecial.veteran',d.koreanSpecial.veteran,['','해당 없음','대상'])}${select('장애 여부','resume.koreanSpecial.disability',d.koreanSpecial.disability,['','해당 없음','대상'])}${select('취업보호 대상','resume.koreanSpecial.employmentProtection',d.koreanSpecial.employmentProtection,['','해당 없음','대상'])}</div><div class="grid2">${field('운전면허','resume.koreanSpecial.driverLicense',d.koreanSpecial.driverLicense)}${field('해외여행 결격사유','resume.koreanSpecial.travelRestriction',d.koreanSpecial.travelRestriction)}</div>${area('기타','resume.koreanSpecial.note',d.koreanSpecial.note,2)}</div>`;
    if(visible('interests'))html+=`<div class="form-section"><h3>취미·관심사</h3>${area('쉼표(,)로 구분','resume.interests',d.interests,2)}</div>`;
    if(visible('custom'))html+=`<div class="form-section"><div class="section-row"><h3>사용자 정의 섹션</h3><button class="ghost" data-action="add" data-key="customSections">+ 추가</button></div>${d.customSections.map((x,i)=>repeat(`사용자 정의 ${i+1}`,'customSections',i,`${field('섹션 제목',`resume.customSections.${i}.title`,x.title)}${area('내용',`resume.customSections.${i}.content`,x.content,5)}<label class="toggle-row"><span>표시</span><input data-path="resume.customSections.${i}.enabled" data-check type="checkbox" ${x.enabled!==false?'checked':''}></label>`)).join('')}</div>`;
    return html;
  }

  function designHTML(){const p=state.preferences;return `<div class="form-section design-panel"><h3>템플릿</h3><div class="template-grid">${Object.entries(templateLabels).map(([k,v])=>`<button class="template-card ${p.template===k?'active':''}" data-action="template" data-value="${k}"><span class="template-mini mini-${k}"></span><b>${v}</b></button>`).join('')}</div><h3>웹폰트</h3><label class="field"><span>글꼴</span><select data-path="preferences.fontFamily">${Object.entries(fontPresets).map(([k,v])=>`<option value="${k}" ${p.fontFamily===k?'selected':''} style="font-family:${esc(v.stack)}">${v.label} — 홍길동 Resume</option>`).join('')}</select></label>${p.fontFamily==='custom'?`<div class="custom-font-box">${field('font-family 이름','preferences.customFontName',p.customFontName,'text','My Resume Font')}${field('웹폰트 CSS URL','preferences.customFontUrl',p.customFontUrl,'url','https://.../font.css')}<p class="field-help">해당 CSS가 지정한 font-family 이름을 정확히 입력해 주세요.</p></div>`:''}<p class="field-help">웹폰트는 인터넷 연결 시 로드됩니다. PDF 출력 버튼은 폰트 로딩 완료 후 인쇄창을 엽니다.</p><h3>문서 스타일</h3><div class="range-row"><span>글자 크기</span><input data-path="preferences.fontSize" data-number type="range" min="8.5" max="12" step="0.1" value="${p.fontSize}"><b>${Number(p.fontSize).toFixed(1)}pt</b></div><div class="range-row"><span>줄 간격</span><input data-path="preferences.lineHeight" data-number type="range" min="1.25" max="1.8" step="0.05" value="${p.lineHeight}"><b>${Number(p.lineHeight).toFixed(2)}</b></div><div class="range-row"><span>A4 여백</span><input data-path="preferences.margin" data-number type="range" min="10" max="24" step="1" value="${p.margin}"><b>${p.margin}mm</b></div><label class="field"><span>포인트 색상</span><div class="color-row"><input data-path="preferences.accent" type="color" value="${p.accent}"><input data-path="preferences.accent" value="${p.accent}"></div></label><label class="toggle-row"><span>증명사진 표시</span><input data-path="preferences.showPhoto" data-check type="checkbox" ${p.showPhoto?'checked':''}></label></div>`;}
  function sectionsHTML(){const p=state.preferences;return `<div class="form-section"><h3>섹션 선택 · 순서</h3><p class="field-help">필요한 항목만 켜고 드래그해서 출력 순서를 바꿀 수 있습니다. 기본 정보는 항상 표시됩니다.</p><div class="section-actions"><button class="ghost" data-action="preset" data-value="developer">개발자 추천</button><button class="ghost" data-action="preset" data-value="newgrad">신입 추천</button><button class="ghost" data-action="preset" data-value="korean">한국형 전체</button><button class="ghost" data-action="preset" data-value="minimal">최소 구성</button></div><div class="section-sorter">${p.sectionOrder.map(k=>`<div class="sort-item" draggable="true" data-section="${k}"><span class="drag-handle">☰</span><b>${sectionDefs[k]?.label||k}</b><label class="mini-toggle"><input data-action="visibility" data-key="${k}" type="checkbox" ${p.hiddenSections.includes(k)?'':'checked'}><span></span></label></div>`).join('')}</div></div>`;}

  function render(preserveScroll=false){const scroll=preserveScroll?{editor:document.querySelector('.editor')?.scrollTop||0,preview:document.querySelector('.preview-wrap')?.scrollTop||0}:null,reversed=state.preferences.panelOrder==='preview-left'; app.innerHTML=`<div class="app-shell ${reversed?'panels-reversed':''}"><aside class="editor no-print"><div class="editor-top"><div><p class="eyebrow">RESUME STUDIO v3</p><h1>이력서 작성</h1><small class="save-status">자동 저장됨</small></div><div class="top-actions"><button class="ghost swap-button" data-action="swap">⇄ 좌우 반전</button><button class="primary" data-action="print">PDF 저장 / 인쇄</button></div></div><nav class="editor-tabs"><button data-tab="content" class="${tab==='content'?'active':''}">내용</button><button data-tab="design" class="${tab==='design'?'active':''}">디자인</button><button data-tab="sections" class="${tab==='sections'?'active':''}">섹션</button></nav><div class="tab-body">${tab==='content'?contentHTML():tab==='design'?designHTML():sectionsHTML()}</div><div class="utility-bar"><button class="ghost" data-action="export">JSON 내보내기</button><button class="ghost" data-action="import">JSON 불러오기</button><input id="jsonInput" hidden type="file" accept="application/json,.json"><button class="ghost" data-action="blank">전체 비우기</button><button class="ghost" data-action="sample">예시 복원</button></div><div class="footer-actions"><span>입력 데이터는 브라우저에만 저장됩니다.</span><button class="primary" data-action="print">PDF 저장 / 인쇄</button></div></aside><section class="preview-wrap"><div class="preview-toolbar no-print"><span>A4 미리보기 · 웹폰트 로딩 후 PDF 출력</span><b>${templateLabels[state.preferences.template]}</b></div><div class="preview-box">${previewHTML()}</div></section></div>`;ensureFont();bind();if(scroll){document.querySelector('.editor').scrollTop=scroll.editor;document.querySelector('.preview-wrap').scrollTop=scroll.preview;}}

  const addDefaults={
    experiences:()=>({id:uid(),company:'',role:'',location:'',start:'',end:'',description:''}), internships:()=>({id:uid(),company:'',role:'',location:'',start:'',end:'',description:''}), freelance:()=>({id:uid(),company:'',role:'',location:'',start:'',end:'',description:''}),
    projects:()=>({id:uid(),name:'',role:'',start:'',end:'',link:'',description:''}), opensource:()=>({id:uid(),name:'',role:'',start:'',end:'',link:'',description:''}),
    educations:()=>({id:uid(),school:'',degree:'',major:'',location:'',start:'',end:'',note:''}), certificates:()=>({id:uid(),name:'',issuer:'',date:'',credential:''}), languages:()=>({id:uid(),name:'',level:'',score:''}),
    awards:()=>({id:uid(),name:'',issuer:'',date:'',location:'',description:''}), activities:()=>({id:uid(),name:'',issuer:'',date:'',location:'',description:''}), volunteering:()=>({id:uid(),name:'',issuer:'',date:'',location:'',description:''}), training:()=>({id:uid(),name:'',issuer:'',date:'',location:'',description:''}), overseas:()=>({id:uid(),name:'',issuer:'',date:'',location:'',description:''}),
    research:()=>({id:uid(),name:'',issuer:'',date:'',link:'',description:''}), patents:()=>({id:uid(),name:'',issuer:'',date:'',link:'',description:''}), references:()=>({id:uid(),name:'',org:'',relation:'',contact:''}), customSections:()=>({id:uid(),title:'',content:'',enabled:true})
  };
  const presets={
    developer:['summary','core','experience','projects','opensource','education','skills','certificates','languages'],
    newgrad:['objective','summary','core','projects','education','training','activities','certificates','languages'],
    korean:['summary','experience','projects','education','skills','certificates','languages','military','koreanSpecial','awards','activities','volunteering','training','overseas'],
    minimal:['summary','experience','education','skills']
  };
  function exportJSON(){const b=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${state.resume.name||'resume'}-resume-v3.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);}
  function handleImport(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x?.resume||!x?.preferences)throw 0;state=normalizeState(x);scheduleSave();render();}catch{alert('지원하지 않는 이력서 JSON 파일입니다.');}};r.readAsText(f);}
  async function printResume(){document.title=`${state.resume.name||'resume'}_resume`;ensureFont();try{await document.fonts.ready;}catch{}window.print();}

  function bind(){
    window.refreshPageGuides();
    const bar=document.createElement('div');
    bar.className='history-actions';
    bar.innerHTML='<button class="ghost" data-action="undo" title="Ctrl/Cmd+Z">↶ 실행 취소</button><button class="ghost" data-action="redo" title="Ctrl/Cmd+Shift+Z 또는 Ctrl+Y">↷ 다시 실행</button><span>최근 60단계 · 새로고침 시 초기화</span>';
    app.querySelector('.editor-tabs').after(bar);
    updateHistoryButtons();
    app.querySelectorAll('[data-path]').forEach(el=>el.addEventListener('input',e=>{let v=e.target.dataset.check!==undefined?e.target.checked:e.target.dataset.number!==undefined?Number(e.target.value):e.target.value;setPath(e.target.dataset.path,v);if(e.target.dataset.path==='preferences.fontFamily'){render(true);return;}if(e.target.type==='range'){const b=e.target.nextElementSibling;if(b)b.textContent=e.target.dataset.path.endsWith('fontSize')?`${Number(v).toFixed(1)}pt`:e.target.dataset.path.endsWith('lineHeight')?Number(v).toFixed(2):`${v}mm`;}}));
    app.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
    app.querySelectorAll('[data-action]').forEach(b=>{const a=b.dataset.action;if(a==='visibility')return;b.addEventListener('click',async()=>{
      if(a==='print')await printResume();
      if(a==='undo'||a==='redo')restoreHistory(a);
      if(a==='swap'){state.preferences.panelOrder=state.preferences.panelOrder==='editor-left'?'preview-left':'editor-left';scheduleSave();render();}
      if(a==='add'){state.resume[b.dataset.key].push(addDefaults[b.dataset.key]());scheduleSave();render(true);}
      if(a==='remove'){state.resume[b.dataset.key].splice(Number(b.dataset.index),1);scheduleSave();render(true);}
      if(a==='template'){state.preferences.template=b.dataset.value;scheduleSave();render(true);}
      if(a==='remove-photo'){state.resume.photo='';scheduleSave();render(true);}
      if(a==='preset'){const on=presets[b.dataset.value]||[];state.preferences.hiddenSections=defaultOrder.filter(k=>!on.includes(k));scheduleSave();render(true);}
      if(a==='export')exportJSON(); if(a==='import')document.querySelector('#jsonInput').click();
      if(a==='blank'&&confirm('모든 입력 내용을 비우시겠습니까?')){state={version:VERSION,resume:clone(blankResume),preferences:clone(defaultPrefs)};scheduleSave();render();}
      if(a==='sample'&&confirm('예시 데이터로 초기화하시겠습니까?')){state={version:VERSION,resume:clone(sampleResume),preferences:clone(defaultPrefs)};scheduleSave();render();}
    });});
    const photo=document.querySelector('#photoInput');if(photo)photo.onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>3*1024*1024){alert('사진은 3MB 이하 파일을 사용해 주세요.');return;}const r=new FileReader();r.onload=()=>{state.resume.photo=r.result;scheduleSave();render(true);};r.readAsDataURL(f);};
    const ji=document.querySelector('#jsonInput');if(ji)ji.onchange=e=>handleImport(e.target.files?.[0]);
    app.querySelectorAll('[data-action=visibility]').forEach(x=>x.onchange=e=>{const k=x.dataset.key;if(e.target.checked)state.preferences.hiddenSections=state.preferences.hiddenSections.filter(v=>v!==k);else if(!state.preferences.hiddenSections.includes(k))state.preferences.hiddenSections.push(k);scheduleSave();render(true);});
    app.querySelectorAll('.sort-item').forEach(x=>{x.ondragstart=()=>{dragKey=x.dataset.section;x.classList.add('dragging');};x.ondragend=()=>{dragKey=null;x.classList.remove('dragging');};x.ondragover=e=>e.preventDefault();x.ondrop=e=>{e.preventDefault();const to=x.dataset.section;if(!dragKey||dragKey===to)return;const a=state.preferences.sectionOrder,from=a.indexOf(dragKey),target=a.indexOf(to);a.splice(from,1);a.splice(target,0,dragKey);scheduleSave();render(true);};});
  }
  render();
})();
