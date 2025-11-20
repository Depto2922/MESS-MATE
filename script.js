// Page-specific initializers have been moved to separate JS files per page (index.js, members.js, tasks.js, expenses.js, meals.js).

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


// Meal Budget Calculator
function initMealBudgetCalculator() {
  const calculateBtn = document.getElementById('calculate-budget');
  if (!calculateBtn) return;
  
  calculateBtn.addEventListener('click', () => {
    const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value) || 3000;
    const daysCount = parseInt(document.getElementById('days-count').value) || 30;
    const mealsPerDay = parseInt(document.getElementById('meals-per-day').value) || 3;
    
    // Get already spent amount from expense tracker
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const alreadySpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate remaining budget
    const remainingBudget = Math.max(0, monthlyBudget - alreadySpent);
    
    // Calculate budgets
    const dailyBudget = remainingBudget / daysCount;
    const perMealBudget = dailyBudget / mealsPerDay;
    
    // Format for display
    const formattedMonthly = monthlyBudget.toLocaleString();
    const formattedSpent = alreadySpent.toLocaleString();
    const formattedRemaining = remainingBudget.toLocaleString();
    const formattedDaily = dailyBudget.toFixed(2);
    const formattedPerMeal = perMealBudget.toFixed(2);
    
    // Update display
    document.getElementById('display-monthly').textContent = `৳${formattedMonthly}`;
    document.getElementById('display-daily').textContent = `৳${formattedDaily}`;
    document.getElementById('display-per-meal').textContent = `৳${formattedPerMeal}`;
    
    // Add spent amount to the budget result
    let budgetResultHTML = document.getElementById('budget-result').innerHTML;
    
    // Check if spent amount is already displayed
    if (!budgetResultHTML.includes('Already Spent')) {
      // Insert after monthly budget
      const monthlyBudgetElement = document.querySelector('#budget-result p:first-of-type');
      const spentElement = document.createElement('p');
      spentElement.innerHTML = `Already Spent: <span id="display-spent">৳${formattedSpent}</span>`;
      const remainingElement = document.createElement('p');
      remainingElement.innerHTML = `Remaining Budget: <span id="display-remaining">৳${formattedRemaining}</span>`;
      
      if (monthlyBudgetElement) {
        monthlyBudgetElement.insertAdjacentElement('afterend', spentElement);
        spentElement.insertAdjacentElement('afterend', remainingElement);
      }
    } else {
      // Update existing elements
      document.getElementById('display-spent').textContent = `৳${formattedSpent}`;
      document.getElementById('display-remaining').textContent = `৳${formattedRemaining}`;
    }
    
    // Determine budget range and recommended plan
    let recommendedPlan = '';
    let budgetRange = '';
    
    if (perMealBudget < 41) {
      recommendedPlan = 'Below Basic Survival Plan - Consider increasing your budget';
      budgetRange = 'below ৳41';
    } else if (perMealBudget >= 41 && perMealBudget <= 50) {
      recommendedPlan = 'Basic Survival Plan';
      budgetRange = '৳41-50';
    } else if (perMealBudget > 50 && perMealBudget <= 60) {
      recommendedPlan = 'Balanced Low-Cost Plan';
      budgetRange = '৳51-60';
    } else if (perMealBudget > 60 && perMealBudget <= 70) {
      recommendedPlan = 'Standard Student Plan';
      budgetRange = '৳61-70';
    } else if (perMealBudget > 70 && perMealBudget <= 80) {
      recommendedPlan = 'Better Nutrition Plan';
      budgetRange = '৳71-80';
    } else if (perMealBudget > 80 && perMealBudget <= 90) {
      recommendedPlan = 'Comfort Student Plan';
      budgetRange = '৳81-90';
    } else {
      recommendedPlan = 'Premium Plan - You can afford better than our suggestions';
      budgetRange = 'above ৳90';
    }
    
    document.getElementById('display-budget-range').textContent = budgetRange;
    document.getElementById('recommended-plan').textContent = recommendedPlan;
    
    // Show the result section
    document.getElementById('budget-result').style.display = 'block';
    
    // Highlight the recommended meal plan
    highlightRecommendedPlan(recommendedPlan);
  });
}

function highlightRecommendedPlan(planName) {
  // Remove any existing highlights
  document.querySelectorAll('.meal-plan').forEach(plan => {
    plan.classList.remove('highlighted-plan');
  });
  
  // Find and highlight the matching plan
  var headings = document.querySelectorAll('.meal-plan h3');
  for (var j = 0; j < headings.length; j++) {
    var heading = headings[j];
    if (heading.textContent.indexOf(planName) !== -1) {
      var container = heading.closest('.meal-plan');
      if (container) { container.classList.add('highlighted-plan'); }
      heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// Auth helpers
function isAuthenticated() { return !!localStorage.getItem('currentUser'); }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } }
function getCurrentMess() { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } }
function requireAuthAndMess() { const u = getCurrentUser(); const m = getCurrentMess(); if (!u || !m) { window.location.href = 'login.html'; return false; } return true; }
function logout() { try { if (window.firebaseAuth && typeof window.firebaseAuth.signOut === 'function') { window.firebaseAuth.signOut().catch(function(err){ console.warn('Firebase signOut error', err); }); } } catch(_) {} localStorage.removeItem('currentUser'); localStorage.removeItem('currentMess'); window.location.href = 'login.html'; }
function storageKey(base) { const cm = getCurrentMess(); return cm ? `${base}:${cm.messId}` : base; }
function getJSON(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : (def||null); } catch(_) { return def||null; } }
function setJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj||[])); }
function pushJSON(key, item) { var arr = getJSON(key, []); arr.push(item); setJSON(key, arr); return arr; }
function removeById(key, id) { var arr = getJSON(key, []); var out = []; for (var i=0;i<arr.length;i++){ if (String(arr[i].id) !== String(id)) out.push(arr[i]); } setJSON(key, out); return out; }
function addClick(rootSel, btnSel, handler) { var root = document.querySelector(rootSel); if (!root) return; root.addEventListener('click', function(e){ var t = e.target; if (t && t.matches(btnSel)) handler(t); }); }
function renderTable(tbodySel, items, rowHtmlFn) { var body = document.querySelector(tbodySel); if (!body) return; body.innerHTML=''; for (var i=0;i<items.length;i++){ var tr = document.createElement('tr'); tr.innerHTML = rowHtmlFn(items[i]); body.appendChild(tr);} }

// Member Management Functionality
function initMemberManagement() {
  // Check if we're on the members page
  const memberContainer = document.querySelector('.member-container');
  if (!memberContainer) return;

  if (!requireAuthAndMess()) return;

  console.log('Member management initialized');

  // Initialize data storage if not exists (mess-scoped)
  const membersKey = storageKey('members');
  if (!localStorage.getItem(membersKey)) {
    localStorage.setItem(membersKey, JSON.stringify([]));
  }

  // Update Remove Member info card messaging based on role
  const currentMess = getCurrentMess();
  const isManager = currentMess && currentMess.role === 'manager';
  const removeInfoCard = document.querySelector('.member-form');
  if (removeInfoCard) {
    const headingEl = removeInfoCard.querySelector('h2');
    const paragraphEl = removeInfoCard.querySelector('p');
    if (isManager) {
      if (headingEl) headingEl.textContent = 'Remove Member';
      if (paragraphEl) paragraphEl.textContent = 'Select a member from the list below and click Delete.';
    } else {
      if (headingEl) headingEl.textContent = 'Remove Member (Manager Only)';
      if (paragraphEl) paragraphEl.textContent = 'This feature is only available to the mess manager.';
    }
  }

  // Add member form submission (manager only)
  const memberForm = document.getElementById('member-form');
  if (memberForm) {
    const currentMess = getCurrentMess();
    const isManager = currentMess && currentMess.role === 'manager';
    if (!isManager) {
      // Hide add form for non-managers
      memberForm.style.display = 'none';
    } else {
      memberForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('member-name').value;
        const email = document.getElementById('member-email').value;
        const phone = document.getElementById('member-phone').value;
        const notes = document.getElementById('member-notes').value;

        if (!name || !email) {
          alert('Please fill all required fields');
          return;
        }

        const member = {
          id: Date.now(),
          name,
          email,
          phone,
          notes,
          joinDate: new Date().toISOString().split('T')[0]
        };

        const members = JSON.parse(localStorage.getItem(membersKey));
        members.push(member);
        localStorage.setItem(membersKey, JSON.stringify(members));
        updateMembersList();
        memberForm.reset();
      });
    }
  }

  // Initialize UI
  updateMembersList();
}

// Update members list in the UI
function updateMembersList() {
  const membersContainer = document.getElementById('members-container');
  if (!membersContainer) return;

  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  const currentUser = getCurrentUser();
  const currentMess = getCurrentMess();
  const isManager = currentMess && currentMess.role === 'manager';

  membersContainer.innerHTML = '';

  if (members.length === 0) {
    membersContainer.innerHTML = '<p>No members added yet.</p>';
    return;
  }

  members.forEach(member => {
    const initials = member.name.split(' ').map(n => n[0]).join('');
    const isSelf = currentUser && member.email === currentUser.email;
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    memberItem.innerHTML = `
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
    membersContainer.appendChild(memberItem);
  });

  // Add delete functionality (manager only)
  document.querySelectorAll('#members-container .delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteMember(id);
    });
  });

  // Add edit functionality (self only)
  document.querySelectorAll('#members-container .edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const key = storageKey('members');
      const members = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = members.findIndex(m => String(m.id) === String(id));
      if (idx === -1) return;
      const member = members[idx];
      const currentUser = getCurrentUser();
      if (!currentUser || member.email !== currentUser.email) return; // guard
      const newPhone = prompt('Update phone:', member.phone || '');
      const newNotes = prompt('Update notes:', member.notes || '');
      members[idx].phone = newPhone;
      members[idx].notes = newNotes;
      localStorage.setItem(key, JSON.stringify(members));
      updateMembersList();
    });
  });
}

// Delete a member (manager only)
function deleteMember(id) {
  const key = storageKey('members');
  const currentMess = getCurrentMess();
  const isManager = currentMess && currentMess.role === 'manager';
  if (!isManager) {
    alert('Only the manager can remove members.');
    return;
  }
  const members = JSON.parse(localStorage.getItem(key) || '[]');
  const updatedMembers = members.filter(member => member.id != id);
  localStorage.setItem(key, JSON.stringify(updatedMembers));
  updateMembersList();
}

// Task Management Functionality
function initTaskManagement() {
  // Check if we're on the tasks page
  const taskContainer = document.querySelector('.task-container');
  if (!taskContainer) return;

  if (!requireAuthAndMess()) return;

  console.log('Task management initialized');
  
  // Initialize data storage if not exists
  if (!localStorage.getItem('tasks')) {
    localStorage.setItem('tasks', JSON.stringify([]));
  }
  
  // Add task form submission
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = document.getElementById('task-name').value;
      const assignedTo = document.getElementById('assigned-to').value;
      const dueDate = document.getElementById('due-date').value;
      const description = document.getElementById('task-description').value;
      
      if (!name || !assignedTo || !dueDate) {
        alert('Please fill all required fields');
        return;
      }
      
      const task = {
        id: Date.now(),
        name,
        assignedTo,
        dueDate,
        description,
        status: 'pending',
        createdDate: new Date().toISOString().split('T')[0]
      };
      
      // Save task
      const tasks = JSON.parse(localStorage.getItem('tasks'));
      tasks.push(task);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      
      // Update UI
      updateTasksList();
      
      // Reset form
      taskForm.reset();
    });
  }
  
  // Populate the assigned-to dropdown with members
  populateAssignedToDropdown();
  
  // Initialize UI
  updateTasksList();
}

// Populate the assigned-to dropdown with members from localStorage
function populateAssignedToDropdown() {
  const assignedToSelect = document.getElementById('assigned-to');
  if (!assignedToSelect) return;
  
  // Clear existing options except the first one
  while (assignedToSelect.options.length > 1) {
    assignedToSelect.remove(1);
  }
  
  // Get members from localStorage (mess-scoped)
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  
  // Add members to dropdown
  members.forEach(member => {
    const option = document.createElement('option');
    option.value = member.name;
    option.textContent = member.name;
    assignedToSelect.appendChild(option);
  });
}

// Update tasks list in the UI
function updateTasksList() {
  const tasksContainer = document.getElementById('tasks-container');
  if (!tasksContainer) return;
  
  const tasks = JSON.parse(localStorage.getItem('tasks'));
  tasksContainer.innerHTML = '';
  
  if (tasks.length === 0) {
    tasksContainer.innerHTML = '<p>No tasks added yet.</p>';
    return;
  }
  
  tasks.forEach(task => {
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.innerHTML = `
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
    tasksContainer.appendChild(taskItem);
  });
  
  // Add complete and delete functionality
  document.querySelectorAll('#tasks-container .complete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      toggleTaskStatus(id);
    });
  });
  
  document.querySelectorAll('#tasks-container .delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteTask(id);
    });
  });
}

// Toggle task status
function toggleTaskStatus(id) {
  const tasks = JSON.parse(localStorage.getItem('tasks'));
  const taskIndex = tasks.findIndex(task => task.id == id);
  
  if (taskIndex !== -1) {
    tasks[taskIndex].status = tasks[taskIndex].status === 'completed' ? 'pending' : 'completed';
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateTasksList();
  }
}

// Delete a task
function deleteTask(id) {
  const tasks = JSON.parse(localStorage.getItem('tasks'));
  const updatedTasks = tasks.filter(task => task.id != id);
  localStorage.setItem('tasks', JSON.stringify(updatedTasks));
  
  updateTasksList();
}

// Debt Tracker Functionality
function initDebtTracker() {
  // Check if we're on the index page with debt form
  const debtForm = document.getElementById('debt-form');
  if (!debtForm) return;
  
  console.log('Debt tracker initialized');
  
  // Initialize data storage (mess-scoped)
  const debtsKey = storageKey('debts');
  if (!localStorage.getItem(debtsKey)) {
    localStorage.setItem(debtsKey, JSON.stringify([]));
  }

  // Populate member select (payer only)
  const fromSel = document.getElementById('debt-from');
  const amtInput = document.getElementById('debt-amount');
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  if (fromSel) {
    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.email})`;
      fromSel.appendChild(opt);
    });
  }



  var debtRequestsKey = storageKey('debtRequests');
  if (!localStorage.getItem(debtRequestsKey)) { localStorage.setItem(debtRequestsKey, JSON.stringify([])); }

  // Add debt request: receiver (current user) selects payer and amount
  debtForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var cu = getCurrentUser();
    var me = null; for (var i=0;i<members.length;i++){ if (members[i].email === (cu?cu.email:'')) { me = members[i]; break; } }
    if (!me) { alert('Join the mess first'); return; }
    var fromId = fromSel ? fromSel.value : '';
    var amountVal = amtInput ? parseFloat(amtInput.value) : 0;
    if (!fromId || !amountVal || amountVal <= 0) { alert('Please select member and enter a valid amount'); return; }
    var fromMember = members.find(function(m){ return String(m.id) === String(fromId); });
    var toMember = me;
    var dateStr = new Date().toISOString().split('T')[0];

    var req = { id: Date.now(), fromId: fromId, toId: toMember.id, amount: amountVal, date: dateStr, status: 'pending',
                fromName: fromMember ? fromMember.name : 'Unknown', fromEmail: fromMember ? fromMember.email : '',
                toName: toMember ? toMember.name : 'Unknown', toEmail: toMember ? toMember.email : '' };
    var reqs = JSON.parse(localStorage.getItem(debtRequestsKey) || '[]');
    reqs.push(req);
    localStorage.setItem(debtRequestsKey, JSON.stringify(reqs));

    // Update UI
    updateDebtRequestsUI();

    // Reset form
    e.target.reset();
  });
  
  // Initialize UI
  updateDebtRequestsUI();
}

// Notice Board Functionality
function initNoticeBoard() {
  const noticeSection = document.getElementById('notice');
  if (!noticeSection) return;
  
  console.log('Notice board initialized');
  
  // Initialize data storage if not exists
  if (!localStorage.getItem('notices')) {
    localStorage.setItem('notices', JSON.stringify([]));
  }
  
  // Get notice elements
  const noticeTextarea = noticeSection.querySelector('textarea');
  const postButton = noticeSection.querySelector('button');
  
  // Create notices container if it doesn't exist
  let noticesContainer = noticeSection.querySelector('.notices-container');
  if (!noticesContainer) {
    noticesContainer = document.createElement('div');
    noticesContainer.className = 'notices-container';
    noticeSection.appendChild(noticesContainer);
  }
  
  // Add post button functionality
  postButton.addEventListener('click', function() {
    const noticeText = noticeTextarea.value.trim();
    
    if (!noticeText) {
      alert('Please enter a notice before posting');
      return;
    }
    
    const notice = {
      id: Date.now(),
      text: noticeText,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    };
    
    // Save notice
    const notices = JSON.parse(localStorage.getItem('notices'));
    notices.push(notice);
    localStorage.setItem('notices', JSON.stringify(notices));
    
    // Update UI
    updateNoticesDisplay();
    
    // Reset textarea
    noticeTextarea.value = '';
  });
  
  // Initialize UI
  updateNoticesDisplay();
}

// Update notices display
function updateNoticesDisplay() {
  const noticeSection = document.getElementById('notice');
  if (!noticeSection) return;
  
  const noticesContainer = noticeSection.querySelector('.notices-container');
  if (!noticesContainer) return;
  
  const notices = JSON.parse(localStorage.getItem('notices'));
  noticesContainer.innerHTML = '';
  
  if (notices.length === 0) {
    noticesContainer.innerHTML = '<p class="no-notices">No notices posted yet.</p>';
    return;
  }
  
  // Sort notices by date (newest first)
  notices.sort((a, b) => b.id - a.id);
  
  notices.forEach(notice => {
    const noticeItem = document.createElement('div');
    noticeItem.className = 'notice-item';
    noticeItem.innerHTML = `
      <div class="notice-content">
        <p>${notice.text}</p>
        <div class="notice-meta">
          <span class="notice-date">${notice.date} at ${notice.time}</span>
        </div>
      </div>
      <button class="delete-notice-btn" data-id="${notice.id}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    noticesContainer.appendChild(noticeItem);
  });
  
  // Add delete functionality
  document.querySelectorAll('.delete-notice-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteNotice(id);
    });
  });
  initNoticeTicker();
}

function initNoticeTicker() {
  const ticker = document.getElementById('notice-ticker');
  if (!ticker) return;
  let track = ticker.querySelector('.ticker-track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'ticker-track';
    ticker.appendChild(track);
  }
  const notices = JSON.parse(localStorage.getItem('notices') || '[]');
  const texts = notices.length ? notices.map(n => n.text) : ['No notices posted yet'];
  const joined = texts.join(' • ');
  track.innerHTML = `${escapeHtml(joined)} \u00A0\u00A0 ${escapeHtml(joined)}`;
  void track.offsetWidth;
  const distancePx = track.offsetWidth * 2;
  const pxPerSec = 140;
  const duration = distancePx / pxPerSec;
  track.style.animationDuration = `${duration}s`;
}

// Delete a notice
function deleteNotice(id) {
  const notices = JSON.parse(localStorage.getItem('notices'));
  const updatedNotices = notices.filter(notice => notice.id != id);
  localStorage.setItem('notices', JSON.stringify(updatedNotices));
  
  updateNoticesDisplay();
}

// Update debts list in the UI
function updateDebtsList() {
  const debtTable = document.querySelector('#debt-table tbody');
  if (!debtTable) return;
  const debtsKey = storageKey('debts');
  const debts = JSON.parse(localStorage.getItem(debtsKey) || '[]').sort((a,b)=>b.id - a.id);
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  debtTable.innerHTML = '';
  debts.forEach(debt => {
    const from = members.find(m => String(m.id) === String(debt.fromId));
    const to = members.find(m => String(m.id) === String(debt.toId));
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${debt.date || ''}</td>
      <td>${from ? from.name : 'Unknown'}</td>
      <td>${to ? to.name : 'Unknown'}</td>
      <td>${debt.amount} BDT</td>
      <td>
        <button type="button" class="delete-btn" data-id="${debt.id}">Delete</button>
      </td>
    `;
    debtTable.appendChild(row);
  });
  document.querySelectorAll('#debt-table .delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteDebt(id);
    });
  });
}

// Delete a debt
function deleteDebt(id) {
  const debtsKey = storageKey('debts');
  const debts = JSON.parse(localStorage.getItem(debtsKey) || '[]');
  const updatedDebts = debts.filter(debt => String(debt.id) !== String(id));
  localStorage.setItem(debtsKey, JSON.stringify(updatedDebts));
  updateDebtsList();
}

function updateDebtRequestsUI() {
  var container = document.getElementById('debt-requests');
  if (!container) return;
  var countEl = document.getElementById('debt-request-count');
  var listEl = document.getElementById('debt-requests-list');
  var debtRequestsKey = storageKey('debtRequests');
  var reqs = getJSON(debtRequestsKey, []);
  var cu = getCurrentUser();
  var members = getJSON(storageKey('members'), []);
  var me = null;
  for (var i=0;i<members.length;i++){ if (members[i].email === (cu ? cu.email : '')) { me = members[i]; break; } }
  var myId = me ? String(me.id) : null;
  var pending = [];
  for (var j=0;j<reqs.length;j++){ var r=reqs[j]; if (r.status==='pending' && (String(r.fromId)===myId || r.fromEmail=== (cu?cu.email:''))) pending.push(r); }
  if (countEl) countEl.textContent = String(pending.length);
  if (listEl) {
    listEl.innerHTML = '';
    for (var k=0;k<pending.length;k++){
      var r = pending[k];
      var row = document.createElement('div');
      row.innerHTML = '<div>'+escapeHtml(r.fromName)+' → '+escapeHtml(r.toName)+' • '+r.amount+' BDT • '+escapeHtml(r.date)+'</div>' +
                      '<div style="display:flex; gap:0.5rem; margin-top:0.25rem;">' +
                      '<button class="accept-debt" data-id="'+r.id+'">Accept</button>' +
                      '<button class="reject-debt" data-id="'+r.id+'">Reject</button>' +
                      '</div>';
      listEl.appendChild(row);
    }
  }
  addClick('#debt-requests', '.accept-debt', function(btn){ acceptDebtRequest(btn.getAttribute('data-id')); });
  addClick('#debt-requests', '.reject-debt', function(btn){ rejectDebtRequest(btn.getAttribute('data-id')); });
}

function acceptDebtRequest(id) {
  var debtRequestsKey = storageKey('debtRequests');
  var reqs = getJSON(debtRequestsKey, []);
  var idx = -1; for (var i=0;i<reqs.length;i++){ if (String(reqs[i].id)===String(id)) { idx=i; break; } }
  if (idx===-1) return;
  var r = reqs[idx];
  var cu = getCurrentUser();
  var members = getJSON(storageKey('members'), []);
  var me = null; for (var j=0;j<members.length;j++){ if (members[j].email === (cu?cu.email:'')) { me = members[j]; break; } }
  var myId = me ? String(me.id) : null;
  if (!(String(r.fromId)===myId || r.fromEmail===(cu?cu.email:''))) { alert('Only the payer can accept this request'); return; }
  reqs[idx].status = 'accepted';
  setJSON(debtRequestsKey, reqs);
  var depositsKey = storageKey('deposits');
  var deposits = getJSON(depositsKey, []);
  deposits.push({ id: Date.now()+1, memberId: r.toId, memberName: r.toName, memberEmail: r.toEmail, amount: Number(r.amount), date: r.date });
  deposits.push({ id: Date.now()+2, memberId: r.fromId, memberName: r.fromName, memberEmail: r.fromEmail, amount: -Number(r.amount), date: r.date });
  setJSON(depositsKey, deposits);
  var debtsKey = storageKey('debts');
  var debts = getJSON(debtsKey, []);
  debts.push({ id: Date.now(), fromId: r.fromId, toId: r.toId, amount: r.amount, date: r.date });
  setJSON(debtsKey, debts);
  updateDepositsTable();
  updateDebtRequestsUI();
}

function rejectDebtRequest(id) {
  var debtRequestsKey = storageKey('debtRequests');
  var reqs = getJSON(debtRequestsKey, []);
  var cu = getCurrentUser();
  var members = getJSON(storageKey('members'), []);
  var me = null; for (var j=0;j<members.length;j++){ if (members[j].email === (cu?cu.email:'')) { me = members[j]; break; } }
  var myId = me ? String(me.id) : null;
  for (var i=0;i<reqs.length;i++){ if (String(reqs[i].id)===String(id)) { if (!(String(reqs[i].fromId)===myId || reqs[i].fromEmail===(cu?cu.email:''))) { alert('Only the payer can reject this request'); return; } reqs[i].status='denied'; break; } }
  setJSON(debtRequestsKey, reqs);
  updateDebtRequestsUI();
}
// Add Deposit Feature (mess-scoped)
function initDeposits() {
  const depositForm = document.getElementById('deposit-form');
  const depositTableBody = document.querySelector('#deposit-table tbody');
  if (!depositForm) return;

  // Ensure storage for deposits (scoped by mess)
  const depositsKey = storageKey('deposits');
  if (!localStorage.getItem(depositsKey)) {
    localStorage.setItem(depositsKey, JSON.stringify([]));
  }

  // Populate member dropdown
  const memberSelect = document.getElementById('deposit-member');
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  if (memberSelect) {
    memberSelect.innerHTML = '<option value="">Select member</option>';
    if (members.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.textContent = 'No members yet';
      memberSelect.appendChild(opt);
    } else {
      members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.email})`;
        memberSelect.appendChild(opt);
      });
    }
  }

  // Default date to today
  const dateInput = document.getElementById('deposit-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const historyBtn = document.getElementById('view-deposit-history');
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      window.location.href = 'deposits.html';
    });
  }

  // Handle submit
  depositForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const memberId = memberSelect ? memberSelect.value : '';
    const amount = parseFloat(document.getElementById('deposit-amount').value || '0');
    const date = (document.getElementById('deposit-date').value) || new Date().toISOString().split('T')[0];
    // Note field removed

    if (!memberId) { alert('Please select a member'); return; }
    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return; }

    const m = members.find(x => String(x.id) === String(memberId));

    const deposit = {
      id: Date.now(),
      memberId: m ? m.id : memberId,
      memberName: m ? m.name : 'Unknown',
      memberEmail: m ? m.email : '',
      amount: amount,
      date: date
    };

    const existing = JSON.parse(localStorage.getItem(depositsKey) || '[]');
    // If editing, update existing entry; otherwise push new
    if (depositForm.dataset.editingId) {
      const editId = depositForm.dataset.editingId;
      const idx = existing.findIndex(x => String(x.id) === String(editId));
      if (idx !== -1) {
        existing[idx] = {
          ...existing[idx],
          memberId: deposit.memberId,
          memberName: deposit.memberName,
          memberEmail: deposit.memberEmail,
          amount: deposit.amount,
          date: deposit.date
        };
      }
      delete depositForm.dataset.editingId;
    } else {
      existing.push(deposit);
    }
    localStorage.setItem(depositsKey, JSON.stringify(existing));

    updateDepositsTable();
    depositForm.reset();
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    const submitBtn = depositForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Add Deposit';
  });

  // Initial render
  updateDepositsTable();
}

function updateDepositsTable() {
  var depositsKey = storageKey('deposits');
  var deposits = getJSON(depositsKey, []);
  deposits.sort(function(a,b){ return b.id - a.id; });
  renderTable('#deposit-table tbody', deposits, function(d){
    var memberDisplay = (d.memberName || '') + (d.memberEmail ? ' ('+d.memberEmail+')' : '');
    return '<td>'+escapeHtml(d.date || '')+'</td>'+
           '<td>'+escapeHtml(memberDisplay)+'</td>'+
           '<td>৳'+((Number(d.amount)||0).toFixed(2))+'</td>'+
           '<td><div style="display:flex; flex-direction: column; gap: 0.25rem;">'+
           '<button type="button" class="edit-btn" data-id="'+d.id+'">Edit</button>'+
           '<button type="button" class="delete-btn" data-id="'+d.id+'">Delete</button>'+
           '</div></td>';
  });
  addClick('#deposit-table', '.delete-btn', function(btn){ deleteDeposit(btn.getAttribute('data-id')); });
  addClick('#deposit-table', '.edit-btn', function(btn){ startEditDeposit(btn.getAttribute('data-id')); });
}

function startEditDeposit(id) {
  const depositsKey = storageKey('deposits');
  const deposits = JSON.parse(localStorage.getItem(depositsKey) || '[]');
  const d = deposits.find(x => String(x.id) === String(id));
  const form = document.getElementById('deposit-form');
  if (!d || !form) return;
  const editCard = document.getElementById('edit-deposit-card');
  if (editCard) editCard.style.display = '';
  form.style.display = '';

  const memberSelect = document.getElementById('deposit-member');
  const amountInput = document.getElementById('deposit-amount');
  const dateInput = document.getElementById('deposit-date');

  // Ensure member option exists and select it
  if (memberSelect) {
    let optionExists = false;
    Array.from(memberSelect.options).forEach(opt => {
      if (String(opt.value) === String(d.memberId)) optionExists = true;
    });
    if (!optionExists) {
      const opt = document.createElement('option');
      opt.value = d.memberId;
      opt.textContent = d.memberName ? `${d.memberName} (${d.memberEmail || 'unknown'})` : 'Unknown Member';
      memberSelect.appendChild(opt);
    }
    memberSelect.value = String(d.memberId);
  }

  if (amountInput) amountInput.value = d.amount;
  if (dateInput) dateInput.value = d.date || new Date().toISOString().split('T')[0];

  form.dataset.editingId = String(d.id);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Deposit';
  if (amountInput) amountInput.focus();
}

function deleteDeposit(id) {
  var depositsKey = storageKey('deposits');
  removeById(depositsKey, id);
  updateDepositsTable();
}
// Expense Tracker Functionality
function initExpenseTracker() {
  // Check if we're on the expenses page
  const expenseContainer =document.querySelector('.expense-container');
  if (!expenseContainer) return;
  
  console.log('Expense tracker initialized');
  
  // Initialize data storage if not exists
  if (!localStorage.getItem('expenses')) {
    localStorage.setItem('expenses', JSON.stringify([]));
  }
  
  if (!localStorage.getItem('mealCounts')) {
    localStorage.setItem('mealCounts', JSON.stringify([]));
  }
  if (!localStorage.getItem('sharedExpenses')) {
    localStorage.setItem('sharedExpenses', JSON.stringify([]));
  }
  
  if (!localStorage.getItem(storageKey('members'))) {
    localStorage.setItem(storageKey('members'), JSON.stringify([]));
  }
  
  // Populate member select dropdown
  const memberSelect = document.getElementById('member-select');
  if (memberSelect) {
    // Clear existing options
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
    if (members.length === 0) {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "No members added yet";
      option.disabled = true;
      memberSelect.appendChild(option);
    } else {
      members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        memberSelect.appendChild(option);
      });
    }
  }
  
  // Add expense form submission
  const expenseForm = document.getElementById('expense-form');
  if (expenseForm) {
    expenseForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const date = document.getElementById('expense-date').value;
      const amount = parseFloat(document.getElementById('expense-amount').value);
      const description = document.getElementById('expense-description').value;
      const category = document.getElementById('expense-category').value;
      
      if (!date || !amount || !description) {
        alert('Please fill all required fields');
        return;
      }
      
      const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const editingId = expenseForm.dataset.editingId || null;
      if (editingId) {
        const idx = expenses.findIndex(e => String(e.id) === String(editingId));
        if (idx !== -1) {
          expenses[idx] = { ...expenses[idx], date, amount, description, category };
        }
        delete expenseForm.dataset.editingId;
        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Expense';
      } else {
        expenses.push({ id: Date.now(), date, amount, description, category });
      }
      localStorage.setItem('expenses', JSON.stringify(expenses));
      
      updateExpenseList();
      updateExpenseSummary();
      updateMealPlannerSpentAmount();
      
      expenseForm.reset();
    });
  }
  
  // Add meal count form submission
  const mealCountForm = document.getElementById('meal-count-form');
  if (mealCountForm) {
    mealCountForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const date = document.getElementById('meal-date').value;
      const memberName = document.getElementById('member-select').value;
      const breakfast = parseInt(document.getElementById('breakfast').value);
      const lunch = parseInt(document.getElementById('lunch').value);
      const dinner = parseInt(document.getElementById('dinner').value);
      
      if (!date || !memberName) {
        alert('Please select date and member');
        return;
      }
      
      const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
      const member = members.find(m => m.name === memberName);
      
      const mealCount = {
        id: Date.now(),
        date,
        memberId: member ? member.id : null,
        memberName: memberName,
        breakfast,
        lunch,
        dinner,
        total: breakfast + lunch + dinner
      };
      
      // Save meal count
      const mealCounts = JSON.parse(localStorage.getItem('mealCounts'));
      mealCounts.push(mealCount);
      localStorage.setItem('mealCounts', JSON.stringify(mealCounts));
      
      // Update UI
      updateMealCountList();
      updateExpenseSummary();
      updateMealPlannerSpentAmount(); // Update meal planner spent amount
      
      // Reset form
      mealCountForm.reset();
    });
  }
  
  const sharedForm = document.getElementById('shared-expense-form');
  if (sharedForm) {
    sharedForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const date = document.getElementById('shared-expense-date').value;
      const amount = parseFloat(document.getElementById('shared-expense-amount').value);
      const description = document.getElementById('shared-expense-description').value;
      const category = document.getElementById('shared-expense-category').value;
      if (!date || !amount || !description) { alert('Please fill all required fields'); return; }
      const shared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
      const editingId = sharedForm.dataset.editingId || null;
      if (editingId) {
        const idx = shared.findIndex(e => String(e.id) === String(editingId));
        if (idx !== -1) {
          shared[idx] = { ...shared[idx], date, amount, description, category };
        }
        delete sharedForm.dataset.editingId;
        const submitBtn = sharedForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Shared Cost';
      } else {
        shared.push({ id: Date.now(), date, amount, description, category });
      }
      localStorage.setItem('sharedExpenses', JSON.stringify(shared));
      updateSharedExpenseList();
      updateExpenseSummary();
      updateMemberSummary();
      sharedForm.reset();
    });
  }
  // Calculate button functionality
  const calculateBtn = document.getElementById('calculate-btn');
  if (calculateBtn) {
    calculateBtn.addEventListener('click', function() {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
      }
      
      calculateMealRate(startDate, endDate);
    });
  }
  
  // Initialize UI
  updateExpenseList();
  updateSharedExpenseList();
  updateMealCountList();
  updateExpenseSummary();
  updateMemberSummary();
  updateMessCostSummary();
}

// Update expense list in the UI
function updateExpenseList() {
  var expenses = getJSON('expenses', []);
  renderTable('#expense-list', expenses, function(expense){
    return '<td>'+formatDate(expense.date)+'</td>'+
           '<td>'+expense.description+'</td>'+
           '<td>'+expense.category+'</td>'+
           '<td>'+expense.amount+' BDT</td>'+
           '<td><button class="edit-btn" data-id="'+expense.id+'">Edit</button> '+
           '<button class="delete-btn" data-id="'+expense.id+'">Delete</button></td>';
  });
  addClick('#expense-list', '.edit-btn', function(btn){ startEditExpense(btn.getAttribute('data-id')); });
  addClick('#expense-list', '.delete-btn', function(btn){ deleteExpense(btn.getAttribute('data-id')); });
}

// Update shared expense list in the UI
function updateSharedExpenseList() {
  var listSel = '#shared-expense-list';
  var listEl = document.getElementById('shared-expense-list');
  if (!listEl) return;
  var shared = getJSON('sharedExpenses', []);
  if (!shared.length) {
    listEl.innerHTML = '<tr><td colspan="5">No shared expenses yet.</td></tr>';
    updateMessCostSummary();
    return;
  }
  renderTable(listSel, shared, function(item){
    return '<td>'+formatDate(item.date)+'</td>'+
           '<td>'+item.description+'</td>'+
           '<td>'+item.category+'</td>'+
           '<td>'+item.amount+' BDT</td>'+
           '<td><button class="edit-btn" data-id="'+item.id+'">Edit</button> '+
           '<button class="delete-btn" data-id="'+item.id+'">Delete</button></td>';
  });
  addClick(listSel, '.edit-btn', function(btn){ startEditSharedExpense(btn.getAttribute('data-id')); });
  addClick(listSel, '.delete-btn', function(btn){ deleteSharedExpense(btn.getAttribute('data-id')); });
  updateMessCostSummary();
}

function deleteSharedExpense(id) {
  removeById('sharedExpenses', id);
  updateSharedExpenseList();
  updateExpenseSummary();
  updateMemberSummary();
  updateMessCostSummary();
}

// Update meal count list in the UI
function startEditExpense(id) {
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const exp = expenses.find(e => String(e.id) === String(id));
  const form = document.getElementById('expense-form');
  if (!exp || !form) return;
  const dateEl = document.getElementById('expense-date');
  const amountEl = document.getElementById('expense-amount');
  const descEl = document.getElementById('expense-description');
  const catEl = document.getElementById('expense-category');
  if (dateEl) dateEl.value = exp.date;
  if (amountEl) amountEl.value = exp.amount;
  if (descEl) descEl.value = exp.description;
  if (catEl) catEl.value = exp.category;
  form.dataset.editingId = String(exp.id);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Expense';
  if (amountEl) amountEl.focus();
}

function startEditSharedExpense(id) {
  const shared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
  const item = shared.find(e => String(e.id) === String(id));
  const form = document.getElementById('shared-expense-form');
  if (!item || !form) return;
  const dateEl = document.getElementById('shared-expense-date');
  const amountEl = document.getElementById('shared-expense-amount');
  const descEl = document.getElementById('shared-expense-description');
  const catEl = document.getElementById('shared-expense-category');
  if (dateEl) dateEl.value = item.date;
  if (amountEl) amountEl.value = item.amount;
  if (descEl) descEl.value = item.description;
  if (catEl) catEl.value = item.category;
  form.dataset.editingId = String(item.id);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Shared Cost';
  if (amountEl) amountEl.focus();
}

function updateMealCountList() {
  const mealCountList = document.getElementById('meal-count-list');
  if (!mealCountList) return;
  
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts'));
  mealCountList.innerHTML = '';
  
  mealCounts.forEach(mealCount => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(mealCount.date)}</td>
      <td>${mealCount.memberName}</td>
      <td>${mealCount.breakfast}</td>
      <td>${mealCount.lunch}</td>
      <td>${mealCount.dinner}</td>
      <td>${mealCount.total}</td>
      <td>
        <button class="delete-btn" data-id="${mealCount.id}">Delete</button>
      </td>
    `;
    mealCountList.appendChild(row);
  });
  
  // Add delete functionality
  document.querySelectorAll('#meal-count-list .delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteMealCount(id);
    });
  });
}

// Update expense summary in the UI
function updateExpenseSummary() {
  const totalExpensesEl = document.getElementById('total-expenses');
  const totalMealsEl = document.getElementById('total-meals');
  const mealRateEl = document.getElementById('meal-rate');
  
  if (!totalExpensesEl || !totalMealsEl || !mealRateEl) return;
  
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const shared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts') || '[]');
  const totalMealExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSharedCost = shared.reduce((sum, e) => sum + e.amount, 0);
  const totalMeals = mealCounts.reduce((sum, m) => sum + m.total, 0);
  const mealRate = totalMeals > 0 ? (totalMealExpenses / totalMeals) : 0;
  totalExpensesEl.textContent = `${totalMealExpenses.toFixed(2)} BDT`;
  totalMealsEl.textContent = String(totalMeals);
  mealRateEl.textContent = `${mealRate.toFixed(2)} BDT`;
  // Budget meter update
  const budgetProgress = document.getElementById('budget-progress');
  if (budgetProgress) {
    const budget = 1000;
    const spent = totalMealExpenses;
    const percentage = (spent / budget) * 100;
    budgetProgress.style.width = `${percentage}%`;
    
    // Change color based on percentage
    if (percentage < 50) {
      budgetProgress.style.backgroundColor = '#4caf50';
    } else if (percentage < 80) {
      budgetProgress.style.backgroundColor = '#ff9800';
    } else {
      budgetProgress.style.backgroundColor = '#f44336';
    }
  }
  updateMessCostSummary();
}

function updateMessCostSummary() {
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const shared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts') || '[]');
  const totalMealExpenses = expenses.reduce((s,e)=>s+e.amount,0);
  const totalSharedCost = shared.reduce((s,e)=>s+e.amount,0);
  const totalCost = totalMealExpenses + totalSharedCost;
  const totalMeals = mealCounts.reduce((s,m)=>s+m.total,0);
  const mealRate = totalMeals > 0 ? (totalMealExpenses/totalMeals) : 0;
  const depositsKey = storageKey('deposits');
  const deposits = JSON.parse(localStorage.getItem(depositsKey) || '[]');
  const totalDeposits = deposits.reduce((s,d)=>s+(Number(d.amount)||0),0);
  const remaining = totalDeposits - totalCost;
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('mess-total-meal-cost', `${totalMealExpenses.toFixed(2)} BDT`);
  setText('mess-total-shared-cost', `${totalSharedCost.toFixed(2)} BDT`);
  setText('mess-total-cost', `${totalCost.toFixed(2)} BDT`);
  setText('mess-total-meals', String(totalMeals));
  setText('mess-meal-rate', `${mealRate.toFixed(2)} BDT`);
  setText('mess-remaining-balance', `${remaining.toFixed(2)} BDT`);
}

// Calculate meal rate for a specific date range
function calculateMealRate(startDate, endDate) {
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts') || '[]');
  
  // Filter expenses and meal counts within the date range
  const filteredExpenses = expenses.filter(expense => {
    return expense.date >= startDate && expense.date <= endDate;
  });
  
  const filteredMealCounts = mealCounts.filter(mealCount => {
    return mealCount.date >= startDate && mealCount.date <= endDate;
  });
  
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalMeals = filteredMealCounts.reduce((sum, mealCount) => sum + mealCount.total, 0);
  
  let mealRate = 0;
  if (totalMeals > 0) {
    mealRate = totalExpenses / totalMeals;
  }
  
  // Update calculation results
  document.getElementById('calc-total-expenses').textContent = `${totalExpenses.toFixed(2)} BDT`;
  document.getElementById('calc-total-meals').textContent = String(totalMeals);
  document.getElementById('calc-meal-rate').textContent = `${mealRate.toFixed(2)} BDT`;
  
  // Update member summary for this date range
  updateMemberSummary(startDate, endDate);
  
  // Update meal planner spent amount
  updateMealPlannerSpentAmount();
}

// Update member-wise summary
function updateMemberSummary(startDate = null, endDate = null) {
  const memberSummaryList = document.getElementById('member-summary-list');
  if (!memberSummaryList) return;
  
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts'));
  const expenses = JSON.parse(localStorage.getItem('expenses'));
  
  // Filter by date range if provided
  let filteredMealCounts = mealCounts;
  let filteredExpenses = expenses;
  
  if (startDate && endDate) {
    filteredMealCounts = mealCounts.filter(mealCount => {
      return mealCount.date >= startDate && mealCount.date <= endDate;
    });
    
    filteredExpenses = expenses.filter(expense => {
      return expense.date >= startDate && expense.date <= endDate;
    });
  }
  
  const totalMealExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalMeals = filteredMealCounts.reduce((sum, m) => sum + m.total, 0);
  const mealRate = totalMeals > 0 ? (totalMealExpenses / totalMeals) : 0;
  const allShared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
  const totalSharedCost = allShared.reduce((sum, e) => sum + e.amount, 0);
  const membersCount = members.length > 0 ? members.length : 1;
  const perMemberShared = membersCount > 0 ? (totalSharedCost / membersCount) : 0;
  const depositsKey = storageKey('deposits');
  const allDeposits = JSON.parse(localStorage.getItem(depositsKey) || '[]');
  memberSummaryList.innerHTML = '';
  members.forEach(member => {
    const memberMealCounts = filteredMealCounts.filter(mealCount => mealCount.memberId == member.id);
    const memberTotalMeals = memberMealCounts.reduce((sum, mealCount) => sum + mealCount.total, 0);
    const mealCost = memberTotalMeals * mealRate;
    const depositSum = allDeposits.filter(d => d.memberId == member.id || d.memberEmail === member.email).reduce((s,d)=>s+(Number(d.amount)||0),0);
    const totalIndCost = mealCost + perMemberShared;
    const remaining = depositSum - totalIndCost;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${member.name}</td>
      <td>${depositSum.toFixed(2)} BDT</td>
      <td>${mealCost.toFixed(2)} BDT</td>
      <td>${perMemberShared.toFixed(2)} BDT</td>
      <td>${totalIndCost.toFixed(2)} BDT</td>
      <td>${remaining.toFixed(2)} BDT</td>
    `;
    memberSummaryList.appendChild(row);
  });
}

// Delete an expense
function deleteExpense(id) {
  removeById('expenses', id);
  updateExpenseList();
  updateExpenseSummary();
  updateMemberSummary();
  updateMealPlannerSpentAmount();
}

// Delete a meal count
function deleteMealCount(id) {
  const mealCounts = JSON.parse(localStorage.getItem('mealCounts'));
  const updatedMealCounts = mealCounts.filter(mealCount => mealCount.id != id);
  localStorage.setItem('mealCounts', JSON.stringify(updatedMealCounts));
  
  updateMealCountList();
  updateExpenseSummary();
  updateMemberSummary();
  updateMealPlannerSpentAmount(); // Update meal planner spent amount
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Meal Planner Functionality
function initMealPlanner() {
  // Check if we're on the meals page
  const mealContainer = document.querySelector('.meal-container');
  if (!mealContainer) return;
  
  console.log('Meal planner initialized');
  
  // Create meal plan section if it doesn't exist
  createMealPlanSection();
  
  // Update spent amount from expense tracker
  updateMealPlannerSpentAmount();
  
  // Set budget button functionality
  const setBudgetBtn = document.getElementById('set-budget-btn');
  if (setBudgetBtn) {
    setBudgetBtn.addEventListener('click', function() {
      const budgetInput = document.getElementById('budget-input');
      const budgetAmount = document.getElementById('budget-amount');
      
      if (budgetInput && budgetAmount) {
        const budget = parseFloat(budgetInput.value);
        if (!isNaN(budget) && budget > 0) {
          budgetAmount.textContent = `${budget.toFixed(2)} BDT`;
          localStorage.setItem('mealBudget', budget);
          updateBudgetMeter();
          calculatePerMealBudget();
        } else {
          alert('Please enter a valid budget amount');
        }
      }
    });
  }
}

// Create meal plan section
function createMealPlanSection() {
  const mealContainer = document.querySelector('.meal-container');
  if (!mealContainer) return;
  
  // Check if meal plan section already exists
  if (document.getElementById('meal-plan-section')) return;
  
  // Create meal plan section
  const mealPlanSection = document.createElement('div');
  mealPlanSection.id = 'meal-plan-section';
  mealPlanSection.className = 'meal-plan-section';
  mealPlanSection.innerHTML = `
    <h2>Meal Plan Based on Your Budget</h2>
    <div class="meal-budget-info">
      <p>Per Meal Budget: <strong id="per-meal-budget">0 BDT</strong></p>
      <p>Days Remaining: <strong id="days-remaining">0</strong></p>
    </div>
    <div id="meal-plan-content" class="meal-plan-content">
      <p>Set your budget to see meal plan suggestions.</p>
    </div>
  `;
  
  // Insert after budget section
  const budgetSection = document.querySelector('.budget-section');
  if (budgetSection) {
    budgetSection.after(mealPlanSection);
  } else {
    mealContainer.appendChild(mealPlanSection);
  }
}

// Update spent amount in meal planner from expense tracker
function updateMealPlannerSpentAmount() {
  const spentAmount = document.getElementById('spent-amount');
  if (!spentAmount) return;
  
  // Get total expenses from localStorage
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Update spent amount
  spentAmount.textContent = `${totalExpenses.toFixed(2)} BDT`;
  
  // Calculate per meal budget and update meal plan
  calculatePerMealBudget();
  
  // Update budget meter
  updateBudgetMeter();
}

// Calculate per meal budget and display appropriate meal plan
function calculatePerMealBudget() {
  // Get budget and spent amount
  const budgetAmount = document.getElementById('budget-amount');
  const spentAmount = document.getElementById('spent-amount');
  const perMealBudgetEl = document.getElementById('per-meal-budget');
  const daysRemainingEl = document.getElementById('days-remaining');
  const mealPlanContent = document.getElementById('meal-plan-content');
  
  if (!budgetAmount || !spentAmount || !perMealBudgetEl || !daysRemainingEl || !mealPlanContent) return;
  
  // Parse budget and spent amount
  const budget = parseFloat(budgetAmount.textContent);
  const spent = parseFloat(spentAmount.textContent);
  
  // Get members count
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  const membersCount = members.length > 0 ? members.length : 1; // Default to 1 if no members
  
  // Calculate days remaining in the month
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - today.getDate() + 1; // +1 to include today
  
  // Update days remaining
  daysRemainingEl.textContent = daysRemaining;
  
  // Calculate per meal budget: (total budget - spent money) / (days remaining * members * 3 meals)
  const remainingBudget = budget - spent;
  const totalMealsRemaining = daysRemaining * membersCount * 3; // 3 meals per day
  let perMealBudget = 0;
  
  if (totalMealsRemaining > 0 && remainingBudget > 0) {
    perMealBudget = remainingBudget / totalMealsRemaining;
  }
  
  // Update per meal budget display
  perMealBudgetEl.textContent = `${perMealBudget.toFixed(2)} BDT`;
  
  // Display appropriate meal plan based on per meal budget
  let mealPlanHTML = '';
  
  if (perMealBudget <= 0) {
    mealPlanHTML = `
      <div class="meal-plan-warning">
        <h3>Budget Exceeded!</h3>
        <p>You have spent more than your budget. Consider adjusting your budget or reducing expenses.</p>
      </div>
    `;
  } else if (perMealBudget <= 40) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>Emergency Budget Plan (Below 40 Tk)</h3>
        <p>Your budget is extremely tight. Consider adding more funds or reducing meal counts.</p>
        <p>Suggested meals: Simple dal, rice, and eggs.</p>
      </div>
    `;
  } else if (perMealBudget <= 50) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 41–50 Tk (Basic Survival Plan)</h3>
        <p>👉 Cheap, filling, but still nutritious.</p>
        <ul>
          <li><strong>Breakfast:</strong> 2 parathas/3 rotis + fried egg or potato curry + tea</li>
          <li><strong>Lunch:</strong> Rice + dal + vegetable curry + fried egg / small fish (pangasius/tilapia)</li>
          <li><strong>Dinner:</strong> Khichuri + fried egg / vegetable bhuna</li>
        </ul>
      </div>
    `;
  } else if (perMealBudget <= 60) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 51–60 Tk (Balanced Low-Cost Plan)</h3>
        <p>👉 Slightly more protein, better variety.</p>
        <ul>
          <li><strong>Breakfast:</strong> 2 parathas + egg curry + tea</li>
          <li><strong>Lunch:</strong> Rice + dal + leafy vegetables + small fish fry / egg curry</li>
          <li><strong>Dinner:</strong> Rice + chicken curry (1 small piece) + vegetable</li>
        </ul>
      </div>
    `;
  } else if (perMealBudget <= 70) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 61–70 Tk (Standard Student Plan)</h3>
        <p>👉 Good mix of chicken, fish, egg, vegetables.</p>
        <ul>
          <li><strong>Breakfast:</strong> 3 chapatis + fried egg + vegetable curry + tea</li>
          <li><strong>Lunch:</strong> Rice + dal + small fish curry + vegetable fry</li>
          <li><strong>Dinner:</strong> Rice + chicken curry (1 medium piece) + leafy vegetables</li>
        </ul>
      </div>
    `;
  } else if (perMealBudget <= 80) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 71–80 Tk (Better Nutrition Plan)</h3>
        <p>👉 Can add beef/mutton sometimes, more variety.</p>
        <ul>
          <li><strong>Breakfast:</strong> Paratha + egg curry + milk tea + small fruit (banana/guava)</li>
          <li><strong>Lunch:</strong> Rice + dal + vegetable fry + chicken curry (1–2 pieces) / fish curry</li>
          <li><strong>Dinner:</strong> Khichuri with chicken + salad (cucumber, onion, tomato)</li>
        </ul>
      </div>
    `;
  } else if (perMealBudget <= 90) {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 81–90 Tk (Comfort Student Plan)</h3>
        <p>👉 Nutritious, tasty, close to "home-style" meals.</p>
        <ul>
          <li><strong>Breakfast:</strong> 2 parathas + egg curry + vegetables + milk/tea</li>
          <li><strong>Lunch:</strong> Rice + dal + vegetable curry + beef/mutton/chicken (medium piece) + salad</li>
          <li><strong>Dinner:</strong> Rice/khichuri + fish curry or chicken roast + salad + small fruit</li>
        </ul>
      </div>
    `;
  } else {
    mealPlanHTML = `
      <div class="meal-plan-category">
        <h3>🔹 Budget: 90+ Tk (Premium Plan)</h3>
        <p>👉 Excellent variety and nutrition with premium ingredients.</p>
        <ul>
          <li><strong>Breakfast:</strong> Paratha/roti + omelette + vegetables + fruit + milk/coffee</li>
          <li><strong>Lunch:</strong> Rice + dal + premium fish/meat + multiple vegetable dishes + salad</li>
          <li><strong>Dinner:</strong> Rice/special rice (pulao/biryani) + premium meat + vegetables + dessert</li>
        </ul>
      </div>
    `;
  }
  
  // Update meal plan content
  mealPlanContent.innerHTML = mealPlanHTML;
  
  // Update budget meter
  updateBudgetMeter();
}

// Update budget meter based on spent amount and budget
function updateBudgetMeter() {
  const budgetProgress = document.getElementById('budget-progress');
  const spentAmount = document.getElementById('spent-amount');
  const budgetAmount = document.getElementById('budget-amount');
  
  if (!budgetProgress || !spentAmount || !budgetAmount) return;
  
  const spent = parseFloat(spentAmount.textContent);
  const budgetText = budgetAmount.textContent;
  const budget = parseFloat(budgetText.replace(' BDT', ''));
  
  if (isNaN(spent) || isNaN(budget) || budget <= 0) return;
  
  const percentage = (spent / budget) * 100;
  
  // Update budget meter width
  budgetProgress.style.width = `${Math.min(percentage, 100)}%`;
  
  // Change color based on percentage
  if (percentage < 50) {
    budgetProgress.style.backgroundColor = '#4caf50'; // Green
  } else if (percentage < 80) {
    budgetProgress.style.backgroundColor = '#ff9800'; // Orange
  } else {
    budgetProgress.style.backgroundColor = '#f44336'; // Red
  }
}

// Reviews (Create, Edit, Delete, Latest on Top)
function initReviews() {
  const reviewSection = document.getElementById('reviews');
  if (!reviewSection) return;

  if (!localStorage.getItem('reviews')) {
    localStorage.setItem('reviews', JSON.stringify([]));
  }

  const form = document.getElementById('review-form');
  const nameInput = document.getElementById('review-name');
  const uniInput = document.getElementById('review-university');
  const timeInput = document.getElementById('review-time');
  const textInput = document.getElementById('review-text');

  if (timeInput) {
    timeInput.value = formatDateTime(new Date());
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nowISO = new Date().toISOString();
      const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');

      if (!nameInput.value || !uniInput.value || !textInput.value) {
        alert('Please fill in your name, university, and review.');
        return;
      }

      const editingId = form.dataset.editingId || null;
      if (editingId) {
        const idx = reviews.findIndex(r => String(r.id) === String(editingId));
        if (idx !== -1) {
          reviews[idx].name = nameInput.value;
          reviews[idx].university = uniInput.value;
          reviews[idx].text = textInput.value;
          reviews[idx].updatedAt = nowISO;
        }
        delete form.dataset.editingId;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Submit Review';
      } else {
        reviews.push({
          id: Date.now(),
          name: nameInput.value,
          university: uniInput.value,
          text: textInput.value,
          createdAt: nowISO
        });
      }

      localStorage.setItem('reviews', JSON.stringify(reviews));
      form.reset();
      if (timeInput) timeInput.value = formatDateTime(new Date());
      updateReviewsDisplay();
    });
  }

  updateReviewsDisplay();
}

function updateReviewsDisplay() {
  const list = document.getElementById('reviews-list');
  if (!list) return;
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');

  reviews.sort((a, b) => {
    const ta = a.updatedAt || a.createdAt;
    const tb = b.updatedAt || b.createdAt;
    return new Date(tb) - new Date(ta);
  });

  list.innerHTML = '';
  if (reviews.length === 0) {
    list.innerHTML = '<p>No reviews yet.</p>';
    return;
  }

  reviews.forEach(r => {
    const timeStr = formatDateTime(new Date(r.updatedAt || r.createdAt));
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-header">
        <strong>${escapeHtml(r.name)}</strong> • <span>${escapeHtml(r.university)}</span>
        <span class="review-time">${timeStr}</span>
      </div>
      <p class="review-text">${escapeHtml(r.text)}</p>
      <div class="review-actions">
        <button class="edit-review" data-id="${r.id}">Edit</button>
        <button class="delete-review" data-id="${r.id}">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });

  document.querySelectorAll('#reviews-list .edit-review').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      startEditReview(id);
    });
  });

  document.querySelectorAll('#reviews-list .delete-review').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteReview(id);
    });
  });
}

function startEditReview(id) {
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  const r = reviews.find(x => String(x.id) === String(id));
  const form = document.getElementById('review-form');
  if (!r || !form) return;

  const nameInput = document.getElementById('review-name');
  const uniInput = document.getElementById('review-university');
  const textInput = document.getElementById('review-text');
  const timeInput = document.getElementById('review-time');

  nameInput.value = r.name || '';
  uniInput.value = r.university || '';
  textInput.value = r.text || '';
  if (timeInput) timeInput.value = formatDateTime(new Date());

  form.dataset.editingId = String(r.id);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Update Review';
}

function deleteReview(id) {
  const reviews = JSON.parse(localStorage.getItem('reviews') || '[]');
  const updated = reviews.filter(r => String(r.id) !== String(id));
  localStorage.setItem('reviews', JSON.stringify(updated));
  updateReviewsDisplay();

  // Reset form if it was editing the deleted review
  const form = document.getElementById('review-form');
  if (form && form.dataset.editingId === String(id)) {
    form.reset();
    delete form.dataset.editingId;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Submit Review';
    const timeInput = document.getElementById('review-time');
    if (timeInput) timeInput.value = formatDateTime(new Date());
  }
}

function formatDateTime(d) {
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>\"]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  })[s]);
}