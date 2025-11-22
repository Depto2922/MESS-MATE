
// =================================================================================================
// Firebase SDK Loader and Initializer
// =================================================================================================
(function initFirebaseIfConfigured() {
  try {
    if (!window.FIREBASE_CONFIG) {
      console.info('Firebase config not found; skipping initialization');
      return;
    }
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const version = '9.23.0';
    const base = `https://www.gstatic.com/firebasejs/${version}/`;
    Promise.all([
      loadScript(base + 'firebase-app-compat.js'),
      loadScript(base + 'firebase-auth-compat.js'),
      loadScript(base + 'firebase-firestore-compat.js')
    ]).then(() => {
      try {
        if (!window.firebase || !firebase.initializeApp) {
          return console.error('Firebase SDK failed to load');
        }
        window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
        window.firebaseAuth = window.firebaseApp.auth();
        window.firestore = window.firebaseApp.firestore();
        try {
          window.firestore.settings({ experimentalForceLongPolling: true });
        } catch (e) { console.warn('Firestore settings error', e); }
        console.log('Firebase initialized');
        window.firebaseAuth.onAuthStateChanged(user => {
          window.currentFirebaseUser = user || null;
          console.log('Auth state:', user ? 'signed in' : 'signed out');
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAll);
          } else {
            initializeAll();
          }
        });
      } catch (e) { console.error('Firebase initialization error', e); }
    }).catch(err => console.error('Failed to load Firebase SDKs', err));
  } catch (e) { console.error('Firebase init wrapper error', e); }
})();

// =================================================================================================
// Main App Initializer
// =================================================================================================
function initializeAll() {
    if (!window.db) return console.error("db.js is not loaded. App cannot start.");
    initMemberManagement();
    initTaskManagement();
    initDepositManagement();
    initExpenseManagement();
    initNoticeBoard();
    initMealManagement();
    initDebtTracker();
    updateDashboardSummary();
}

// =================================================================================================
// Auth & UI Helpers
// =================================================================================================
function requireAuthAndMess() {
  const u = window.currentFirebaseUser;
  const m = getCurrentMess();
  if (!u || !m) {
    if (!window.location.pathname.endsWith('login.html')) window.location.href = 'login.html';
    return null;
  }
  return { user: u, mess: m, isManager: m.role === 'manager' };
}

function getCurrentMess() {
  try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; }
}

function addClick(rootSel, btnSel, handler) {
  const root = document.querySelector(rootSel);
  if (root) root.addEventListener('click', e => {
    if (e.target && e.target.matches(btnSel)) handler(e.target);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[s]));
}

// =================================================================================================
// Dashboard Summary
// =================================================================================================
async function updateDashboardSummary() {
    const auth = requireAuthAndMess();
    if (!auth) return;

    const deposits = await window.db.getDeposits();
    const expenses = await window.db.getExpenses();

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDeposits - totalExpenses;

    document.getElementById('total-deposits').textContent = totalDeposits.toFixed(2);
    document.getElementById('total-expenses').textContent = totalExpenses.toFixed(2);
    document.getElementById('mess-balance').textContent = balance.toFixed(2);
}


// =================================================================================================
// Member Management
// =================================================================================================
async function initMemberManagement() {
  const container = document.querySelector('#members');
  if (!container) return;
  const auth = requireAuthAndMess();
  if (!auth) return;

  const { isManager } = auth;
  const addMemberCard = document.getElementById('add-member-card');
  if (addMemberCard) addMemberCard.style.display = isManager ? 'block' : 'none';

  const memberForm = document.getElementById('member-form');
  if (memberForm && isManager) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('member-name').value;
      const email = document.getElementById('member-email').value;
      if (!name || !email) return alert('Name and email are required.');
      await window.db.addMember({ name, email, joinDate: new Date().toISOString() });
      updateMembersList();
      memberForm.reset();
    });
  }
  addClick('#members-container', '.delete-btn', (btn) => deleteMember(btn.dataset.id));
  updateMembersList();
}

async function updateMembersList() {
  const container = document.getElementById('members-container');
  if (!container) return;
  const auth = requireAuthAndMess();
  if (!auth) return;

  const members = await window.db.getMembers();
  const { user, isManager } = auth;
  container.innerHTML = members.length === 0 ? '<p>No members yet.</p>' : '';
  members.forEach(member => {
    const isSelf = member.email === user.email;
    container.innerHTML += `
      <div class="member-item">
        <div class="member-info"><h3>${escapeHtml(member.name)}</h3><p>${escapeHtml(member.email)}</p></div>
        <div class="member-actions">
          ${(isManager && !isSelf) ? `<button class="delete-btn" data-id="${member.id}">Remove</button>` : ''}
        </div>
      </div>`;
  });
}

async function deleteMember(id) {
    if (!confirm('Are you sure?')) return;
    await window.db.deleteMember(id);
    await Promise.all([updateMembersList(), populateAssignedToDropdown(), updateDashboardSummary()]);
}

// =================================================================================================
// Deposit Management
// =================================================================================================
async function initDepositManagement() {
    const container = document.querySelector('#deposits');
    if (!container) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const depositFormCard = document.getElementById('deposit-form-card');
    if(depositFormCard) depositFormCard.style.display = auth.isManager ? 'block' : 'none';

    const depositForm = document.getElementById('deposit-form');
    if (depositForm && auth.isManager) {
        depositForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('deposit-amount').value);
            const date = document.getElementById('deposit-date').value;
            if (!amount || !date) return alert('Amount and date are required.');
            await window.db.addDeposit({ amount, date, member: auth.user.displayName || auth.user.email });
            updateDepositsList();
            depositForm.reset();
        });
    }
    addClick('#deposits-table-body', '.delete-btn', async (btn) => {
        if (!auth.isManager || !confirm('Delete this deposit?')) return;
        await window.db.deleteDeposit(btn.dataset.id);
        updateDepositsList();
    });
    updateDepositsList();
}

async function updateDepositsList() {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const deposits = await window.db.getDeposits();
    tbody.innerHTML = '';
    deposits.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${new Date(d.date).toLocaleDateString()}</td>
                <td>${d.amount.toFixed(2)}</td>
                <td>${escapeHtml(d.member)}</td>
                <td>${auth.isManager ? `<button class="delete-btn" data-id="${d.id}">Delete</button>` : ''}</td>
            </tr>`;
    });
    updateDashboardSummary();
}

// =================================================================================================
// Expense Management
// =================================================================================================
async function initExpenseManagement() {
    const container = document.querySelector('#expenses');
    if (!container) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const expenseFormCard = document.getElementById('expense-form-card');
    if (expenseFormCard) expenseFormCard.style.display = auth.isManager ? 'block' : 'none';

    const expenseForm = document.getElementById('expense-form');
    if (expenseForm && auth.isManager) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const description = document.getElementById('expense-description').value;
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const date = document.getElementById('expense-date').value;
            if (!description || !amount || !date) return alert('All fields are required.');
            await window.db.addExpense({ description, amount, date });
            updateExpensesList();
            expenseForm.reset();
        });
    }
    addClick('#expenses-table-body', '.delete-btn', async (btn) => {
        if (!auth.isManager || !confirm('Delete this expense?')) return;
        await window.db.deleteExpense(btn.dataset.id);
        updateExpensesList();
    });
    updateExpensesList();
}

async function updateExpensesList() {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const expenses = await window.db.getExpenses();
    tbody.innerHTML = '';
    expenses.forEach(exp => {
        tbody.innerHTML += `
            <tr>
                <td>${new Date(exp.date).toLocaleDateString()}</td>
                <td>${escapeHtml(exp.description)}</td>
                <td>${exp.amount.toFixed(2)}</td>
                <td>${auth.isManager ? `<button class="delete-btn" data-id="${exp.id}">Delete</button>` : ''}</td>
            </tr>`;
    });
    updateDashboardSummary();
}

// =================================================================================================
// Notice Board
// =================================================================================================
async function initNoticeBoard() {
    const container = document.querySelector('#notice');
    if (!container) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const noticeFormCard = document.getElementById('notice-form-card');
    if(noticeFormCard) noticeFormCard.style.display = auth.isManager ? 'block' : 'none';

    const noticeForm = document.getElementById('notice-form');
    if (noticeForm && auth.isManager) {
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('notice-message').value;
            if (!message) return;
            await window.db.addNotice({ message, author: auth.user.displayName || auth.user.email, date: new Date().toISOString() });
            updateNoticesList();
            noticeForm.reset();
        });
    }
    addClick('#notice-board', '.delete-btn', async (btn) => {
        if (!auth.isManager || !confirm('Delete this notice?')) return;
        await window.db.deleteNotice(btn.dataset.id);
        updateNoticesList();
    });
    updateNoticesList();
}

async function updateNoticesList() {
    const noticeBoard = document.getElementById('notice-board');
    if (!noticeBoard) return;
    const auth = requireAuthAndMess();
    if(!auth) return;

    const notices = await window.db.getNotices();
    noticeBoard.innerHTML = notices.length ? '' : '<p>Notice board is empty.</p>';
    notices.forEach(notice => {
        noticeBoard.innerHTML += `
            <div class="notice-item">
                <p>${escapeHtml(notice.message)}</p>
                <small>By ${escapeHtml(notice.author)} on ${new Date(notice.date).toLocaleDateString()}</small>
                ${auth.isManager ? `<button class="delete-btn" data-id="${notice.id}">Delete</button>` : ''}
            </div>`;
    });
}

// =================================================================================================
// Task Management & Meal Management & Debts (Placeholders for brevity - assume full implementation)
// =================================================================================================
async function initTaskManagement(){ /* ... full implementation ... */ }
async function updateTasksList(){ /* ... full implementation ... */ }
async function populateAssignedToDropdown(){ /* ... full implementation ... */ }
async function initMealManagement(){ /* ... full implementation ... */ }
async function initDebtTracker(){ /* ... full implementation ... */ }

