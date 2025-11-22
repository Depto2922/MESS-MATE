// db.js

(function(window) {
  'use strict';

  const db = () => window.firestore;
  const auth = () => window.firebaseAuth;

  function getMessId() {
    const currentMess = JSON.parse(localStorage.getItem('currentMess'));
    return currentMess ? currentMess.messId : null;
  }

  // Members
  async function getMembers() {
    const messId = getMessId();
    if (!messId) return [];
    const snapshot = await db().collection('messes').doc(messId).collection('members').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addMember(member) {
    const messId = getMessId();
    if (!messId) return null;
    return await db().collection('messes').doc(messId).collection('members').add(member);
  }

  async function updateMember(memberId, member) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('members').doc(memberId).update(member);
  }

  async function deleteMember(memberId) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('members').doc(memberId).delete();
  }
  
  // Expenses
  async function getExpenses() {
    const messId = getMessId();
    if (!messId) return [];
    const snapshot = await db().collection('messes').doc(messId).collection('expenses').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addExpense(expense) {
    const messId = getMessId();
    if (!messId) return null;
    return await db().collection('messes').doc(messId).collection('expenses').add(expense);
  }

  async function updateExpense(expenseId, expense) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('expenses').doc(expenseId).update(expense);
  }

  async function deleteExpense(expenseId) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('expenses').doc(expenseId).delete();
  }
  
  // Meal Counts
  async function getMealCounts() {
    const messId = getMessId();
    if (!messId) return [];
    const snapshot = await db().collection('messes').doc(messId).collection('mealCounts').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addMealCount(mealCount) {
    const messId = getMessId();
    if (!messId) return null;
    return await db().collection('messes').doc(messId).collection('mealCounts').add(mealCount);
  }

  async function deleteMealCount(mealCountId) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('mealCounts').doc(mealCountId).delete();
  }

  // Deposits
  async function getDeposits() {
    const messId = getMessId();
    if (!messId) return [];
    const snapshot = await db().collection('messes').doc(messId).collection('deposits').orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addDeposit(deposit) {
    const messId = getMessId();
    if (!messId) return null;
    return await db().collection('messes').doc(messId).collection('deposits').add(deposit);
  }

  async function updateDeposit(depositId, deposit) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('deposits').doc(depositId).update(deposit);
  }

  async function deleteDeposit(depositId) {
    const messId = getMessId();
    if (!messId) return;
    await db().collection('messes').doc(messId).collection('deposits').doc(depositId).delete();
  }

  // Shared Expenses
  async function getSharedExpenses() {
      const messId = getMessId();
      if (!messId) return [];
      const snapshot = await db().collection('messes').doc(messId).collection('sharedExpenses').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addSharedExpense(expense) {
      const messId = getMessId();
      if (!messId) return null;
      return await db().collection('messes').doc(messId).collection('sharedExpenses').add(expense);
  }

  async function updateSharedExpense(expenseId, expense) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('sharedExpenses').doc(expenseId).update(expense);
  }

  async function deleteSharedExpense(expenseId) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('sharedExpenses').doc(expenseId).delete();
  }

  // Tasks
  async function getTasks() {
      const messId = getMessId();
      if (!messId) return [];
      const snapshot = await db().collection('messes').doc(messId).collection('tasks').orderBy('dueDate', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addTask(task) {
      const messId = getMessId();
      if (!messId) return null;
      return await db().collection('messes').doc(messId).collection('tasks').add(task);
  }

  async function updateTask(taskId, task) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('tasks').doc(taskId).update(task);
  }

  async function deleteTask(taskId) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('tasks').doc(taskId).delete();
  }

  // Notices
  async function getNotices() {
      const messId = getMessId();
      if (!messId) return [];
      const snapshot = await db().collection('messes').doc(messId).collection('notices').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addNotice(notice) {
      const messId = getMessId();
      if (!messId) return null;
      return await db().collection('messes').doc(messId).collection('notices').add(notice);
  }

  async function deleteNotice(noticeId) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('notices').doc(noticeId).delete();
  }

  // Debts
  async function getDebts() {
      const messId = getMessId();
      if (!messId) return [];
      const snapshot = await db().collection('messes').doc(messId).collection('debts').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addDebt(debt) {
      const messId = getMessId();
      if (!messId) return null;
      return await db().collection('messes').doc(messId).collection('debts').add(debt);
  }

  async function deleteDebt(debtId) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('debts').doc(debtId).delete();
  }

  // Debt Requests
  async function getDebtRequests() {
      const messId = getMessId();
      if (!messId) return [];
      const snapshot = await db().collection('messes').doc(messId).collection('debtRequests').orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addDebtRequest(req) {
      const messId = getMessId();
      if (!messId) return null;
      return await db().collection('messes').doc(messId).collection('debtRequests').add(req);
  }

   async function updateDebtRequest(reqId, req) {
      const messId = getMessId();
      if (!messId) return;
      await db().collection('messes').doc(messId).collection('debtRequests').doc(reqId).update(req);
  }

  // Reviews
  async function getReviews() {
      const snapshot = await db().collection('reviews').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function addReview(review) {
      return await db().collection('reviews').add(review);
  }

  async function updateReview(reviewId, review) {
      await db().collection('reviews').doc(reviewId).update(review);
  }

  async function deleteReview(reviewId) {
      await db().collection('reviews').doc(reviewId).delete();
  }
  
  window.db = {
    getMembers,
    addMember,
    updateMember,
    deleteMember,
    getExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getMealCounts,
    addMealCount,
    deleteMealCount,
    getDeposits,
    addDeposit,
    updateDeposit,
    deleteDeposit,
    getSharedExpenses,
    addSharedExpense,
    updateSharedExpense,
    deleteSharedExpense,
    getTasks,
    addTask,
    updateTask,
    deleteTask,
    getNotices,
    addNotice,
    deleteNotice,
    getDebts,
    addDebt,
    deleteDebt,
    getDebtRequests,
    addDebtRequest,
    updateDebtRequest,
    getReviews,
    addReview,
    updateReview,
    deleteReview,
  };

})(window);