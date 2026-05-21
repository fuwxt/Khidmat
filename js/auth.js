/**
 * KHIDMAT v3.1 — Authentication Module
 */
'use strict';

function initApp() {
  const k = document.getElementById('api-key-inp').value.trim();
  if (!k || k.length < 20) {
    const inp = document.getElementById('api-key-inp');
    inp.classList.add('err'); setTimeout(() => inp.classList.remove('err'), 2000); return;
  }
  GKEY = k;
  localStorage.setItem('khidmat_key', k);
  show('home');
}

function doLogin() {
  const ph = document.getElementById('login-phone').value.trim();
  const pw = document.getElementById('login-pass').value;
  if (!ph || !pw) { showAuthErr('login-err', 'login-err-t', 'Please fill all fields. / تمام خانے بھریں۔'); return; }
  if (ph.length < 10) { showAuthErr('login-err', 'login-err-t', 'Invalid phone number. / غلط نمبر۔'); return; }
  if (pw.length < 8) { showAuthErr('login-err', 'login-err-t', 'Password must be 8+ characters. / کم از کم 8 حروف۔'); return; }
  userProfile = { name: 'User', phone: ph };
  localStorage.setItem('khidmat_profile', JSON.stringify(userProfile));
  document.getElementById('prof-name').textContent = userProfile.name;
  document.getElementById('prof-phone').textContent = '+92 ' + ph;
  show('home');
}

function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const ph = document.getElementById('signup-phone').value.trim();
  const pw = document.getElementById('signup-pass').value;
  if (!name || !ph || !pw) return;
  if (pw.length < 8) return;
  userProfile = { name, phone: ph };
  localStorage.setItem('khidmat_profile', JSON.stringify(userProfile));
  document.getElementById('prof-name').textContent = name;
  document.getElementById('prof-phone').textContent = '+92 ' + ph;
  document.getElementById('signup-ok').classList.remove('hidden');
  setTimeout(() => show('otp'), 1500);
}

function logout() {
  localStorage.removeItem('khidmat_profile');
  userProfile = {};
  show('setup');
}

function showAuthErr(cid, tid, msg) {
  const el = document.getElementById(cid); const t = document.getElementById(tid);
  if (t) t.textContent = msg; el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ═══ OTP ═══
function otpInput(cell, i) {
  const cs = document.querySelectorAll('.otp-c');
  cell.value = cell.value.replace(/\D/g, '');
  if (cell.value) { cell.classList.add('filled'); if (i < 5) cs[i + 1].focus(); }
  else cell.classList.remove('filled');
}

function otpKey(e, i) {
  const cs = document.querySelectorAll('.otp-c');
  if (e.key === 'Backspace' && !cs[i].value && i > 0) cs[i - 1].focus();
}

function verifyOtp() {
  const cs = document.querySelectorAll('.otp-c');
  const code = Array.from(cs).map(c => c.value).join('');
  if (code.length < 6) { showOtpErr('Enter complete code. / مکمل کوڈ درج کریں۔'); return; }
  if (code === '000000') {
    showOtpErr('Incorrect code. / غلط کوڈ۔');
    cs.forEach(c => { c.classList.add('err'); setTimeout(() => c.classList.remove('err'), 600) }); return;
  }
  show('home');
}

function showOtpErr(msg) {
  document.getElementById('otp-err').classList.remove('hidden');
  document.getElementById('otp-err-t').textContent = msg;
  setTimeout(() => document.getElementById('otp-err').classList.add('hidden'), 4000);
}

let resendCd = 30;
function startOtpTimer() {
  clearInterval(otpTimer); resendCd = 30;
  const te = document.getElementById('resend-t'), tur = document.getElementById('resend-t-ur');
  const b = document.getElementById('resend-btn'), bur = document.getElementById('resend-btn-ur');
  if (b) b.disabled = true; if (bur) bur.disabled = true;
  otpTimer = setInterval(() => {
    resendCd--;
    if (te) te.textContent = `(${resendCd}s)`; if (tur) tur.textContent = `(${resendCd}ثانیے)`;
    if (resendCd <= 0) {
      clearInterval(otpTimer);
      if (te) te.textContent = ''; if (tur) tur.textContent = '';
      if (b) b.disabled = false; if (bur) bur.disabled = false;
    }
  }, 1000);
}

function resendOtp() {
  startOtpTimer();
  document.querySelectorAll('.otp-c').forEach(c => { c.value = ''; c.classList.remove('filled', 'err') });
  document.querySelectorAll('.otp-c')[0].focus();
}