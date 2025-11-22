
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
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', initializeAll);
                    } else {
                        initializeAll();
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
async function initializeAll() {
    if (!window.db) return console.error("db.js is not loaded. App cannot start.");
    
    const auth = await requireAuthAndMess();
    if (!auth) return;

    // Initialize all modules
    initMemberManagement(auth);
    initTaskManagement(auth);
    initDepositManagement(auth);
    initExpenseManagement(auth);
    initNoticeBoard(auth);
    initMealManagement(auth);
    initDebtTracker(auth);
    updateDashboardSummary(auth);
}

// =================================================================================================
// Auth & UI Helpers
// =================================================================================================
async function requireAuthAndMess() {
    const user = window.currentFirebaseUser;
    if (!user) {
        if (!window.location.pathname.endsWith('login.html')) window.location.href = 'login.html';
        return null;
    }

    const mess = await getCurrentMess(user.uid);
    if (!mess) {
        if (!window.location.pathname.endsWith('login.html')) window.location.href = 'login.html';
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

            // Also fetch the user's role for that mess
            const memberQuery = await window.firestore.collection('members')
                .where('messId', '==', messId)
                .where('email', '==', window.currentFirebaseUser.email)
                .limit(1).get();
                
            if (!memberQuery.empty) {
                const memberData = memberQuery.docs[0].data();
                return { messId, role: memberData.role || 'member' };
            }
        }
        return null;
    } catch (e) {
        console.error("Failed to get current mess from Firestore", e);
        return null;
    }
}

// =================================================================================================
// Dashboard Summary
// =================================================================================================
async function updateDashboardSummary(auth) {
    if (!auth) return;
    const dashboardElements = [
        document.getElementById('total-deposits'),
        document.getElementById('total-expenses'),
        document.getElementById('mess-balance')
    ];
    if (dashboardElements.some(el => !el)) return; // Don't run on pages without these elements

    const deposits = await window.db.getDeposits(auth.mess.messId);
    const expenses = await window.db.getExpenses(auth.mess.messId);

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalDeposits - totalExpenses;

    dashboardElements[0].textContent = totalDeposits.toFixed(2);
    dashboardElements[1].textContent = totalExpenses.toFixed(2);
    dashboardElements[2].textContent = balance.toFixed(2);
}

// =================================================================================================
// Member Management
// =================================================================================================
async function initMemberManagement(auth) {
    const container = document.querySelector('#members');
    if (!container) return;

    if (auth.isManager) {
        const addMemberCard = document.getElementById('add-member-card');
        if (addMemberCard) addMemberCard.style.display = 'block';
        
        const memberForm = document.getElementById('member-form');
        if (memberForm) {
            memberForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('member-name').value;
                const email = document.getElementById('member-email').value;
                if (!name || !email) return alert('Name and email are required.');
                await window.db.addMember(auth.mess.messId, { name, email, role: 'member', joinDate: new Date() });
                updateMembersList(auth);
                memberForm.reset();
            });
        }
    }

    document.body.addEventListener('click', async (e) => {
        if (e.target.matches('.delete-member-btn')) {
            const memberId = e.target.dataset.id;
            if (auth.isManager && confirm('Are you sure you want to remove this member?')) {
                await window.db.deleteMember(memberId);
                updateMembersList(auth);
            }
        }
    });

    updateMembersList(auth);
}

async function updateMembersList(auth) {
    const container = document.getElementById('members-container');
    if (!container) return;

    const members = await window.db.getMembers(auth.mess.messId);
    container.innerHTML = members.length === 0 ? '<p>No members yet.</p>' : '';
    members.forEach(member => {
        const isSelf = member.email === auth.user.email;
        container.innerHTML += `
            <div class="member-item">
                <div class="member-info"><h3>${member.name}</h3><p>${member.email}</p></div>
                <div class="member-actions">
                    ${(auth.isManager && !isSelf) ? `<button class="delete-member-btn" data-id="${member.id}">Remove</button>` : ''}
                </div>
            </div>`;
    });
}

// Placeholder for other modules
async function initTaskManagement(auth){ /* ... full implementation ... */ }
async function initDepositManagement(auth){ /* ... full implementation ... */ }
async function initExpenseManagement(auth){ /* ... full implementation ... */ }
async function initNoticeBoard(auth){ /* ... full implementation ... */ }
async function initMealManagement(auth){ /* ... full implementation ... */ }
async function initDebtTracker(auth){ /* ... full implementation ... */ }
