/**
 * KHIDMAT v3.1 — Core Application Module
 * Developer: Muhammad Azhar Shahbaz
 */
'use strict';

// ═══ STATE ═══
let GKEY = localStorage.getItem('khidmat_key') || '';
let intent = {};
let providers = [];
let allProviders = [];
let selProvider = null;
let selSlot = '9:00 AM';
let selectedCity = localStorage.getItem('khidmat_city') || '';
let otpTimer = null;
let citySearchTimer = null;
let highlightedCityIdx = -1;
let bookings = JSON.parse(localStorage.getItem('khidmat_bookings') || '[]');
let userProfile = JSON.parse(localStorage.getItem('khidmat_profile') || '{}');

// ═══ BOOT ═══
(function boot() {
  const savedTheme = localStorage.getItem('khidmat_theme');
  const savedLang = localStorage.getItem('khidmat_lang');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedLang) document.documentElement.setAttribute('data-lang', savedLang);
  if (GKEY) document.getElementById('api-key-inp').value = GKEY;
  if (selectedCity) document.getElementById('city-inp').value = selectedCity;
  if (userProfile.name) document.getElementById('prof-name').textContent = userProfile.name;
  if (userProfile.phone) document.getElementById('prof-phone').textContent = '+92 ' + userProfile.phone;
  renderBookingsList();
})();

// ═══ THEME / LANG ═══
function toggleTheme() {
  const h = document.documentElement;
  const next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', next);
  localStorage.setItem('khidmat_theme', next);
}

function toggleLang() {
  const h = document.documentElement;
  const next = h.getAttribute('data-lang') === 'en' ? 'ur' : 'en';
  h.setAttribute('data-lang', next);
  localStorage.setItem('khidmat_lang', next);
  const ta = document.getElementById('req-inp');
  if (ta) ta.placeholder = next === 'ur' ? 'AC ٹیکنیشن، پلمبر یا الیکٹریشن چاہیے...' : 'Mujhe AC technician, plumber ya electrician chahiye...';
}

// ═══ SCREEN MANAGER ═══
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'anim-in'));
  const t = document.getElementById('s-' + id);
  if (t) { t.classList.add('active', 'anim-in'); window.scrollTo(0, 0); }
  if (id === 'otp') startOtpTimer();
  if (id === 'bookings') renderBookingsList();
}

function eg(txt) {
  const ta = document.getElementById('req-inp');
  ta.value = txt;
  show('home');
  setTimeout(() => ta.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

// ═══ UTILITIES ═══
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ═══ GEMINI API ═══
async function gemini(sys, usr) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GKEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ parts: [{ text: usr }] }],
        generationConfig: { temperature: 0.25 }
      })
    }
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'API error');
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ═══ CATEGORY ICONS ═══
const CAT_ICONS = {
  ac_technician: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="13" rx="2"/><path d="M3 7h18M9 21l3-5 3 5"/></svg>',
  plumber: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 12h-4m4 0a2 2 0 110-4 2 2 0 010 4zm-4 0a2 2 0 100-4 2 2 0 000 4"/><path d="M10 12v6a2 2 0 002 2h0a2 2 0 002-2v-6"/></svg>',
  electrician: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  tutor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
  beautician: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  carpenter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M6 7V4m12 3V4M9 11v6m6-6v6M4 21h16a1 1 0 001-1V8H3v12a1 1 0 001 1z"/></svg>',
  cleaning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18M9 21H5a2 2 0 01-2-2V9m6 12h10a2 2 0 002-2V9"/></svg>',
  painter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 4v7a5 5 0 01-10 0V4m0 0a2 2 0 00-4 0v1"/><path d="M17 21H7l2-4h6l2 4z"/></svg>',
  mechanic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M16.24 7.76a6 6 0 11-8.49 8.49"/><path d="M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
  general: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};

// ═══ PHOTO UPLOAD ═══
function handlePhotoUpload() { document.getElementById('photo-input').click(); }
function handlePhoto(input) {
  if (input.files && input.files[0]) {
    const ta = document.getElementById('req-inp');
    const isUr = document.documentElement.getAttribute('data-lang') === 'ur';
    ta.value = (ta.value ? ta.value + '\n' : '') + (isUr ? '[تصویر منسلک] ' : '[Photo attached] ');
    ta.focus();
  }
}

// ═══ PWA ═══
const mf = { name: 'KHIDMAT v3.1', short_name: 'KHIDMAT', start_url: '/', display: 'standalone', background_color: '#0a1209', theme_color: '#34c55a', icons: [{ src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231a6b3a'/><text y='.9em' font-size='70' x='12' fill='white'>K</text></svg>", sizes: '192x192', type: 'image/svg+xml' }] };
try { document.getElementById('pwa-manifest').href = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/json' })); } catch (e) { }

// Close city dropdown on outside click
document.addEventListener('click', e => {
  if (!document.getElementById('city-wrap')?.contains(e.target)) {
    document.getElementById('city-dd')?.classList.remove('open');
  }
});