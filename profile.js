// e:\recover\profile.js
document.addEventListener('DOMContentLoaded', () => {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const mess = JSON.parse(localStorage.getItem('currentMess'));
    if (!user || !mess) { window.location.href = 'login.html'; return; }
  } catch { window.location.href = 'login.html'; return; }

  const cu = (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; } })();
  const cm = (() => { try { return JSON.parse(localStorage.getItem('currentMess')); } catch { return null; } })();
  const members = JSON.parse(localStorage.getItem(storageKey('members')) || '[]');
  const me = members.find(m => m.email === (cu ? cu.email : '')) || null;

  const depositsKey = storageKey('deposits');
  const deposits = JSON.parse(localStorage.getItem(depositsKey) || '[]');
  const myDeposits = deposits.filter(d => (me && String(d.memberId) === String(me.id)) || d.memberEmail === (cu ? cu.email : ''));
  const totalDeposits = myDeposits.reduce((s,d)=>s+(Number(d.amount)||0),0);

  const mealCounts = JSON.parse(localStorage.getItem('mealCounts') || '[]');
  const myMealCounts = mealCounts.filter(mc => (me && String(mc.memberId) === String(me.id)) || mc.memberName === (cu ? cu.name : ''));
  const totalMeals = myMealCounts.reduce((s,mc)=>s+(Number(mc.total)||0),0);

  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const totalMealExpenses = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const allMeals = mealCounts.reduce((s,mc)=>s+(Number(mc.total)||0),0);
  const mealRate = allMeals > 0 ? (totalMealExpenses / allMeals) : 0;
  const mealCost = totalMeals * mealRate;

  const shared = JSON.parse(localStorage.getItem('sharedExpenses') || '[]');
  const totalSharedCost = shared.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const membersCount = members.length > 0 ? members.length : 1;
  const sharedCost = totalSharedCost / membersCount;

  const totalCost = mealCost + sharedCost;
  const remaining = totalDeposits - totalCost;

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('detail-name', cu ? cu.name : '');
  setText('detail-email', cu ? cu.email : '');
  setText('detail-mess', cm ? cm.messId : '');
  setText('profile-total-deposits', `${totalDeposits.toFixed(2)} BDT`);
  setText('profile-total-meal-count', String(totalMeals));
  setText('profile-meal-rate', `${mealRate.toFixed(2)} BDT`);
  setText('profile-meal-cost', `${mealCost.toFixed(2)} BDT`);
  setText('profile-shared-cost', `${sharedCost.toFixed(2)} BDT`);
  setText('profile-total-cost', `${totalCost.toFixed(2)} BDT`);
  setText('profile-remaining-balance', `${remaining.toFixed(2)} BDT`);
});