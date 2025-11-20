// login.js
// Handles signup/login and mess create/join flow

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const showSignupBtn = document.getElementById('show-signup');
  const showLoginBtn = document.getElementById('show-login');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const signupError = document.getElementById('signup-error');
  const loginError = document.getElementById('login-error');
  const forgotPasswordLink = document.getElementById('forgot-password-link');

  const postAuthSection = document.getElementById('post-auth-section');
  const chooseCreateBtn = document.getElementById('choose-create');
  const chooseJoinBtn = document.getElementById('choose-join');
  const proceedDashboardBtn = document.getElementById('proceed-dashboard');

  const createMessForm = document.getElementById('create-mess-form');
  const joinMessForm = document.getElementById('join-mess-form');
  const createMessError = document.getElementById('create-mess-error');
  const joinMessError = document.getElementById('join-mess-error');

  // Storage helpers
  const getUsers = () => { try { return JSON.parse(localStorage.getItem('users') || '[]'); } catch { return []; } };
  const setUsers = (users) => localStorage.setItem('users', JSON.stringify(users));
  const getMesses = () => { try { return JSON.parse(localStorage.getItem('messes') || '{}'); } catch { return {}; } };
  const setMesses = (m) => localStorage.setItem('messes', JSON.stringify(m));
  const storageKey = (base, messId) => messId ? `${base}:${messId}` : base;

  function addSelfToMembers(messId) {
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser'));
      if (!cu) return;
      const key = storageKey('members', messId);
      const members = JSON.parse(localStorage.getItem(key) || '[]');
      if (!members.some(m => m.email === cu.email)) {
        members.push({ id: Date.now(), name: cu.name, email: cu.email, joinDate: new Date().toISOString().split('T')[0] });
        localStorage.setItem(key, JSON.stringify(members));
      }
    } catch {}
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function resetErrors() {
    if (signupError) signupError.textContent = '';
    if (loginError) loginError.textContent = '';
    if (createMessError) createMessError.textContent = '';
    if (joinMessError) joinMessError.textContent = '';
  }

  // Forgot Password
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      resetErrors();
      const loginIdOrEmail = document.getElementById('login-id').value.trim();
  
      if (!loginIdOrEmail || !loginIdOrEmail.includes('@')) {
        if (loginError) loginError.textContent = 'Please enter a valid email address to reset your password.';
        return;
      }
  
      if (window.firebaseAuth) {
        try {
          await window.firebaseAuth.sendPasswordResetEmail(loginIdOrEmail);
          if (loginError) {
            loginError.textContent = 'Password reset email sent! Please check your inbox.';
            loginError.style.color = '#b7f7b7'; // Green for success
          }
        } catch (err) {
          console.error('Firebase password reset failed', err);
          if (loginError) {
            loginError.textContent = err.message;
            loginError.style.color = '#ffb3b3'; // Red for error
          }
        }
      } else {
        if (loginError) loginError.textContent = 'Firebase is not available. Cannot reset password.';
      }
    });
  }

  // Initial state
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
  const currentMess = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();

  if (currentUser && currentMess) {
    // Already in a mess, go to dashboard
    window.location.href = 'index.html';
    return;
  }

  if (currentUser && !currentMess) {
    // Logged in but no mess selected -> show post-auth options
    const authSection = document.getElementById('auth-section');
    hide(authSection);
    show(postAuthSection);
    hide(createMessForm);
    hide(joinMessForm);
    show(chooseCreateBtn);
    show(chooseJoinBtn);
    hide(proceedDashboardBtn);
  } else {
    // No user yet -> show auth forms, default to login view
    const authSection = document.getElementById('auth-section');
    show(authSection);
    hide(postAuthSection);
    showLogin();
  }

  // Toggle helpers
  function showSignup() {
    resetErrors();
    show(signupForm);
    hide(loginForm);
  }
  function showLogin() {
    resetErrors();
    hide(signupForm);
    show(loginForm);
  }

  if (showSignupBtn) showSignupBtn.addEventListener('click', showSignup);
  if (showLoginBtn) showLoginBtn.addEventListener('click', showLogin);

  // OTP elements and setup
  const sendOtpBtn = document.getElementById('send-otp');
  const signupOtpInput = document.getElementById('signup-otp');
  const otpStatus = document.getElementById('otp-status');
  let otpCooldownUntil = 0;
  initEmailJS();

  function setOtpStatus(msg, ok = false) {
    if (otpStatus) {
      otpStatus.textContent = msg;
      otpStatus.style.color = ok ? '#b7f7b7' : '#ffb3b3';
    }
  }
  function remainingCooldown() {
    const now = Date.now();
    return Math.max(0, otpCooldownUntil - now);
  }
  function startCooldown(ms) {
    otpCooldownUntil = Date.now() + ms;
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
      const emailEl = document.getElementById('signup-email');
      const email = emailEl ? emailEl.value.trim() : '';
      if (!email) {
        setOtpStatus('Please enter your email first.');
        return;
      }
      const rem = remainingCooldown();
      if (rem > 0) {
        setOtpStatus(`Please wait ${Math.ceil(rem/1000)}s before requesting another OTP.`);
        return;
      }
      const otp = genOTP();
      try {
        await sendOtpEmail(email, otp);
        storeOTP(email, otp);
        setOtpStatus('OTP sent! Please check your email.', true);
        startCooldown(90 * 1000); // 90s cooldown
      } catch (err) {
        console.error('OTP send failed', err);
        const detail = (err && (err.text || err.message)) ? (err.text || err.message) : 'Please try again later.';
        setOtpStatus(`Failed to send OTP: ${detail}`);
      }
    });
  }

  // Signup
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetErrors();
      const name = document.getElementById('signup-name').value.trim();
      const id = document.getElementById('signup-id').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const enteredOtp = signupOtpInput ? signupOtpInput.value.trim() : '';

      if (!name || !id || !email || !password || password.length < 6) {
        if (signupError) signupError.textContent = 'Please fill all fields. Password must be at least 6 characters.';
        return;
      }

      // OTP verification (best effort)
      const rec = getStoredOTP();
      if (!rec || rec.email !== email || rec.expiry < Date.now() || hashOTP(enteredOtp) !== rec.h) {
        setOtpStatus('Invalid or expired OTP.');
        return;
      }
      clearStoredOTP();

      // Prefer Firebase Auth if available
      if (window.firebaseAuth) {
        try {
          const cred = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
          const user = cred.user;
          if (user && user.updateProfile) { await user.updateProfile({ displayName: name }); }
          localStorage.setItem('currentUser', JSON.stringify({ uid: user.uid, id, name, email }));

          // Show mess selection
          const authSection = document.getElementById('auth-section');
          hide(authSection);
          show(postAuthSection);
          hide(createMessForm);
          hide(joinMessForm);
          show(chooseCreateBtn);
          show(chooseJoinBtn);
          hide(proceedDashboardBtn);
        } catch (err) {
          console.error('Firebase signup failed', err);
          if (signupError) signupError.textContent = err && err.message ? err.message : 'Signup failed.';
        }
        return;
      }

      // Fallback: localStorage-only implementation
      const users = getUsers();
      if (users.some(u => u.id === id)) {
        if (signupError) signupError.textContent = 'This Unique ID is already taken.';
        return;
      }
      if (users.some(u => u.email === email)) {
        if (signupError) signupError.textContent = 'This email is already registered.';
        return;
      }
      users.push({ id, name, email, password });
      setUsers(users);
      localStorage.setItem('currentUser', JSON.stringify({ id, name, email }));

      // Show mess selection
      const authSection = document.getElementById('auth-section');
      hide(authSection);
      show(postAuthSection);
      hide(createMessForm);
      hide(joinMessForm);
      show(chooseCreateBtn);
      show(chooseJoinBtn);
      hide(proceedDashboardBtn);
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetErrors();
      const loginIdOrEmail = document.getElementById('login-id').value.trim();
      const password = document.getElementById('login-password').value;

      // Prefer Firebase Auth when an email is provided
      if (window.firebaseAuth && loginIdOrEmail.includes('@')) {
        try {
          const cred = await window.firebaseAuth.signInWithEmailAndPassword(loginIdOrEmail, password);
          const u = cred.user;
          localStorage.setItem('currentUser', JSON.stringify({ uid: u.uid, name: u.displayName || (u.email ? u.email.split('@')[0] : ''), email: u.email }));

          const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
          if (cm && cm.messId) {
            window.location.href = 'index.html';
            return;
          }

          // Detect if user already belongs to a mess via members:<messId>
          try {
            const cu2 = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
            let foundMessId = null;
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('members:')) {
                const messIdCandidate = key.split(':')[1];
                const members = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
                if (cu2 && members.some(m => m.email === cu2.email)) {
                  foundMessId = messIdCandidate;
                  break;
                }
              }
            }
            if (foundMessId) {
              const messesObj = getMesses();
              const role = messesObj[foundMessId] && messesObj[foundMessId].createdBy === (cu2 ? cu2.id : null) ? 'manager' : 'member';
              localStorage.setItem('currentMess', JSON.stringify({ messId: foundMessId, role }));
              window.location.href = 'index.html';
              return;
            }
          } catch {}

          // No mess yet -> show post-auth options
          const authSection = document.getElementById('auth-section');
          hide(authSection);
          show(postAuthSection);
          hide(createMessForm);
          hide(joinMessForm);
          show(chooseCreateBtn);
          show(chooseJoinBtn);
          hide(proceedDashboardBtn);
        } catch (err) {
          console.error('Firebase login failed', err);
          if (loginError) loginError.textContent = err && err.message ? err.message : 'Invalid credentials.';
        }
        return;
      }

      // Fallback: localStorage-only implementation
      const users = getUsers();
      const user = users.find(u => u.id === loginIdOrEmail || u.email === loginIdOrEmail);
      if (!user || user.password !== password) {
        if (loginError) loginError.textContent = 'Invalid credentials.';
        return;
      }
      localStorage.setItem('currentUser', JSON.stringify({ id: user.id, name: user.name, email: user.email }));

      const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
      if (cm && cm.messId) {
        window.location.href = 'index.html';
        return;
      }

      // NEW: Detect if user already belongs to a mess via members:<messId>
      try {
        const cu2 = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
        let foundMessId = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('members:')) {
            const messIdCandidate = key.split(':')[1];
            const members = (() => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } })();
            if (cu2 && members.some(m => m.email === cu2.email)) {
              foundMessId = messIdCandidate;
              break;
            }
          }
        }
        if (foundMessId) {
          const messesObj = getMesses();
          const role = messesObj[foundMessId] && messesObj[foundMessId].createdBy === (cu2 ? cu2.id : null) ? 'manager' : 'member';
          localStorage.setItem('currentMess', JSON.stringify({ messId: foundMessId, role }));
          window.location.href = 'index.html';
          return;
        }
      } catch {}

      // No mess yet -> show post-auth options
      const authSection = document.getElementById('auth-section');
      hide(authSection);
      show(postAuthSection);
      hide(createMessForm);
      hide(joinMessForm);
      show(chooseCreateBtn);
      show(chooseJoinBtn);
      hide(proceedDashboardBtn);
    });
  }

  // Choose create/join
  if (chooseCreateBtn) chooseCreateBtn.addEventListener('click', () => {
    resetErrors();
    show(createMessForm);
    hide(joinMessForm);
  });
  if (chooseJoinBtn) chooseJoinBtn.addEventListener('click', () => {
    resetErrors();
    show(joinMessForm);
    hide(createMessForm);
  });

  // Create mess (manager)
  if (createMessForm) {
    createMessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const messId = document.getElementById('create-mess-id').value.trim();
      const messPassword = document.getElementById('create-mess-password').value;
      if (!messId || !messPassword) {
        if (createMessError) createMessError.textContent = 'Please provide Mess ID and password.';
        return;
      }
      const messes = getMesses();
      if (messes[messId]) {
        if (createMessError) createMessError.textContent = 'Mess ID already exists.';
        return;
      }
      // Create mess
      const cu = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
      messes[messId] = { password: messPassword, createdBy: cu ? cu.id : null, createdAt: Date.now() };
      setMesses(messes);
      localStorage.setItem('currentMess', JSON.stringify({ messId, role: 'manager' }));
      addSelfToMembers(messId);
      window.location.href = 'index.html';
    });
  }

  // Join mess (member)
  if (joinMessForm) {
    joinMessForm.addEventListener('submit', (e) => {
      e.preventDefault();
      resetErrors();
      const messId = document.getElementById('join-mess-id').value.trim();
      const messPassword = document.getElementById('join-mess-password').value;
      const messes = getMesses();
      const mess = messes[messId];
      if (!mess) {
        if (joinMessError) joinMessError.textContent = 'Mess not found.';
        return;
      }
      if (mess.password !== messPassword) {
        if (joinMessError) joinMessError.textContent = 'Incorrect mess password.';
        return;
      }
      // Join mess as member: set role to 'member', add current user to mess-scoped members, then redirect
      localStorage.setItem('currentMess', JSON.stringify({ messId, role: 'member' }));
      const cuJoin = JSON.parse(localStorage.getItem('currentUser'));
      const membersKey = `members:${messId}`;
      const members = JSON.parse(localStorage.getItem(membersKey) || '[]');
      if (cuJoin && !members.some(m => m.email === cuJoin.email)) {
        members.push({ id: Date.now(), name: cuJoin.name, email: cuJoin.email, joinDate: new Date().toISOString().split('T')[0] });
        localStorage.setItem(membersKey, JSON.stringify(members));
      }
      window.location.href = 'index.html';
    });
  }

  if (proceedDashboardBtn) {
    proceedDashboardBtn.addEventListener('click', () => {
      const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
      if (cm && cm.messId) {
        window.location.href = 'index.html';
      }
    });
  }
  // Clear Local Data on login page navbar
  const clearLink = document.getElementById('clear-local-data');
  if (clearLink) {
    clearLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('This will delete all mess info stored locally on this device. Continue?')) {
        try {
          const keysToRemove = [
            'users',
            'messes',
            'currentUser',
            'currentMess',
            'tasks',
            'debts',
            'notices',
            'expenses',
            'mealCounts',
            'mealBudget',
            'reviews'
          ];
          const prefixRemovals = ['members:'];
          const allKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            allKeys.push(localStorage.key(i));
          }
          allKeys.forEach((key) => {
            if (keysToRemove.includes(key) || prefixRemovals.some(p => key.startsWith(p))) {
              localStorage.removeItem(key);
            }
          });
          alert('All local mess data has been cleared.');
        } catch (err) {
          console.error('Failed clearing local data', err);
        } finally {
          window.location.href = 'login.html';
        }
      }
    });
  }
});

// Duplicate DOMContentLoaded block removed to avoid conflicting logic.


// EmailJS OTP Setup
const EMAILJS_PUBLIC_KEY = '8dyObXNkH9b_b0pxk'; // keep public key only (no secret)
const EMAILJS_SERVICE_ID = 'service_64jyzq6';
const EMAILJS_TEMPLATE_ID = 'template_clgx4oc';

function initEmailJS() {
  try {
    if (window.emailjs) {
      window.emailjs.init(EMAILJS_PUBLIC_KEY);
    }
  } catch (e) { console.warn('EmailJS init failed', e); }
}

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOTP(otp) {
  // simple hash for obfuscation, not security
  let h = 0;
  for (let i = 0; i < otp.length; i++) h = ((h << 5) - h) + otp.charCodeAt(i);
  return String(h);
}

function storeOTP(email, otp, ttlMs = 15 * 60 * 1000) {
  const expiry = Date.now() + ttlMs;
  const record = { email, h: hashOTP(otp), expiry };
  localStorage.setItem('signupOTP', JSON.stringify(record));
}

function getStoredOTP() {
  try { return JSON.parse(localStorage.getItem('signupOTP')); } catch { return null; }
}

function clearStoredOTP() {
  localStorage.removeItem('signupOTP');
}

function sendOtpEmail(email, otp) {
  const expiry_time = new Date(Date.now() + 15 * 60 * 1000).toLocaleString();
  const params = {
    to_email: email,
    otp_code: otp,
    passcode: otp,
    app_name: 'MESS-MATE',
    expiry_time,
    time: expiry_time,
    message: `Your verification code is ${otp} for MESS-MATE. It expires at ${expiry_time}. Do not share this code.`
  };
  if (!window.emailjs) {
    throw new Error('EmailJS SDK not loaded');
  }
  return window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params, EMAILJS_PUBLIC_KEY);
}

// OTP handlers moved inside main DOMContentLoaded block above to prevent scope issues.