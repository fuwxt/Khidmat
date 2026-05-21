'use strict';
// ═══ STATE ═══
let GKEY=localStorage.getItem('khidmat_key')||'';
let intent={};
let providers=[];
let allProviders=[];
let selProvider=null;
let selSlot='9:00 AM';
let selectedCity=localStorage.getItem('khidmat_city')||'';
let otpTimer=null;
let citySearchTimer=null;
let highlightedCityIdx=-1;
let bookings=JSON.parse(localStorage.getItem('khidmat_bookings')||'[]');
let userProfile=JSON.parse(localStorage.getItem('khidmat_profile')||'{}');

// ═══ INIT ═══
(function boot(){
  const savedTheme=localStorage.getItem('khidmat_theme');
  const savedLang=localStorage.getItem('khidmat_lang');
  if(savedTheme) document.documentElement.setAttribute('data-theme',savedTheme);
  if(savedLang) document.documentElement.setAttribute('data-lang',savedLang);
  if(GKEY) document.getElementById('api-key-inp').value=GKEY;
  if(selectedCity) document.getElementById('city-inp').value=selectedCity;
  if(userProfile.name) document.getElementById('prof-name').textContent=userProfile.name;
  if(userProfile.phone) document.getElementById('prof-phone').textContent='+92 '+userProfile.phone;
  renderBookingsList();
})();

// ═══ THEME / LANG ═══
function toggleTheme(){
  const h=document.documentElement;
  const next=h.getAttribute('data-theme')==='dark'?'light':'dark';
  h.setAttribute('data-theme',next);
  localStorage.setItem('khidmat_theme',next);
}
function toggleLang(){
  const h=document.documentElement;
  const next=h.getAttribute('data-lang')==='en'?'ur':'en';
  h.setAttribute('data-lang',next);
  localStorage.setItem('khidmat_lang',next);
  const ta=document.getElementById('req-inp');
  if(ta) ta.placeholder=next==='ur'?'AC ٹیکنیشن، پلمبر یا الیکٹریشن چاہیے...':'Mujhe AC technician, plumber ya electrician chahiye...';
}

// ═══ SCREEN MANAGER ═══
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','anim-in'));
  const t=document.getElementById('s-'+id);
  if(t){t.classList.add('active','anim-in');window.scrollTo(0,0);}
  if(id==='otp') startOtpTimer();
  if(id==='bookings') renderBookingsList();
}
function eg(txt){
  const ta=document.getElementById('req-inp');
  ta.value=txt;
  show('home');
  setTimeout(()=>ta.scrollIntoView({behavior:'smooth',block:'center'}),100);
}

// ═══ AUTH ═══
function initApp(){
  const k=document.getElementById('api-key-inp').value.trim();
  if(!k||k.length<20){
    const inp=document.getElementById('api-key-inp');
    inp.classList.add('err');setTimeout(()=>inp.classList.remove('err'),2000);return;
  }
  GKEY=k;
  localStorage.setItem('khidmat_key',k);
  show('home');
}
function doLogin(){
  const ph=document.getElementById('login-phone').value.trim();
  const pw=document.getElementById('login-pass').value;
  if(!ph||!pw){showAuthErr('login-err','login-err-t','Please fill all fields. / تمام خانے بھریں۔');return;}
  if(ph.length<10){showAuthErr('login-err','login-err-t','Invalid phone number. / غلط نمبر۔');return;}
  if(pw.length<8){showAuthErr('login-err','login-err-t','Password must be 8+ characters. / کم از کم 8 حروف۔');return;}
  userProfile={name:'User',phone:ph};
  localStorage.setItem('khidmat_profile',JSON.stringify(userProfile));
  document.getElementById('prof-name').textContent=userProfile.name;
  document.getElementById('prof-phone').textContent='+92 '+ph;
  show('home');
}
function doSignup(){
  const name=document.getElementById('signup-name').value.trim();
  const ph=document.getElementById('signup-phone').value.trim();
  const pw=document.getElementById('signup-pass').value;
  const box=document.getElementById('signup-ok');
  const span=box.querySelector('span');
  const showSignupMsg=(msg,kind)=>{
    // Reuse the existing signup-ok element for both success and error states
    // by toggling .ok / .err. The inner <svg> stays intact; only the <span>
    // text is rewritten.
    box.classList.remove('hidden','ok','err');
    box.classList.add(kind);
    if(span) span.textContent=msg;
    if(kind==='err') setTimeout(()=>box.classList.add('hidden'),4000);
  };
  // Surface validation errors instead of silently returning.
  if(!name||!ph||!pw){showSignupMsg('Please fill all fields. / تمام خانے بھریں۔','err');return;}
  if(ph.length<10){showSignupMsg('Invalid phone number. / غلط نمبر۔','err');return;}
  if(pw.length<8){showSignupMsg('Password must be 8+ characters. / کم از کم 8 حروف۔','err');return;}
  userProfile={name,phone:ph};
  localStorage.setItem('khidmat_profile',JSON.stringify(userProfile));
  document.getElementById('prof-name').textContent=name;
  document.getElementById('prof-phone').textContent='+92 '+ph;
  showSignupMsg('Account created! Sending OTP...','ok');
  setTimeout(()=>show('otp'),1500);
}
function logout(){
  // Clear user-specific session state. Keep theme/language preferences and
  // the API key (the API key is the developer's, not auth credentials).
  localStorage.removeItem('khidmat_profile');
  userProfile={};
  // Reset profile UI so a stale name/phone doesn't linger if the next user
  // signs in on the same device.
  const pn=document.getElementById('prof-name');if(pn)pn.textContent='User';
  const pp=document.getElementById('prof-phone');if(pp)pp.textContent='+92 3XX XXXXXXX';
  // Send to login (not setup) so existing API key isn't re-prompted.
  show('login');
}
function showAuthErr(cid,tid,msg){
  const el=document.getElementById(cid);const t=document.getElementById(tid);
  if(t)t.textContent=msg;el.classList.remove('hidden');
  setTimeout(()=>el.classList.add('hidden'),4000);
}


// ═══ OTP ═══
function otpInput(cell,i){
  const cs=document.querySelectorAll('.otp-c');
  cell.value=cell.value.replace(/\D/g,'');
  if(cell.value){cell.classList.add('filled');if(i<5)cs[i+1].focus();}
  else cell.classList.remove('filled');
}
function otpKey(e,i){
  const cs=document.querySelectorAll('.otp-c');
  if(e.key==='Backspace'&&!cs[i].value&&i>0)cs[i-1].focus();
}
function verifyOtp(){
  const cs=document.querySelectorAll('.otp-c');
  const code=Array.from(cs).map(c=>c.value).join('');
  if(code.length<6){showOtpErr('Enter complete 6-digit code. / مکمل کوڈ درج کریں۔');return;}
  if(code==='000000'){
    showOtpErr('Incorrect code. / غلط کوڈ۔');
    cs.forEach(c=>{c.classList.add('err');setTimeout(()=>c.classList.remove('err'),600)});return;
  }
  show('home');
}
function showOtpErr(msg){
  document.getElementById('otp-err').classList.remove('hidden');
  document.getElementById('otp-err-t').textContent=msg;
  setTimeout(()=>document.getElementById('otp-err').classList.add('hidden'),4000);
}
let resendCd=30;
function startOtpTimer(){
  clearInterval(otpTimer);resendCd=30;
  const te=document.getElementById('resend-t'),tur=document.getElementById('resend-t-ur');
  const b=document.getElementById('resend-btn'),bur=document.getElementById('resend-btn-ur');
  if(b)b.disabled=true;if(bur)bur.disabled=true;
  otpTimer=setInterval(()=>{
    resendCd--;
    if(te)te.textContent=`(${resendCd}s)`;if(tur)tur.textContent=`(${resendCd}ثانیے)`;
    if(resendCd<=0){
      clearInterval(otpTimer);
      if(te)te.textContent='';if(tur)tur.textContent='';
      if(b)b.disabled=false;if(bur)bur.disabled=false;
    }
  },1000);
}
function resendOtp(){
  startOtpTimer();
  document.querySelectorAll('.otp-c').forEach(c=>{c.value='';c.classList.remove('filled','err')});
  document.querySelectorAll('.otp-c')[0].focus();
}

// ═══ PHOTO UPLOAD ═══
function handlePhotoUpload(){document.getElementById('photo-input').click();}
function handlePhoto(input){
  if(input.files&&input.files[0]){
    const ta=document.getElementById('req-inp');
    const isUr=document.documentElement.getAttribute('data-lang')==='ur';
    ta.value=(ta.value?ta.value+'\n':'')+(isUr?'[تصویر منسلک ہے] ':'[Photo attached] ');
    ta.focus();
  }
}

// ═══ GEMINI API ═══
async function gemini(sys,usr){
  const r=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GKEY}`,
    {method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({
       systemInstruction:{parts:[{text:sys}]},
       contents:[{parts:[{text:usr}]}],
       generationConfig:{temperature:0.25}
     })}
  );
  const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message||'API error');
  return d.candidates?.[0]?.content?.parts?.[0]?.text||'';
}

// ═══ CATEGORY ICONS ═══
const CAT_ICONS={
  ac_technician:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M3 7h18M9 21l3-5 3 5"/></svg>',
  plumber:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 12h-4m4 0a2 2 0 110-4 2 2 0 010 4zm-4 0a2 2 0 100-4 2 2 0 000 4"/><path d="M10 12v6a2 2 0 002 2h0a2 2 0 002-2v-6"/></svg>',
  electrician:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  tutor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  beautician:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  carpenter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M6 7V4m12 3V4M9 11v6m6-6v6M4 21h16a1 1 0 001-1V8H3v12a1 1 0 001 1z"/></svg>',
  cleaning:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18M9 21H5a2 2 0 01-2-2V9m6 12h10a2 2 0 002-2V9"/></svg>',
  painter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 4v7a5 5 0 01-10 0V4m0 0a2 2 0 00-4 0v1"/><path d="M17 21H7l2-4h6l2 4z"/></svg>',
  mechanic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M16.24 7.76a6 6 0 11-8.49 8.49"/><path d="M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
  general:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};


// ═══ PROGRESS HELPERS ═══
function prog(p){document.getElementById('p-fill').style.width=p+'%';}
function setStatus(msg){document.getElementById('p-status').innerHTML=msg;}
function showStep(i){const s=document.getElementById('step-'+i);if(s)s.classList.add('vis');const sp=document.getElementById('spinner-'+i);if(sp)sp.classList.remove('hidden');}
function doneStep(i){const sp=document.getElementById('spinner-'+i);const ck=document.getElementById('check-'+i);if(sp)sp.classList.add('hidden');if(ck){ck.classList.remove('hidden');ck.classList.add('done');}}

// ═══ MAIN SEARCH ═══
async function startSearch(){
  const raw=document.getElementById('req-inp').value.trim();
  const city=selectedCity||document.getElementById('city-inp').value.trim().split(',')[0].trim();
  if(!raw){
    const ta=document.getElementById('req-inp');
    ta.style.borderColor='var(--danger)';ta.focus();
    setTimeout(()=>ta.style.borderColor='',1600);return;
  }
  // Reset steps
  for(let i=0;i<4;i++){
    const s=document.getElementById('step-'+i),sp=document.getElementById('spinner-'+i),ck=document.getElementById('check-'+i);
    if(s)s.classList.remove('vis');if(sp)sp.classList.add('hidden');if(ck){ck.classList.add('hidden');ck.classList.remove('done');}
  }
  document.getElementById('skel-cards').style.display='none';
  prog(0);show('proc');

  try{
    // STEP 0: Parse intent
    showStep(0);
    setStatus('<span class="e-i">Understanding your request...</span><span class="u-i urdu">درخواست سمجھ رہے ہیں...</span>');
    const intentRaw=await gemini(
      'Extract service request. Return ONLY JSON: {"service_type":"string","service_cat":"ac_technician|plumber|electrician|tutor|beautician|carpenter|cleaning|painter|mechanic|general","location":"string","urgency":"low|med|high","time_preference":"string","key_requirements":["string"]} Understand Roman Urdu, Urdu, English.',
      'Request: "'+raw+'" City: "'+(city||'Pakistan')+'"'
    );
    try{intent=JSON.parse(intentRaw.replace(/```json|```/g,'').trim());}
    catch(e){intent={service_type:raw.slice(0,40),service_cat:'general',location:city||'Pakistan',urgency:'med',time_preference:'ASAP',key_requirements:[]};}
    if(city)intent.location=city;
    doneStep(0);prog(25);

    // STEP 1: Find providers
    showStep(1);
    setStatus('<span class="e-i">Finding providers in '+escHtml(intent.location)+'...</span><span class="u-i urdu">فراہم کنندگان ڈھونڈ رہے ہیں...</span>');
    const provRaw=await gemini(
      'You are a Pakistan service provider database. Generate realistic providers. Return ONLY a JSON array of 4 objects: {"id":"P001","name":"string","cat":"string","phone":"03XXXXXXXXX","rating":4.5,"rev":120,"dist":1.2,"cost":"Rs. X-Y","exp":"X yrs","jobs":300,"mapQuery":"name city","reason":"why great","score":90,"completionRate":96,"responseMin":8} Use real Pakistani names. Phone: 03XXXXXXXXX format. Return ONLY JSON array.',
      'Service: '+intent.service_type+' ('+intent.service_cat+') City: '+intent.location+' Urgency: '+intent.urgency
    );
    try{providers=JSON.parse(provRaw.replace(/```json|```/g,'').trim());}
    catch(e){
      providers=[
        {id:'P001',name:'Muhammad Services',cat:intent.service_cat,phone:'03001234567',rating:4.8,rev:134,dist:1.2,cost:'Rs. 1,500-3,500',exp:'8 yrs',jobs:420,mapQuery:intent.service_type+' '+intent.location,reason:'Highest rated nearby.',score:94,completionRate:97,responseMin:8},
        {id:'P002',name:'Ali Brothers',cat:intent.service_cat,phone:'03121234567',rating:4.6,rev:98,dist:2.1,cost:'Rs. 1,200-3,000',exp:'5 yrs',jobs:280,mapQuery:intent.service_type+' '+intent.location,reason:'Fast response time.',score:86,completionRate:94,responseMin:12},
        {id:'P003',name:'Hassan Expert',cat:intent.service_cat,phone:'03331234567',rating:4.7,rev:176,dist:1.8,cost:'Rs. 1,400-3,200',exp:'10 yrs',jobs:610,mapQuery:intent.service_type+' '+intent.location,reason:'Most experienced.',score:88,completionRate:96,responseMin:10},
      ];
    }
    // Ensure numeric values
    providers.forEach(p=>{p.rating=parseFloat(p.rating)||4.5;p.dist=parseFloat(p.dist)||2;p.score=parseInt(p.score)||85;p.completionRate=parseInt(p.completionRate)||92;p.responseMin=parseInt(p.responseMin)||15;});
    allProviders=[...providers];
    doneStep(1);prog(55);

    // STEP 2
    showStep(2);
    setStatus('<span class="e-i">Checking ratings...</span><span class="u-i urdu">ریٹنگ چیک کر رہے ہیں...</span>');
    await new Promise(r=>setTimeout(r,700));
    doneStep(2);prog(75);
    document.getElementById('skel-cards').style.display='flex';

    // STEP 3
    showStep(3);
    setStatus('<span class="e-i">Ranking best matches...</span><span class="u-i urdu">ترتیب دے رہے ہیں...</span>');
    providers.sort((a,b)=>(b.score||b.rating*20)-(a.score||a.rating*20));
    await new Promise(r=>setTimeout(r,500));
    doneStep(3);prog(100);
    await new Promise(r=>setTimeout(r,400));
    renderResults();
    show('results');
  }catch(e){
    setStatus('<span style="color:var(--danger)">Error: '+escHtml(e.message)+' — Check API key.</span>');
    prog(0);
    setTimeout(()=>show('home'),3500);
  }
}


// ═══ RENDER RESULTS ═══
function renderResults(){
  // Prepend a clear DEMO banner so users understand the provider data is
  // AI-generated and contact details should not be relied upon. Real backend
  // integration is a TODO; until then this is the only honest disclosure.
  const isUr=document.documentElement.getAttribute('data-lang')==='ur';
  const demoBanner=
    '<div class="demo-banner" role="alert">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" aria-hidden="true">'+
        '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'+
        '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'+
      '</svg>'+
      '<div>'+
        '<div class="demo-banner-title">'+
          (isUr?'ڈیمو ڈیٹا':'Demo data')+
        '</div>'+
        '<div class="demo-banner-sub">'+
          (isUr
            ? 'یہ فراہم کنندگان AI سے بنائے گئے ہیں۔ فون نمبر اور رابطے استعمال نہ کریں۔'
            : 'These providers are AI-generated for prototype purposes. Phone numbers and contact buttons are illustrative — please do not call them.')+
        '</div>'+
      '</div>'+
    '</div>';
  document.getElementById('sum-tags').innerHTML=demoBanner+[
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',intent.service_type||'—'],
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',intent.location||'—'],
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',intent.time_preference||'ASAP'],
  ].map(([ic,v])=>'<div class="sum-tag">'+ic+' '+escHtml(v)+'</div>').join('');
  document.getElementById('res-count').innerHTML='<span>'+providers.length+'</span> '+(document.documentElement.getAttribute('data-lang')==='ur'?'فراہم کنندگان ملے':'providers found');
  if(!providers.length){document.getElementById('no-results').classList.remove('hidden');}
  else{document.getElementById('no-results').classList.add('hidden');}
  renderProviderCards(providers);
}
function renderProviderCards(list){
  const el=document.getElementById('prov-list');el.innerHTML='';
  list.forEach((p,i)=>{
    const isTop=i===0;
    const stars='\u2605'.repeat(Math.round(p.rating));
    const icon=CAT_ICONS[p.cat]||CAT_ICONS.general;
    const mapsUrl='https://www.google.com/maps/search/'+encodeURIComponent(p.mapQuery||p.name);
    const waUrl='https://wa.me/92'+(p.phone||'3001234567').replace(/^0/,'')+'?text='+encodeURIComponent('Assalam-o-alaikum! KHIDMAT se mila. Mujhe '+(intent.service_type||'service')+' chahiye '+(intent.location||'')+' mein.');
    const callUrl='tel:+92'+(p.phone||'3001234567').replace(/^0/,'');
    const quoteUrl='https://wa.me/92'+(p.phone||'3001234567').replace(/^0/,'')+'?text='+encodeURIComponent('KHIDMAT: '+(intent.service_type||'Service')+' ke liye quote chahiye '+(intent.location||'')+' mein.');
    const card=document.createElement('div');
    card.className='prov-card'+(isTop?' top-pick':'');
    card.innerHTML=
      (isTop?'<div class="card-strip"><span class="cs-lbl">\u2B50 Top Pick</span><span class="cs-score">'+p.score+'% match</span></div>':'')+
      '<div class="card-body"><div class="cr1"><div class="pav">'+icon+'</div><div class="pinfo"><div class="pname-row"><div class="pname">'+escHtml(p.name)+'</div><div class="vbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>Verified</div></div><div class="pmeta"><span class="stars">'+stars+'</span><span class="rnum">'+p.rating+'</span><span class="rcount">('+p.rev+' reviews)</span><span class="mdot">\u00B7</span><span class="dist-b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'+p.dist+' km</span></div><div class="ptags">'+(p.dist<=1.5?'<span class="ptag nearby">\uD83D\uDCCD Nearby</span>':'')+'<span class="ptag fast">\u26A1 '+(p.responseMin||15)+' min</span>'+(isTop?'<span class="ptag top">\uD83C\uDFC6 Top</span>':'')+'<span class="ptag">'+escHtml(p.exp)+'</span></div></div></div>'+
      '<div class="pstats"><div class="pstat-item"><div class="pstat-val">'+(p.completionRate||95)+'%</div><div class="pstat-lbl">Done</div></div><div class="pstat-item"><div class="pstat-val">'+(p.jobs||'—')+'</div><div class="pstat-lbl">Jobs</div></div><div class="pstat-item"><div class="pstat-val">'+escHtml(p.exp)+'</div><div class="pstat-lbl">Exp</div></div></div>'+
      '<div class="pcost">'+escHtml(p.cost)+'</div></div>'+
      '<div class="guarantee-row"><div class="gr-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><div class="gr-text"><div class="gr-lbl">KHIDMAT Guarantee</div><div class="gr-sub e-text">Money-back if unsatisfactory</div><div class="gr-sub u-text urdu" style="font-size:.6rem">\u0646\u0627\u0642\u0635 \u062E\u062F\u0645\u062A \u067E\u0631 \u0648\u0627\u067E\u0633\u06CC</div></div></div>'+
      '<div class="pwhy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'+escHtml(p.reason||'Highly rated.')+'</div>'+
      '<div class="pact"><button class="act-btn book" onclick="openBook('+i+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Book</button><a class="act-btn wa" href="'+waUrl+'" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp</a><a class="act-btn call" href="'+callUrl+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-8.1-8.1A19.79 19.79 0 01.92 5.18 2 2 0 012.9 3h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 11.69a16 16 0 006.22 6.22l2.06-2.06a2 2 0 012.11-.45c.91.339 1.85.573 2.81.7a2 2 0 011.72 2z"/></svg>Call</a><a class="act-btn maps" href="'+mapsUrl+'" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Map</a></div>';
    el.appendChild(card);
    setTimeout(()=>card.classList.add('rev'),i*110+80);
  });
}
function filterCards(type,btn){
  document.querySelectorAll('.fb-btn').forEach(b=>b.classList.remove('act'));
  btn.classList.add('act');
  let list=[...allProviders];
  if(type==='top')list.sort((a,b)=>b.rating-a.rating);
  else if(type==='near')list.sort((a,b)=>a.dist-b.dist);
  else if(type==='fast')list.sort((a,b)=>(a.responseMin||15)-(b.responseMin||15));
  renderProviderCards(list);
}


// ═══ BOOKING ═══
function openBook(idx){
  selProvider=providers[idx];
  const icon=CAT_ICONS[selProvider.cat]||CAT_ICONS.general;
  document.getElementById('b-av').innerHTML=icon;
  const tom=new Date();tom.setDate(tom.getDate()+1);
  document.getElementById('b-title').textContent=selProvider.name;
  document.getElementById('b-sub').textContent=(intent.service_type||'Service')+' — '+(intent.time_preference||'ASAP');
  document.getElementById('b-prov').textContent=selProvider.name;
  document.getElementById('b-svc').textContent=intent.service_type||'Service';
  document.getElementById('b-loc').textContent=intent.location||'—';
  document.getElementById('b-date').textContent=tom.toLocaleDateString('en-PK',{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('b-cost').textContent=selProvider.cost;
  document.querySelectorAll('.slot').forEach((s,i)=>{if(!s.classList.contains('na'))s.classList.toggle('sel',i===0)});
  selSlot='9:00 AM';
  show('booking');
}
function pickSlot(el,slot){
  if(el.classList.contains('na'))return;
  document.querySelectorAll('.slot').forEach(s=>s.classList.remove('sel'));
  el.classList.add('sel');selSlot=slot;
}
function confirmBooking(){
  const ref='KHD-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const booking={ref,provider:selProvider?.name,service:intent.service_type,city:intent.location,slot:selSlot,date:new Date().toISOString(),status:'confirmed'};
  bookings.unshift(booking);
  localStorage.setItem('khidmat_bookings',JSON.stringify(bookings));
  document.getElementById('ref-code').textContent=ref;
  document.getElementById('tl-appt').textContent=selSlot+' TOMORROW';
  document.getElementById('tl-prov-acc').innerHTML='<span class="e-i">'+(selProvider?.name||'Provider')+' will contact you on WhatsApp.</span><span class="u-i urdu">'+(selProvider?.name||'\u0641\u0631\u0627\u06C1\u0645 \u06A9\u0646\u0646\u062F\u06C1')+' WhatsApp \u067E\u0631 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06D2 \u06AF\u0627\u06D4</span>';
  show('confirmed');
}
// ═══ BOOKINGS LIST ═══
function renderBookingsList(){
  const container=document.getElementById('bookings-list');
  const empty=document.getElementById('bookings-empty');
  if(!bookings.length){if(empty)empty.style.display='';return;}
  if(empty)empty.style.display='none';
  let html='';
  bookings.forEach(b=>{
    html+='<div style="background:var(--sf);border:1.5px solid var(--br);border-radius:var(--r);padding:16px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700;font-size:.88rem">'+escHtml(b.provider||'Provider')+'</div><div style="font-size:.65rem;font-weight:700;color:var(--acc);background:var(--gdim);padding:3px 8px;border-radius:12px">'+escHtml(b.status||'confirmed')+'</div></div><div style="font-size:.76rem;color:var(--tx2)">'+escHtml(b.service||'Service')+' \u2022 '+escHtml(b.city||'')+' \u2022 '+escHtml(b.slot||'')+'</div><div style="font-size:.65rem;color:var(--tx3);margin-top:4px">Ref: '+escHtml(b.ref)+'</div></div>';
  });
  container.innerHTML=html;
}

// ═══ PRICE ESTIMATOR ═══
const PE_DATA={
  ac:{min:'1,500',avg:'3,000',max:'5,000',urg:'7,000+',desc:'Gas filling, cleaning, minor repairs'},
  plumber:{min:'600',avg:'1,500',max:'3,000',urg:'4,500+',desc:'Leaks, fittings, drainage work'},
  electric:{min:'800',avg:'2,000',max:'4,000',urg:'6,000+',desc:'Wiring, switches, UPS, panel'},
  tutor:{min:'2,500/mo',avg:'4,000/mo',max:'8,000/mo',urg:'\u2014',desc:'Home tutoring per month'},
  beauty:{min:'1,500',avg:'5,000',max:'20,000',urg:'25,000+',desc:'Parlor & home beauty services'},
  carpenter:{min:'1,500',avg:'4,000',max:'10,000',urg:'15,000+',desc:'Furniture, doors, cabinets'},
  painter:{min:'3,000',avg:'8,000',max:'20,000',urg:'25,000+',desc:'Per room or whole house'},
  cleaning:{min:'2,000',avg:'3,500',max:'6,000',urg:'8,000+',desc:'Deep clean, sofa, carpet'},
};
function selectPriceService(btn,key){
  document.querySelectorAll('.pe-svc-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  const d=PE_DATA[key]||PE_DATA.ac;
  document.getElementById('pe-range').textContent='Rs. '+d.min+' \u2014 '+d.max;
  document.getElementById('pe-desc').textContent=d.desc;
  document.getElementById('pe-min').textContent='Rs. '+d.min;
  document.getElementById('pe-avg').textContent='Rs. '+d.avg;
  document.getElementById('pe-max').textContent='Rs. '+d.max;
  document.getElementById('pe-urg').textContent='Rs. '+d.urg;
}


// ═══ CITY SEARCH (FIXED scope bug) ═══
const PK_CITIES=[
  {name:'Karachi',province:'Sindh'},{name:'Lahore',province:'Punjab'},{name:'Islamabad',province:'ICT'},
  {name:'Rawalpindi',province:'Punjab'},{name:'Faisalabad',province:'Punjab'},{name:'Multan',province:'Punjab'},
  {name:'Peshawar',province:'KPK'},{name:'Quetta',province:'Balochistan'},{name:'Sialkot',province:'Punjab'},
  {name:'Gujranwala',province:'Punjab'},{name:'Hyderabad',province:'Sindh'},{name:'Bahawalpur',province:'Punjab'},
  {name:'Sargodha',province:'Punjab'},{name:'Sukkur',province:'Sindh'},{name:'Larkana',province:'Sindh'},
  {name:'Sheikhupura',province:'Punjab'},{name:'Rahim Yar Khan',province:'Punjab'},{name:'Jhang',province:'Punjab'},
  {name:'Gujrat',province:'Punjab'},{name:'Sahiwal',province:'Punjab'},{name:'Mardan',province:'KPK'},
  {name:'Dera Ghazi Khan',province:'Punjab'},{name:'Dera Ismail Khan',province:'KPK'},
  {name:'Nawabshah',province:'Sindh'},{name:'Mingora',province:'KPK'},{name:'Chiniot',province:'Punjab'},
  {name:'Attock',province:'Punjab'},{name:'Muzaffarabad',province:'AJK'},{name:'Mirpur',province:'AJK'},
  {name:'Abbottabad',province:'KPK'},{name:'Mansehra',province:'KPK'},{name:'Jhelum',province:'Punjab'},
  {name:'Chakwal',province:'Punjab'},{name:'Wah Cantt',province:'Punjab'},{name:'Taxila',province:'Punjab'},
  {name:'Okara',province:'Punjab'},{name:'Vehari',province:'Punjab'},{name:'Khuzdar',province:'Balochistan'},
  {name:'Turbat',province:'Balochistan'},{name:'Gwadar',province:'Balochistan'},{name:'Gilgit',province:'GB'},
  {name:'Skardu',province:'GB'},{name:'Hunza',province:'GB'},{name:'Kohat',province:'KPK'},
  {name:'Bannu',province:'KPK'},{name:'Nowshera',province:'KPK'},{name:'Charsadda',province:'KPK'},
  {name:'Swabi',province:'KPK'},{name:'Haripur',province:'KPK'},{name:'Chitral',province:'KPK'},
  {name:'Kotli',province:'AJK'},{name:'Sadiqabad',province:'Punjab'},{name:'Murree',province:'Punjab'},
  {name:'Bahawalnagar',province:'Punjab'},{name:'Narowal',province:'Punjab'},{name:'Kamoke',province:'Punjab'},
];
function localCitySearch(q){
  const lq=q.toLowerCase().trim();
  return PK_CITIES.filter(c=>c.name.toLowerCase().includes(lq)||c.province.toLowerCase().includes(lq)).slice(0,6);
}
async function onCityInput(val){
  const dd=document.getElementById('city-dd');
  clearTimeout(citySearchTimer);
  if(!val||val.length<2){dd.classList.remove('open');dd.innerHTML='';return;}
  citySearchTimer=setTimeout(()=>searchCities(val),300);
}
async function searchCities(q){
  const dd=document.getElementById('city-dd');
  dd.innerHTML='<div class="city-searching"><div class="mini-spin"></div><span>Searching...</span></div>';
  dd.classList.add('open');
  let results=[];
  try{
    if(GKEY){
      const raw=await gemini(
        'You are a Pakistan cities database. Return ONLY JSON array: [{"name":"City","province":"Province"}] Max 6 results. Return [] if not Pakistani city.',
        'Search: "'+q+'"'
      );
      try{results=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(e){results=localCitySearch(q);}
    }else{
      results=localCitySearch(q);
    }
  }catch(e){
    results=localCitySearch(q);
  }
  if(!results||!results.length){
    dd.innerHTML='<div class="city-opt" style="cursor:default;color:var(--tx3)">No cities found</div>';return;
  }
  dd.innerHTML=results.map(c=>'<div class="city-opt" onclick="selectCity(\''+escHtml(c.name)+'\',\''+escHtml(c.province||'')+'\')"><span>\uD83D\uDCCD</span><div><div class="city-opt-main">'+escHtml(c.name)+'</div><div class="city-opt-sub">'+escHtml(c.province||'')+'</div></div></div>').join('');
}
function onCityKey(e){
  const dd=document.getElementById('city-dd');
  const opts=dd.querySelectorAll('.city-opt[onclick]');
  if(e.key==='ArrowDown'){e.preventDefault();highlightedCityIdx=Math.min(highlightedCityIdx+1,opts.length-1);updateHi(opts);}
  else if(e.key==='ArrowUp'){e.preventDefault();highlightedCityIdx=Math.max(highlightedCityIdx-1,0);updateHi(opts);}
  else if(e.key==='Enter'&&highlightedCityIdx>=0&&opts[highlightedCityIdx]){opts[highlightedCityIdx].click();}
  else if(e.key==='Escape'){dd.classList.remove('open');}
}
function updateHi(opts){opts.forEach((o,i)=>o.classList.toggle('hi',i===highlightedCityIdx));}
function selectCity(name,province){
  selectedCity=name;
  localStorage.setItem('khidmat_city',name);
  document.getElementById('city-inp').value=name+(province?', '+province:'');
  document.getElementById('city-inp').classList.add('ok');
  document.getElementById('city-dd').classList.remove('open');
  highlightedCityIdx=-1;
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
document.addEventListener('click',e=>{
  if(!document.getElementById('city-wrap')?.contains(e.target)){
    document.getElementById('city-dd')?.classList.remove('open');
  }
});

// ═══ PWA ═══
// Manifest is now served as a static file (manifest.webmanifest) and linked
// from index.html. Service worker registration is intentionally not added
// here yet — there is no sw.js shipped, and registering a stub would only
// add network noise without offline benefit. See README for the roadmap.
