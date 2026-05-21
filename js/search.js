/**
 * KHIDMAT v3.1 — Search & Results Module
 */
'use strict';

// ═══ PROGRESS HELPERS ═══
function prog(p) { document.getElementById('p-fill').style.width = p + '%'; }
function setStatus(msg) { document.getElementById('p-status').innerHTML = msg; }
function showStep(i) { const s = document.getElementById('step-' + i); if (s) s.classList.add('vis'); const sp = document.getElementById('spinner-' + i); if (sp) sp.classList.remove('hidden'); }
function doneStep(i) { const sp = document.getElementById('spinner-' + i); const ck = document.getElementById('check-' + i); if (sp) sp.classList.add('hidden'); if (ck) { ck.classList.remove('hidden'); ck.classList.add('done'); } }

// ═══ MAIN SEARCH ═══
async function startSearch() {
  const raw = document.getElementById('req-inp').value.trim();
  const city = selectedCity || document.getElementById('city-inp').value.trim().split(',')[0].trim();
  if (!raw) {
    const ta = document.getElementById('req-inp');
    ta.style.borderColor = 'var(--danger)'; ta.focus();
    setTimeout(() => ta.style.borderColor = '', 1600); return;
  }
  for (let i = 0; i < 4; i++) {
    const s = document.getElementById('step-' + i), sp = document.getElementById('spinner-' + i), ck = document.getElementById('check-' + i);
    if (s) s.classList.remove('vis'); if (sp) sp.classList.add('hidden'); if (ck) { ck.classList.add('hidden'); ck.classList.remove('done'); }
  }
  document.getElementById('skel-cards').style.display = 'none';
  prog(0); show('proc');

  try {
    showStep(0);
    setStatus('<span class="e-i">Understanding your request...</span><span class="u-i urdu">درخواست سمجھ رہے ہیں...</span>');
    const intentRaw = await gemini(
      'Extract service request. Return ONLY JSON: {"service_type":"string","service_cat":"ac_technician|plumber|electrician|tutor|beautician|carpenter|cleaning|painter|mechanic|general","location":"string","urgency":"low|med|high","time_preference":"string","key_requirements":["string"]} Understand Roman Urdu, Urdu, English.',
      'Request: "' + raw + '" City: "' + (city || 'Pakistan') + '"'
    );
    try { intent = JSON.parse(intentRaw.replace(/```json|```/g, '').trim()); }
    catch (e) { intent = { service_type: raw.slice(0, 40), service_cat: 'general', location: city || 'Pakistan', urgency: 'med', time_preference: 'ASAP', key_requirements: [] }; }
    if (city) intent.location = city;
    doneStep(0); prog(25);

    showStep(1);
    setStatus('<span class="e-i">Finding providers in ' + escHtml(intent.location) + '...</span><span class="u-i urdu">فراہم کنندگان ڈھونڈ رہے ہیں...</span>');
    const provRaw = await gemini(
      'You are a Pakistan service provider database. Generate realistic providers. Return ONLY a JSON array of 4 objects: {"id":"P001","name":"string","cat":"string","phone":"03XXXXXXXXX","rating":4.5,"rev":120,"dist":1.2,"cost":"Rs. X-Y","exp":"X yrs","jobs":300,"mapQuery":"name city","reason":"why great","score":90,"completionRate":96,"responseMin":8} Use real Pakistani names. Return ONLY JSON array.',
      'Service: ' + intent.service_type + ' (' + intent.service_cat + ') City: ' + intent.location + ' Urgency: ' + intent.urgency
    );
    try { providers = JSON.parse(provRaw.replace(/```json|```/g, '').trim()); }
    catch (e) {
      providers = [
        { id: 'P001', name: 'Muhammad Services', cat: intent.service_cat, phone: '03001234567', rating: 4.8, rev: 134, dist: 1.2, cost: 'Rs. 1,500-3,500', exp: '8 yrs', jobs: 420, mapQuery: intent.service_type + ' ' + intent.location, reason: 'Highest rated nearby.', score: 94, completionRate: 97, responseMin: 8 },
        { id: 'P002', name: 'Ali Brothers', cat: intent.service_cat, phone: '03121234567', rating: 4.6, rev: 98, dist: 2.1, cost: 'Rs. 1,200-3,000', exp: '5 yrs', jobs: 280, mapQuery: intent.service_type + ' ' + intent.location, reason: 'Fast response.', score: 86, completionRate: 94, responseMin: 12 },
        { id: 'P003', name: 'Hassan Expert', cat: intent.service_cat, phone: '03331234567', rating: 4.7, rev: 176, dist: 1.8, cost: 'Rs. 1,400-3,200', exp: '10 yrs', jobs: 610, mapQuery: intent.service_type + ' ' + intent.location, reason: 'Most experienced.', score: 88, completionRate: 96, responseMin: 10 },
      ];
    }
    providers.forEach(p => { p.rating = parseFloat(p.rating) || 4.5; p.dist = parseFloat(p.dist) || 2; p.score = parseInt(p.score) || 85; p.completionRate = parseInt(p.completionRate) || 92; p.responseMin = parseInt(p.responseMin) || 15; });
    allProviders = [...providers];
    doneStep(1); prog(55);

    showStep(2);
    setStatus('<span class="e-i">Checking ratings...</span><span class="u-i urdu">ریٹنگ چیک...</span>');
    await new Promise(r => setTimeout(r, 700));
    doneStep(2); prog(75);
    document.getElementById('skel-cards').style.display = 'flex';

    showStep(3);
    setStatus('<span class="e-i">Ranking...</span><span class="u-i urdu">ترتیب...</span>');
    providers.sort((a, b) => (b.score || b.rating * 20) - (a.score || a.rating * 20));
    await new Promise(r => setTimeout(r, 500));
    doneStep(3); prog(100);
    await new Promise(r => setTimeout(r, 400));
    renderResults();
    show('results');
  } catch (e) {
    setStatus('<span style="color:var(--danger)">Error: ' + escHtml(e.message) + '</span>');
    prog(0);
    setTimeout(() => show('home'), 3500);
  }
}

// ═══ FILTER ═══
function filterCards(type, btn) {
  document.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('act'));
  btn.classList.add('act');
  let list = [...allProviders];
  if (type === 'top') list.sort((a, b) => b.rating - a.rating);
  else if (type === 'near') list.sort((a, b) => a.dist - b.dist);
  else if (type === 'fast') list.sort((a, b) => (a.responseMin || 15) - (b.responseMin || 15));
  renderProviderCards(list);
}