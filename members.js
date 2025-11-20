// members.js
// Initializes member management features on members.html only

document.addEventListener('DOMContentLoaded', () => {
  // Gate access
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
  initMemberManagement();
});