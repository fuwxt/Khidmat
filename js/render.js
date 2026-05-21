/**
 * KHIDMAT v3.1 — Render Module (Results, Cards, Bookings)
 */
'use strict';

function renderResults() {
  document.getElementById('sum-tags').innerHTML = [
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>', intent.service_type || '—'],
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>', intent.location || '—'],
    ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', intent.time_preference || 'ASAP'],
  ].map(([ic, v]) => '<div class="sum-tag">' + ic + ' ' + escHtml(v) + '</div>').join('');
  document.getElementById('res-count').innerHTML = '<span>' + providers.length + '</span> ' + (document.documentElement.getAttribute('data-lang') === 'ur' ? 'فراہم کنندگان ملے' : 'providers found');
  if (!providers.length) document.getElementById('no-results').classList.remove('hidden');
  else document.getElementById('no-results').classList.add('hidden');
  renderProviderCards(providers);
}

function renderProviderCards(list) {
  const el = document.getElementById('prov-list'); el.innerHTML = '';
  list.forEach((p, i) => {
    const isTop = i === 0;
    const stars = '\u2605'.repeat(Math.round(p.rating));
    const icon = CAT_ICONS[p.cat] || CAT_ICONS.general;
    const mapsUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(p.mapQuery || p.name);
    const waUrl = 'https://wa.me/92' + (p.phone || '3001234567').replace(/^0/, '') + '?text=' + encodeURIComponent('Assalam-o-alaikum! KHIDMAT se. ' + (intent.service_type || 'service') + ' chahiye ' + (intent.location || '') + ' mein.');
    const callUrl = 'tel:+92' + (p.phone || '3001234567').replace(/^0/, '');
    const card = document.createElement('div');
    card.className = 'prov-card' + (isTop ? ' top-pick' : '');
    card.innerHTML =
      (isTop ? '<div class="card-strip"><span class="cs-lbl">\u2B50 Top Pick</span><span class="cs-score">' + p.score + '% match</span></div>' : '') +
      '<div class="card-body"><div class="cr1"><div class="pav">' + icon + '</div><div class="pinfo"><div class="pname-row"><div class="pname">' + escHtml(p.name) + '</div><div class="vbadge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>Verified</div></div><div class="pmeta"><span class="stars">' + stars + '</span><span class="rnum">' + p.rating + '</span><span class="rcount">(' + p.rev + ')</span><span class="mdot">\u00B7</span><span class="dist-b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' + p.dist + ' km</span></div><div class="ptags">' + (p.dist <= 1.5 ? '<span class="ptag nearby">\uD83D\uDCCD Near</span>' : '') + '<span class="ptag fast">\u26A1 ' + (p.responseMin || 15) + 'min</span>' + (isTop ? '<span class="ptag top">\uD83C\uDFC6 Top</span>' : '') + '<span class="ptag">' + escHtml(p.exp) + '</span></div></div></div>' +
      '<div class="pstats"><div class="pstat-item"><div class="pstat-val">' + (p.completionRate || 95) + '%</div><div class="pstat-lbl">Done</div></div><div class="pstat-item"><div class="pstat-val">' + (p.jobs || '—') + '</div><div class="pstat-lbl">Jobs</div></div><div class="pstat-item"><div class="pstat-val">' + escHtml(p.exp) + '</div><div class="pstat-lbl">Exp</div></div></div>' +
      '<div class="pcost">' + escHtml(p.cost) + '</div></div>' +
      '<div class="guarantee-row"><div class="gr-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><div class="gr-text"><div class="gr-lbl">KHIDMAT Guarantee</div><div class="gr-sub e-text">Money-back if unsatisfactory</div><div class="gr-sub u-text urdu" style="font-size:.6rem">\u0648\u0627\u067E\u0633\u06CC \u0636\u0645\u0627\u0646\u062A</div></div></div>' +
      '<div class="pwhy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' + escHtml(p.reason || 'Highly rated.') + '</div>' +
      '<div class="pact"><button class="act-btn book" onclick="openBook(' + i + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Book</button><a class="act-btn wa" href="' + waUrl + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WA</a><a class="act-btn call" href="' + callUrl + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-8.1-8.1A19.79 19.79 0 01.92 5.18 2 2 0 012.9 3h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 11.69a16 16 0 006.22 6.22l2.06-2.06a2 2 0 012.11-.45c.91.339 1.85.573 2.81.7a2 2 0 011.72 2z"/></svg>Call</a><a class="act-btn maps" href="' + mapsUrl + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Map</a></div>';
    el.appendChild(card);
    setTimeout(() => card.classList.add('rev'), i * 110 + 80);
  });
}

// ═══ BOOKINGS LIST ═══
function renderBookingsList() {
  const container = document.getElementById('bookings-list');
  const empty = document.getElementById('bookings-empty');
  if (!bookings.length) { if (empty) empty.style.display = ''; return; }
  if (empty) empty.style.display = 'none';
  let html = '';
  bookings.forEach(b => {
    html += '<div style="background:var(--sf);border:1.5px solid var(--br);border-radius:var(--r);padding:16px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700;font-size:.88rem">' + escHtml(b.provider || 'Provider') + '</div><div style="font-size:.65rem;font-weight:700;color:var(--acc);background:var(--gdim);padding:3px 8px;border-radius:12px">' + escHtml(b.status || 'confirmed') + '</div></div><div style="font-size:.76rem;color:var(--tx2)">' + escHtml(b.service || '') + ' \u2022 ' + escHtml(b.city || '') + ' \u2022 ' + escHtml(b.slot || '') + '</div><div style="font-size:.65rem;color:var(--tx3);margin-top:4px">Ref: ' + escHtml(b.ref) + '</div></div>';
  });
  container.innerHTML = html;
}