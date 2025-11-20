// expenses.js
// Initializes expense tracker features on expenses.html only

document.addEventListener('DOMContentLoaded', () => {
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
  initExpenseTracker();
});