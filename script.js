
// Firebase SDK loader and initializer
(function initFirebaseIfConfigured() {
  try {
    if (!window.FIREBASE_CONFIG) {
      console.info('Firebase config not found; skipping initialization');
      return;
    }
    function loadScript(src) {
      return new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    var version = '9.23.0';
    var base = 'https://www.gstatic.com/firebasejs/' + version + '/';
    Promise.all([
      loadScript(base + 'firebase-app-compat.js'),
      loadScript(base + 'firebase-auth-compat.js'),
      loadScript(base + 'firebase-firestore-compat.js')
    ]).then(function(){
      try {
        if (!window.firebase || !firebase.initializeApp) {
          console.error('Firebase SDK failed to load');
          return;
        }
        window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
        window.firebaseAuth = window.firebaseApp.auth();
        window.firestore = window.firebaseApp.firestore();
        try { window.firestore.settings({ experimentalForceLongPolling: true }); } catch (e) { console.warn('Firestore settings error', e); }
        console.log('Firebase initialized');
        try { window.firebaseAuth.onAuthStateChanged(function(user){ window.currentFirebaseUser = user || null; console.log('Auth state:', user ? 'signed in' : 'signed out'); }); } catch(e) { console.warn('Auth state listener error', e); }
      } catch (e) {
        console.error('Firebase initialization error', e);
      }
    }).catch(function(err){
      console.error('Failed to load Firebase SDKs', err);
    });
  } catch (e) {
    console.error('Firebase init wrapper error', e);
  }
})();

// Auth helpers
function isAuthenticated() { return !!localStorage.getItem('currentUser'); }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } }
function getCurrentMess() { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } }
function requireAuthAndMess() { const u = getCurrentUser(); const m = getCurrentMess(); if (!u || !m) { window.location.href = 'login.html'; return false; } return true; }
function logout() { try { if (window.firebaseAuth && typeof window.firebaseAuth.signOut === 'function') { window.firebaseAuth.signOut().catch(function(err){ console.warn('Firebase signOut error', err); }); } } catch(_) {} localStorage.removeItem('currentUser'); localStorage.removeItem('currentMess'); window.location.href = 'login.html'; }

// UI Helpers
function addClick(rootSel, btnSel, handler) { var root = document.querySelector(rootSel); if (!root) return; root.addEventListener('click', function(e){ var t = e.target; if (t && t.matches(btnSel)) handler(t); }); }
function renderTable(tbodySel, items, rowHtmlFn) { var body = document.querySelector(tbodySel); if (!body) return; body.innerHTML=''; for (var i=0;i<items.length;i++){ var tr = document.createElement('tr'); tr.innerHTML = rowHtmlFn(items[i]); body.appendChild(tr);} }
function escapeHtml(str) {
  return String(str).replace(/[&<>\"]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[s]);
}
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(d) {
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Member Management
async function initMemberManagement() {
  const memberContainer = document.querySelector('.member-container');
  if (!memberContainer) return;
  if (!requireAuthAndMess()) return;

  const currentMess = getCurrentMess();
  const isManager = currentMess && currentMess.role === 'manager';
  
  const addMemberCard = document.getElementById('add-member-card');
  if(addMemberCard) {
      if(!isManager) addMemberCard.style.display = 'none';
  }

  const memberForm = document.getElementById('member-form');
  if (memberForm && isManager) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const member = {
        name: document.getElementById('member-name').value,
        email: document.getElementById('member-email').value,
        phone: document.getElementById('member-phone').value,
        notes: document.getElementById('member-notes').value,
        joinDate: new Date().toISOString().split('T')[0]
      };
      if (!member.name || !member.email) return alert('Name and email are required.');
      await window.db.addMember(member);
      updateMembersList();
      memberForm.reset();
    });
  }

  updateMembersList();
}

async function updateMembersList() {
  const membersContainer = document.getElementById('members-container');
  if (!membersContainer) return;

  const members = await window.db.getMembers();
  const currentUser = getCurrentUser();
  const isManager = getCurrentMess()?.role === 'manager';

  membersContainer.innerHTML = members.length === 0 ? '<p>No members added yet.</p>' : '';
  
  members.forEach(member => {
    const initials = member.name.split(' ').map(n => n[0]).join('');
    const isSelf = currentUser && member.email === currentUser.email;
    const item = document.createElement('div');
    item.className = 'member-item';
    item.innerHTML = `
      <div class="member-info">
        <div class="member-avatar">${initials}</div>
        <div>
          <h3>${member.name}</h3>
          <p>${member.email}</p>
        </div>
      </div>
      <div class="member-actions">
        ${isSelf ? `<button class="edit-btn" data-id="${member.id}">Edit</button>` : ''}
        ${isManager ? `<button class="delete-btn" data-id="${member.id}">Delete</button>` : ''}
      </div>
    `;
    membersContainer.appendChild(item);
  });

  addClick('#members-container', '.delete-btn', (btn) => deleteMember(btn.dataset.id));
  addClick('#members-container', '.edit-btn', (btn) => editMember(btn.dataset.id));
}

async function deleteMember(id) {
  if (getCurrentMess()?.role !== 'manager') return alert('Only managers can delete members.');
  if (confirm('Are you sure you want to remove this member?')) {
    await window.db.deleteMember(id);
    updateMembersList();
  }
}

async function editMember(id) {
    const members = await window.db.getMembers();
    const member = members.find(m => m.id === id);
    if(!member) return alert("Member not found");

    const newPhone = prompt('Update phone:', member.phone || '');
    const newNotes = prompt('Update notes:', member.notes || '');

    await window.db.updateMember(id, { phone: newPhone, notes: newNotes });
    updateMembersList();
}


// Task Management
async function initTaskManagement() {
  const taskContainer = document.querySelector('.task-container');
  if (!taskContainer) return;
  if (!requireAuthAndMess()) return;

  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const task = {
        name: document.getElementById('task-name').value,
        assignedTo: document.getElementById('assigned-to').value,
        dueDate: document.getElementById('due-date').value,
        description: document.getElementById('task-description').value,
        status: 'pending',
        createdDate: new Date().toISOString().split('T')[0]
      };
      if (!task.name || !task.assignedTo || !task.dueDate) return alert('Please fill all required fields');
      await window.db.addTask(task);
      updateTasksList();
      taskForm.reset();
    });
  }

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
    item.className = 'task-item';
    item.innerHTML = `
      <div>
        <h3>${task.name}</h3>
        <p>Assigned to: ${task.assignedTo}</p>
        <p>Due: ${task.dueDate}</p>
        ${task.description ? `<p>${task.description}</p>` : ''}
      </div>
      <div class="task-actions">
        <button class="complete-btn" data-id="${task.id}">${task.status === 'completed' ? 'Reopen' : 'Complete'}</button>
        <button class="delete-btn" data-id="${task.id}">Delete</button>
      </div>
    `;
    tasksContainer.appendChild(item);
  });

  addClick('#tasks-container', '.complete-btn', (btn) => toggleTaskStatus(btn.dataset.id));
  addClick('#tasks-container', '.delete-btn', (btn) => deleteTask(btn.dataset.id));
}

async function toggleTaskStatus(id) {
  const tasks = await window.db.getTasks();
  const task = tasks.find(t => t.id === id);
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


