// index.js
// Initializes dashboard-specific features on index.html only

document.addEventListener('DOMContentLoaded', function() {
  // Redirect to login if not authenticated or mess not selected
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const mess = JSON.parse(localStorage.getItem('currentMess'));
    if (!user || !mess) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }

  // Helper: clear all mess-related local data
  function clearMessData() {
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

  // Get Started button scrolls to dashboard
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', function() {
      const dashboardSection = document.getElementById('dashboard');
      if (dashboardSection) {
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Show current user name somewhere if desired
  const heroContent = document.querySelector('.hero-content');
  const user = JSON.parse(localStorage.getItem('currentUser'));
  const mess = JSON.parse(localStorage.getItem('currentMess'));
  if (heroContent && user && mess) {
    const info = document.createElement('p');
    info.style.marginTop = '0.5rem';
    info.style.color = 'var(--text-muted)';
    info.textContent = `Logged in as ${user.name} (${mess.role}) — Mess: ${mess.messId}`;
    heroContent.appendChild(info);
  }

  // Add logout and clear data links in navbar dynamically
  const navbar = document.querySelector('.navbar nav');
  if (navbar) {
    const logoutBtn = document.createElement('a');
    logoutBtn.href = '#logout';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout(); // Call the global logout function
    });
    navbar.appendChild(logoutBtn);


  }

  // Populate profile info
  const cu = JSON.parse(localStorage.getItem('currentUser'));
  const cm = JSON.parse(localStorage.getItem('currentMess'));
  const nameEl = document.getElementById('current-user-name');
  const emailEl = document.getElementById('current-user-email');
  const roleEl = document.getElementById('current-user-role');
  const messEl = document.getElementById('current-mess-id');
  if (cu && cm) {
    if (nameEl) nameEl.textContent = cu.name;
    if (emailEl) emailEl.textContent = cu.email;
    if (roleEl) roleEl.textContent = cm.role;
    if (messEl) messEl.textContent = cm.messId;
  }

  // Populate members overview
  const listEl = document.getElementById('members-overview-list');
  if (listEl && cm) {
    const key = `members:${cm.messId}`;
    const members = JSON.parse(localStorage.getItem(key) || '[]');
    listEl.innerHTML = '';
    if (members.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No members added yet.';
      listEl.appendChild(li);
    } else {
      members.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.name} — ${m.email}`;
        listEl.appendChild(li);
      });
    }
  }

  // Initialize modules that exist on index.html
  initDebtTracker();
  initDeposits();
  initNoticeBoard();
  initNoticeTicker();
  initReviews();
});