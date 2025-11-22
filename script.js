
// =================================================================================================
// Firebase SDK Loader and Initializer
// =================================================================================================
(function initFirebaseIfConfigured() {
  try {
    if (!window.FIREBASE_CONFIG) {
      console.info('Firebase config not found; skipping initialization');
      return;
    }
    // Dynamically load Firebase SDKs
    const version = '9.23.0';
    const base = `https://www.gstatic.com/firebasejs/${version}/`;
    const sdkScripts = [
      'firebase-app-compat.js',
      'firebase-auth-compat.js',
      'firebase-firestore-compat.js'
    ];
    sdkScripts.forEach(script => {
        if (!document.querySelector(`script[src="${base}${script}"]`)) {
            const s = document.createElement('script');
            s.src = base + script;
            s.async = true;
            document.head.appendChild(s);
        }
    });

    // Poll for Firebase to be ready
    const interval = setInterval(() => {
        if (window.firebase && window.firebase.initializeApp) {
            clearInterval(interval);
            try {
                window.firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
                window.firebaseAuth = window.firebaseApp.auth();
                window.firestore = window.firebaseApp.firestore();
                console.log('Firebase initialized');

                window.firebaseAuth.onAuthStateChanged(user => {
                    window.currentFirebaseUser = user || null;
                    console.log('Auth state:', user ? 'signed in' : 'signed out');
                    // Defer initialization until the DOM is fully loaded
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initializeApp);
                    } else {
                        initializeApp();
                    }
                });
            } catch (e) { console.error('Firebase initialization error', e); }
        }
    }, 50);

  } catch (e) { console.error('Firebase init wrapper error', e); }
})();

// =================================================================================================
// Main App Initializer
// =================================================================================================
async function initializeApp() {
    if (!window.db) {
        return console.error("db.js is not loaded. App cannot start.");
    }
    
    // Auth check must happen before any other initialization
    const auth = await requireAuthAndMess();
    if (!auth) {
        console.log("Authentication required. Redirecting to login.");
        return; // Stop initialization if user is not authenticated
    }

    // Now that we have auth, initialize all relevant modules
    // The checks inside these functions will prevent them from running on irrelevant pages
    initMemberManagement(auth);
    initTaskManagement(auth);
    initDepositManagement(auth);
    initExpenseManagement(auth);
    initNoticeBoard(auth);
    initMealManagement(auth);
    updateDashboardSummary(auth);
    initProfilePage(auth); // Initialize profile-specific logic
}


// =================================================================================================
// Auth & Core Helpers
// =================================================================================================
async function requireAuthAndMess() {
    const user = window.currentFirebaseUser;
    if (!user) {
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    const mess = await getCurrentMess(user.uid);
    if (!mess) {
        // If user is logged in but has no mess, they should be on the login page (which handles this)
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    return { user, mess, isManager: mess.role === 'manager' };
}

async function getCurrentMess(uid) {
    if (!uid || !window.firestore) return null;
    try {
        const prefDoc = await window.firestore.collection('user_preferences').doc(uid).get();
        if (prefDoc.exists) {
            const prefData = prefDoc.data();
            const messId = prefData.activeMessId;
            if (!messId) return null;

            // Fetch user's role for that mess from the correct location
            const memberQuery = await window.firestore.collection('messes').doc(messId).collection('members')
                .where('email', '==', window.currentFirebaseUser.email)
                .limit(1).get();
                
            if (!memberQuery.empty) {
                const memberData = memberQuery.docs[0].data();
                return { messId, role: memberData.role || 'member' };
            }
        }
        // If no preference is found, or role lookup fails, the user needs to join/create a mess.
        return null;
    } catch (e) {
        console.error("Failed to get current mess from Firestore", e);
        return null;
    }
}

// Utility for adding click listeners to dynamic content
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

// =================================================================================================
// Dashboard Summary
// =================================================================================================
async function updateDashboardSummary(auth) {
    if (!document.getElementById('total-deposits')) return; // Only run on dashboard
    const { messId } = auth.mess;

    const deposits = await window.db.getDeposits(messId);
    const expenses = await window.db.getExpenses(messId);

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDeposits - totalExpenses;

    document.getElementById('total-deposits').textContent = `৳${totalDeposits.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `৳${totalExpenses.toFixed(2)}`;
    document.getElementById('mess-balance').textContent = `৳${balance.toFixed(2)}`;
}

// =================================================================================================
// Member Management
// =================================================================================================
async function initMemberManagement(auth) {
    if (!document.getElementById('members-container')) return; // Only run on members page
    const { messId } = auth.mess;

    if (auth.isManager) {
        document.getElementById('add-member-card').style.display = 'block';
        const memberForm = document.getElementById('member-form');
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('member-name').value;
            const email = document.getElementById('member-email').value;
            if (!name || !email) return alert('Name and email are required.');
            await window.db.addMember(messId, { name, email, role: 'member', joinDate: new Date() });
            updateMembersList(auth);
            memberForm.reset();
        });
    }

    addClick('#members-container', '.delete-btn', async (btn) => {
        if (auth.isManager && confirm('Are you sure?')) {
            await window.db.deleteMember(messId, btn.dataset.id);
            updateMembersList(auth);
        }
    });

    updateMembersList(auth);
}

async function updateMembersList(auth) {
    const container = document.getElementById('members-container');
    if (!container) return;
    const { messId } = auth.mess;
    const members = await window.db.getMembers(messId);

    container.innerHTML = members.length === 0 ? '<p>No members yet.</p>' : '';
    members.forEach(member => {
        const isSelf = member.email === auth.user.email;
        container.innerHTML += `
            <div class="member-item">
                <div class="member-info"><h3>${member.name}</h3><p>${member.email}</p></div>
                <div class="member-actions">
                    ${(auth.isManager && !isSelf) ? `<button class="delete-btn" data-id="${member.id}">Remove</button>` : ''}
                </div>
            </div>`;
    });
}

// =================================================================================================
// Deposit Management
// =================================================================================================
async function initDepositManagement(auth) {
    if (!document.getElementById('deposits-table-body')) return;
    const { messId } = auth.mess;
    
    if (auth.isManager) {
        document.getElementById('deposit-form-card').style.display = 'block';
        const depositForm = document.getElementById('deposit-form');
        depositForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('deposit-amount').value);
            const date = document.getElementById('deposit-date').value;
            const memberEmail = document.getElementById('member-select').value;
            const memberName = document.getElementById('member-select').options[document.getElementById('member-select').selectedIndex].text;

            if (!amount || !date || !memberEmail) return alert('All fields are required.');
            await window.db.addDeposit(messId, { amount, date, memberEmail, memberName });
            updateDepositsList(auth);
            depositForm.reset();
        });
    }

    addClick('#deposits-table-body', '.delete-btn', async (btn) => {
        if (auth.isManager && confirm('Delete this deposit?')) {
            await window.db.deleteDeposit(messId, btn.dataset.id);
            updateDepositsList(auth);
        }
    });

    populateMemberDropdown(auth);
    updateDepositsList(auth);
}

async function updateDepositsList(auth) {
    const tbody = document.getElementById('deposits-table-body');
    if (!tbody) return;
    const { messId } = auth.mess;

    const deposits = await window.db.getDeposits(messId);
    tbody.innerHTML = '';
    deposits.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${new Date(d.date).toLocaleDateString()}</td>
                <td>${d.memberName}</td>
                <td>${d.amount.toFixed(2)}</td>
                <td>${auth.isManager ? `<button class="delete-btn" data-id="${d.id}">Delete</button>` : ''}</td>
            </tr>`;
    });
    updateDashboardSummary(auth); // Update summary when deposits change
}

async function populateMemberDropdown(auth) {
    const select = document.getElementById('member-select');
    if (!select) return;
    const { messId } = auth.mess;
    const members = await window.db.getMembers(messId);
    select.innerHTML = '<option value="">Select Member</option>';
    members.forEach(member => {
        select.innerHTML += `<option value="${member.email}">${member.name}</option>`;
    });
}


// =================================================================================================
// Expense Management
// =================================================================================================
async function initExpenseManagement(auth) {
    if (!document.getElementById('expenses-table-body')) return;
    const { messId } = auth.mess;

    if (auth.isManager) {
        document.getElementById('expense-form-card').style.display = 'block';
        const expenseForm = document.getElementById('expense-form');
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const description = document.getElementById('expense-description').value;
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const date = document.getElementById('expense-date').value;
            if (!description || !amount || !date) return alert('All fields are required.');
            await window.db.addExpense(messId, { description, amount, date });
            updateExpensesList(auth);
            expenseForm.reset();
        });
    }

    addClick('#expenses-table-body', '.delete-btn', async (btn) => {
        if (auth.isManager && confirm('Delete this expense?')) {
            await window.db.deleteExpense(messId, btn.dataset.id);
            updateExpensesList(auth);
        }
    });
    updateExpensesList(auth);
}

async function updateExpensesList(auth) {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;
    const { messId } = auth.mess;

    const expenses = await window.db.getExpenses(messId);
    tbody.innerHTML = '';
    expenses.forEach(exp => {
        tbody.innerHTML += `
            <tr>
                <td>${new Date(exp.date).toLocaleDateString()}</td>
                <td>${exp.description}</td>
                <td>${exp.amount.toFixed(2)}</td>
                <td>${auth.isManager ? `<button class="delete-btn" data-id="${exp.id}">Delete</button>` : ''}</td>
            </tr>`;
    });
    updateDashboardSummary(auth); // Update summary when expenses change
}


// =================================================================================================
// Notice Board
// =================================================================================================
async function initNoticeBoard(auth) {
    if (!document.getElementById('notice-board')) return;
    const { messId } = auth.mess;

    if (auth.isManager) {
        document.getElementById('notice-form-card').style.display = 'block';
        const noticeForm = document.getElementById('notice-form');
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = document.getElementById('notice-message').value;
            if (!message) return;
            await window.db.addNotice(messId, { message, author: auth.user.displayName, date: new Date() });
            updateNoticesList(auth);
            noticeForm.reset();
        });
    }

    addClick('#notice-board', '.delete-btn', async (btn) => {
        if (auth.isManager && confirm('Delete this notice?')) {
            await window.db.deleteNotice(messId, btn.dataset.id);
            updateNoticesList(auth);
        }
    });

    updateNoticesList(auth);
}

async function updateNoticesList(auth) {
    const noticeBoard = document.getElementById('notice-board');
    if (!noticeBoard) return;
    const { messId } = auth.mess;
    const notices = await window.db.getNotices(messId);
    noticeBoard.innerHTML = notices.length ? '' : '<p>Notice board is empty.</p>';
    notices.forEach(notice => {
        noticeBoard.innerHTML += `
            <div class="notice-item">
                <p>${notice.message}</p>
                <small>By ${notice.author} on ${new Date(notice.date.seconds * 1000).toLocaleDateString()}</small>
                ${auth.isManager ? `<button class="delete-btn" data-id="${notice.id}">Delete</button>` : ''}
            </div>`;
    });
}


// =================================================================================================
// Profile Page
// =================================================================================================
function initProfilePage(auth) {
    if (!document.getElementById('profile-name')) return; // Only run on profile page

    document.getElementById('profile-name').textContent = auth.user.displayName || 'N/A';
    document.getElementById('profile-email').textContent = auth.user.email || 'N/A';
    document.getElementById('profile-mess-id').textContent = auth.mess.messId;
    document.getElementById('profile-role').textContent = auth.isManager ? 'Manager' : 'Member';

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.firebaseAuth.signOut();
        });
    }
    
    // Leave Mess
    const leaveMessBtn = document.getElementById('leave-mess-btn');
    if(leaveMessBtn) {
        leaveMessBtn.addEventListener('click', async () => {
            if(confirm('Are you sure you want to leave this mess? This action cannot be undone.')) {
                try {
                    // ***FIXED***: Find user in the correct nested members collection
                    const memberQuery = await window.firestore.collection('messes').doc(auth.mess.messId).collection('members')
                                            .where('email', '==', auth.user.email).get();
                                            
                    if(!memberQuery.empty) {
                        const memberDocId = memberQuery.docs[0].id;
                        await window.db.deleteMember(auth.mess.messId, memberDocId);
                    }
                    
                    // 2. Clear user preference
                    await window.firestore.collection('user_preferences').doc(auth.user.uid).delete();
                    
                    // 3. Sign out will trigger onAuthStateChanged to redirect to login
                    window.firebaseAuth.signOut();

                } catch(e) {
                    console.error("Error leaving mess: ", e);
                    alert("Failed to leave the mess. Please try again.");
                }
            }
        });
    }
}

// =================================================================================================
// Task & Meal Management (To be implemented)
// =================================================================================================
async function initTaskManagement(auth){ /* ... */ }
async function initMealManagement(auth){ /* ... */ }
