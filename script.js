
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
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
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
          console.error('Firebase SDK failed to load');
          return;
        }
        window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
        window.firebaseAuth = window.firebaseApp.auth();
        window.firestore = window.firebaseApp.firestore();

        // Use long-polling to avoid connection issues on restrictive networks
        try {
          window.firestore.settings({ experimentalForceLongPolling: true });
        } catch (e) {
          console.warn('Firestore settings error', e);
        }

        console.log('Firebase initialized');

        // Listen for auth state changes
        try {
          window.firebaseAuth.onAuthStateChanged(user => {
            window.currentFirebaseUser = user || null;
            console.log('Auth state:', user ? 'signed in' : 'signed out');
            // Re-initialize UI components that depend on user auth state
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initializeAll);
            } else {
              initializeAll();
            }
          });
        } catch (e) {
          console.warn('Auth state listener error', e);
        }
      } catch (e) {
        console.error('Firebase initialization error', e);
      }
    }).catch(err => {
      console.error('Failed to load Firebase SDKs', err);
    });
  } catch (e) {
    console.error('Firebase init wrapper error', e);
  }
})();


// =================================================================================================
// Main App Initializer
// =================================================================================================
function initializeAll() {
    if (!window.db) {
        console.error("Database helper (db.js) is not loaded. App cannot start.");
        return;
    }
    // Call all feature-specific initializers
    initMemberManagement();
    initTaskManagement();
    initDepositManagement();
    initExpenseManagement();
    initNoticeBoard();
    initMealManagement();
    initDebtTracker();
    updateDashboardSummary();
}

document.addEventListener('DOMContentLoaded', initializeAll);


// =================================================================================================
// Auth & UI Helpers
// =================================================================================================
function requireAuthAndMess() {
  const u = window.currentFirebaseUser;
  const m = getCurrentMess();
  if (!u || !m) {
    console.log("Authentication or Mess details missing. Redirecting to login.");
    window.location.href = 'login.html';
    return false;
  }
  return { user: u, mess: m };
}

function getCurrentMess() {
  try {
    return JSON.parse(localStorage.getItem('currentMess'));
  } catch {
    return null;
  }
}

function addClick(rootSel, btnSel, handler) {
  const root = document.querySelector(rootSel);
  if (root) {
    root.addEventListener('click', e => {
      if (e.target && e.target.matches(btnSel)) {
        handler(e.target);
      }
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}


// =================================================================================================
// Member Management
// =================================================================================================
async function initMemberManagement() {
  const container = document.querySelector('#members');
  if (!container) return;
  const auth = requireAuthAndMess();
  if (!auth) return;

  const { mess } = auth;
  const isManager = mess.role === 'manager';

  const addMemberCard = document.getElementById('add-member-card');
  if (addMemberCard) {
    addMemberCard.style.display = isManager ? 'block' : 'none';
  }

  const memberForm = document.getElementById('member-form');
  if (memberForm && isManager) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('member-name').value;
      const email = document.getElementById('member-email').value;
      if (!name || !email) return alert('Name and email are required.');

      const member = { name, email, joinDate: new Date().toISOString() };
      await window.db.addMember(member);
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
  const { mess, user } = auth;
  const isManager = mess.role === 'manager';

  container.innerHTML = members.length === 0 ? '<p>No members yet.</p>' : '';
  members.forEach(member => {
    const isSelf = member.email === user.email;
    const memberEl = document.createElement('div');
    memberEl.className = 'member-item';
    memberEl.innerHTML = `
      <div class="member-info">
        <h3>${escapeHtml(member.name)}</h3>
        <p>${escapeHtml(member.email)}</p>
      </div>
      <div class="member-actions">
        ${(isManager && !isSelf) ? `<button class="delete-btn" data-id="${member.id}">Remove</button>` : ''}
      </div>
    `;
    container.appendChild(memberEl);
  });
}

async function deleteMember(id) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    await window.db.deleteMember(id);
    await Promise.all([updateMembersList(), populateAssignedToDropdown(), updateDashboardSummary()]);
}

// =================================================================================================
// Deposit Management
// =================================================================================================
async function initDepositManagement() {
    const container = document.querySelector('#deposits');
    if (!container) return;
    if (!requireAuthAndMess()) return;

    const depositForm = document.getElementById('deposit-form');
    if (depositForm) {
        depositForm.addEventListener('submit', async(e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('deposit-amount').value);
            const date = document.getElementById('deposit-date').value;
            if (!amount || !date) return alert('Amount and date are required.');
            
            await window.db.addDeposit({ amount, date });
            updateDepositsList();
            updateDashboardSummary();
            depositForm.reset();
        });
    }
    updateDepositsList();
}

async function updateDepositsList() {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;
    if (!requireAuthAndMess()) return;

    const deposits = await window.db.getDeposits();
    tbody.innerHTML = '';
    deposits.forEach(d => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(d.date).toLocaleDateString()}</td>
            <td>${d.amount.toFixed(2)}</td>
            <td><button class="delete-btn" data-id="${d.id}">Delete</button></td>
        `;
    });
    addClick('#deposits-table-body', '.delete-btn', async (btn) => {
        if (!confirm('Delete this deposit?')) return;
        await window.db.deleteDeposit(btn.dataset.id);
        updateDepositsList();
        updateDashboardSummary();
    });
}

// =================================================================================================
// Task Management
// =================================================================================================
async function initTaskManagement() {
  const container = document.querySelector('#tasks');
  if (!container) return;
  if (!requireAuthAndMess()) return;

  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const task = {
        name: document.getElementById('task-name').value,
        assignedTo: document.getElementById('assigned-to').value,
        dueDate: document.getElementById('due-date').value,
        status: 'pending'
      };
      if (!task.name || !task.assignedTo || !task.dueDate) return alert('All fields are required.');
      await window.db.addTask(task);
      updateTasksList();
      taskForm.reset();
    });
  }
  addClick('#tasks-container', '.complete-btn', (btn) => toggleTaskStatus(btn.dataset.id));
  addClick('#tasks-container', '.delete-btn', (btn) => deleteTask(btn.dataset.id));
  populateAssignedToDropdown();
  updateTasksList();
}

async function populateAssignedToDropdown() {
  const assignedToSelect = document.getElementById('assigned-to');
  if (!assignedToSelect) return;
  const members = await window.db.getMembers();
  assignedToSelect.innerHTML = '<option value="">Assign to...</option>';
  members.forEach(member => {
    const option = document.createElement('option');
    option.value = member.name;
    option.textContent = member.name;
    assignedToSelect.appendChild(option);
  });
}

async function updateTasksList() {
  const tasksContainer = document.getElementById('tasks-container');
  if (!tasksContainer) return;
  const tasks = await window.db.getTasks();
  tasksContainer.innerHTML = tasks.length ? '' : '<p>No tasks added yet.</p>';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.status}`;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(task.name)}</h3>
        <p>Assigned to: ${escapeHtml(task.assignedTo)} | Due: ${task.dueDate}</p>
      </div>
      <div class="task-actions">
        <button class="complete-btn" data-id="${task.id}">${task.status === 'completed' ? 'Reopen' : 'Complete'}</button>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
    tasksContainer.appendChild(item);
  });
}

async function toggleTaskStatus(id) {
  const task = (await window.db.getTasks()).find(t => t.id === id);
  if (task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await window.db.updateTask(id, { status: newStatus });
    updateTasksList();
  }
}

async function deleteTask(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    await window.db.deleteTask(id);
    updateTasksList();
  }
}

// =================================================================================================
// Notice Board
// =================================================================================================
async function initNoticeBoard() {
    const container = document.querySelector('#notice');
    if (!container) return;
    const auth = requireAuthAndMess();
    if (!auth) return;

    const noticeForm = document.getElementById('notice-form');
    if (noticeForm) {
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('notice-message').value;
            if (!message) return;
            await window.db.addNotice({
                message,
                author: auth.user.displayName || auth.user.email,
                date: new Date().toISOString()
            });
            updateNoticesList();
            noticeForm.reset();
        });
    }
    addClick('#notice-board', '.delete-btn', async (btn) => {
        if (!confirm('Delete this notice?')) return;
        await window.db.deleteNotice(btn.dataset.id);
        updateNoticesList();
    });
    updateNoticesList();
}

async function updateNoticesList() {
    const noticeBoard = document.getElementById('notice-board');
    if (!noticeBoard) return;
    const notices = await window.db.getNotices();
    noticeBoard.innerHTML = notices.length ? '' : '<p>The notice board is empty.</p>';
    notices.forEach(notice => {
        const noticeEl = document.createElement('div');
        noticeEl.className = 'notice-item';
        noticeEl.innerHTML = `
            <p>${escapeHtml(notice.message)}</p>
            <small>Posted by ${escapeHtml(notice.author)} on ${new Date(notice.date).toLocaleDateString()}</small>
            <button class="delete-btn" data-id="${notice.id}">Delete</button>
        `;
        noticeBoard.appendChild(noticeEl);
    });
}


// =================================================================================================
// Dummy/Placeholder functions for other features to prevent errors
// These should be implemented similarly to the ones above
// =================================================================================================
async function initExpenseManagement() {
    console.log("Expense Management Initialized (Placeholder)");
    const container = document.querySelector('#expenses');
    if (!container) return;
    // TODO: Implement full logic like other sections
}

async function initMealManagement() {
    console.log("Meal Management Initialized (Placeholder)");
    const container = document.querySelector('#meals');
    if (!container) return;
     // TODO: Implement full logic like other sections
}

async function initDebtTracker() {
    console.log("Debt Tracker Initialized (Placeholder)");
    const container = document.querySelector('#debts');
    if (!container) return;
    // TODO: Implement full logic like other sections
}

async function updateDashboardSummary() {
    console.log("Dashboard Summary Updated (Placeholder)");
    // TODO: Fetch all data (deposits, expenses, etc.) and calculate summaries.
}

