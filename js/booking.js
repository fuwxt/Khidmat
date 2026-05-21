/**
 * KHIDMAT v3.1 — Booking & Price Module
 */
'use strict';

function openBook(idx) {
  selProvider = providers[idx];
  const icon = CAT_ICONS[selProvider.cat] || CAT_ICONS.general;
  document.getElementById('b-av').innerHTML = icon;
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  document.getElementById('b-title').textContent = selProvider.name;
  document.getElementById('b-sub').textContent = (intent.service_type || 'Service') + ' — ' + (intent.time_preference || 'ASAP');
  document.getElementById('b-prov').textContent = selProvider.name;
  document.getElementById('b-svc').textContent = intent.service_type || 'Service';
  document.getElementById('b-loc').textContent = intent.location || '—';
  document.getElementById('b-date').textContent = tom.toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('b-cost').textContent = selProvider.cost;
  document.querySelectorAll('.slot').forEach((s, i) => { if (!s.classList.contains('na')) s.classList.toggle('sel', i === 0) });
  selSlot = '9:00 AM';
  show('booking');
}

function pickSlot(el, slot) {
  if (el.classList.contains('na')) return;
  document.querySelectorAll('.slot').forEach(s => s.classList.remove('sel'));
  el.classList.add('sel'); selSlot = slot;
}

function confirmBooking() {
  const ref = 'KHD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const booking = { ref, provider: selProvider?.name, service: intent.service_type, city: intent.location, slot: selSlot, date: new Date().toISOString(), status: 'confirmed' };
  bookings.unshift(booking);
  localStorage.setItem('khidmat_bookings', JSON.stringify(bookings));
  document.getElementById('ref-code').textContent = ref;
  document.getElementById('tl-appt').textContent = selSlot + ' TOMORROW';
  document.getElementById('tl-prov-acc').innerHTML = '<span class="e-i">' + (selProvider?.name || 'Provider') + ' will contact you on WhatsApp.</span><span class="u-i urdu">' + (selProvider?.name || '\u0641\u0631\u0627\u06C1\u0645 \u06A9\u0646\u0646\u062F\u06C1') + ' WhatsApp \u067E\u0631 \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06D2 \u06AF\u0627\u06D4</span>';
  show('confirmed');
}

// ═══ PRICE ESTIMATOR ═══
const PE_DATA = {
  ac: { min: '1,500', avg: '3,000', max: '5,000', urg: '7,000+', desc: 'Gas filling, cleaning, minor repairs' },
  plumber: { min: '600', avg: '1,500', max: '3,000', urg: '4,500+', desc: 'Leaks, fittings, drainage work' },
  electric: { min: '800', avg: '2,000', max: '4,000', urg: '6,000+', desc: 'Wiring, switches, UPS, panel' },
  tutor: { min: '2,500/mo', avg: '4,000/mo', max: '8,000/mo', urg: '\u2014', desc: 'Home tutoring per month' },
  beauty: { min: '1,500', avg: '5,000', max: '20,000', urg: '25,000+', desc: 'Parlor & home beauty services' },
  carpenter: { min: '1,500', avg: '4,000', max: '10,000', urg: '15,000+', desc: 'Furniture, doors, cabinets' },
  painter: { min: '3,000', avg: '8,000', max: '20,000', urg: '25,000+', desc: 'Per room or whole house' },
  cleaning: { min: '2,000', avg: '3,500', max: '6,000', urg: '8,000+', desc: 'Deep clean, sofa, carpet' },
};

function selectPriceService(btn, key) {
  document.querySelectorAll('.pe-svc-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const d = PE_DATA[key] || PE_DATA.ac;
  document.getElementById('pe-range').textContent = 'Rs. ' + d.min + ' \u2014 ' + d.max;
  document.getElementById('pe-desc').textContent = d.desc;
  document.getElementById('pe-min').textContent = 'Rs. ' + d.min;
  document.getElementById('pe-avg').textContent = 'Rs. ' + d.avg;
  document.getElementById('pe-max').textContent = 'Rs. ' + d.max;
  document.getElementById('pe-urg').textContent = 'Rs. ' + d.urg;
}