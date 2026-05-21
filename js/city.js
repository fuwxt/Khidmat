/**
 * KHIDMAT v3.1 — City Search Module
 */
'use strict';

const PK_CITIES = [
  { name: 'Karachi', province: 'Sindh' }, { name: 'Lahore', province: 'Punjab' }, { name: 'Islamabad', province: 'ICT' },
  { name: 'Rawalpindi', province: 'Punjab' }, { name: 'Faisalabad', province: 'Punjab' }, { name: 'Multan', province: 'Punjab' },
  { name: 'Peshawar', province: 'KPK' }, { name: 'Quetta', province: 'Balochistan' }, { name: 'Sialkot', province: 'Punjab' },
  { name: 'Gujranwala', province: 'Punjab' }, { name: 'Hyderabad', province: 'Sindh' }, { name: 'Bahawalpur', province: 'Punjab' },
  { name: 'Sargodha', province: 'Punjab' }, { name: 'Sukkur', province: 'Sindh' }, { name: 'Larkana', province: 'Sindh' },
  { name: 'Sheikhupura', province: 'Punjab' }, { name: 'Rahim Yar Khan', province: 'Punjab' }, { name: 'Jhang', province: 'Punjab' },
  { name: 'Gujrat', province: 'Punjab' }, { name: 'Sahiwal', province: 'Punjab' }, { name: 'Mardan', province: 'KPK' },
  { name: 'Dera Ghazi Khan', province: 'Punjab' }, { name: 'Dera Ismail Khan', province: 'KPK' },
  { name: 'Nawabshah', province: 'Sindh' }, { name: 'Mingora', province: 'KPK' }, { name: 'Chiniot', province: 'Punjab' },
  { name: 'Attock', province: 'Punjab' }, { name: 'Muzaffarabad', province: 'AJK' }, { name: 'Mirpur', province: 'AJK' },
  { name: 'Abbottabad', province: 'KPK' }, { name: 'Mansehra', province: 'KPK' }, { name: 'Jhelum', province: 'Punjab' },
  { name: 'Chakwal', province: 'Punjab' }, { name: 'Wah Cantt', province: 'Punjab' }, { name: 'Taxila', province: 'Punjab' },
  { name: 'Okara', province: 'Punjab' }, { name: 'Vehari', province: 'Punjab' }, { name: 'Khuzdar', province: 'Balochistan' },
  { name: 'Turbat', province: 'Balochistan' }, { name: 'Gwadar', province: 'Balochistan' }, { name: 'Gilgit', province: 'GB' },
  { name: 'Skardu', province: 'GB' }, { name: 'Hunza', province: 'GB' }, { name: 'Kohat', province: 'KPK' },
  { name: 'Bannu', province: 'KPK' }, { name: 'Nowshera', province: 'KPK' }, { name: 'Charsadda', province: 'KPK' },
  { name: 'Swabi', province: 'KPK' }, { name: 'Haripur', province: 'KPK' }, { name: 'Chitral', province: 'KPK' },
  { name: 'Kotli', province: 'AJK' }, { name: 'Sadiqabad', province: 'Punjab' }, { name: 'Murree', province: 'Punjab' },
  { name: 'Bahawalnagar', province: 'Punjab' }, { name: 'Narowal', province: 'Punjab' }, { name: 'Kamoke', province: 'Punjab' },
];

function localCitySearch(q) {
  const lq = q.toLowerCase().trim();
  return PK_CITIES.filter(c => c.name.toLowerCase().includes(lq) || c.province.toLowerCase().includes(lq)).slice(0, 6);
}

async function onCityInput(val) {
  const dd = document.getElementById('city-dd');
  clearTimeout(citySearchTimer);
  if (!val || val.length < 2) { dd.classList.remove('open'); dd.innerHTML = ''; return; }
  citySearchTimer = setTimeout(() => searchCities(val), 300);
}

async function searchCities(q) {
  const dd = document.getElementById('city-dd');
  dd.innerHTML = '<div class="city-searching"><div class="mini-spin"></div><span>Searching...</span></div>';
  dd.classList.add('open');
  let results = [];
  try {
    if (GKEY) {
      const raw = await gemini('You are a Pakistan cities database. Return ONLY JSON array: [{"name":"City","province":"Province"}] Max 6. Return [] if not Pakistani.', 'Search: "' + q + '"');
      try { results = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch (e) { results = localCitySearch(q); }
    } else {
      results = localCitySearch(q);
    }
  } catch (e) {
    results = localCitySearch(q);
  }
  if (!results || !results.length) {
    dd.innerHTML = '<div class="city-opt" style="cursor:default;color:var(--tx3)">No cities found</div>'; return;
  }
  dd.innerHTML = results.map(c => '<div class="city-opt" onclick="selectCity(\'' + escHtml(c.name) + '\',\'' + escHtml(c.province || '') + '\')"><span>\uD83D\uDCCD</span><div><div class="city-opt-main">' + escHtml(c.name) + '</div><div class="city-opt-sub">' + escHtml(c.province || '') + '</div></div></div>').join('');
}

function onCityKey(e) {
  const dd = document.getElementById('city-dd');
  const opts = dd.querySelectorAll('.city-opt[onclick]');
  if (e.key === 'ArrowDown') { e.preventDefault(); highlightedCityIdx = Math.min(highlightedCityIdx + 1, opts.length - 1); updateHi(opts); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); highlightedCityIdx = Math.max(highlightedCityIdx - 1, 0); updateHi(opts); }
  else if (e.key === 'Enter' && highlightedCityIdx >= 0 && opts[highlightedCityIdx]) { opts[highlightedCityIdx].click(); }
  else if (e.key === 'Escape') { dd.classList.remove('open'); }
}

function updateHi(opts) { opts.forEach((o, i) => o.classList.toggle('hi', i === highlightedCityIdx)); }

function selectCity(name, province) {
  selectedCity = name;
  localStorage.setItem('khidmat_city', name);
  document.getElementById('city-inp').value = name + (province ? ', ' + province : '');
  document.getElementById('city-inp').classList.add('ok');
  document.getElementById('city-dd').classList.remove('open');
  highlightedCityIdx = -1;
}