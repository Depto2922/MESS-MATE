// db.js
(function(window) {
    'use strict';

    const db = () => window.firestore;

    // Helper to get a collection for a given mess
    const getCollection = (messId, collectionName) => {
        return db().collection('messes').doc(messId).collection(collectionName);
    };

    // Members
    async function getMembers(messId) {
        if (!messId) return [];
        const snapshot = await getCollection(messId, 'members').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function addMember(messId, member) {
        if (!messId) return null;
        return await getCollection(messId, 'members').add(member);
    }

    async function deleteMember(messId, memberId) {
        if (!messId) return;
        await getCollection(messId, 'members').doc(memberId).delete();
    }

    // Expenses
    async function getExpenses(messId) {
        if (!messId) return [];
        const snapshot = await getCollection(messId, 'expenses').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function addExpense(messId, expense) {
        if (!messId) return null;
        return await getCollection(messId, 'expenses').add(expense);
    }

    async function deleteExpense(messId, expenseId) {
        if (!messId) return;
        await getCollection(messId, 'expenses').doc(expenseId).delete();
    }

    // Deposits
    async function getDeposits(messId) {
        if (!messId) return [];
        const snapshot = await getCollection(messId, 'deposits').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function addDeposit(messId, deposit) {
        if (!messId) return null;
        return await getCollection(messId, 'deposits').add(deposit);
    }

    async function deleteDeposit(messId, depositId) {
        if (!messId) return;
        await getCollection(messId, 'deposits').doc(depositId).delete();
    }

    // Tasks
    async function getTasks(messId) {
        if (!messId) return [];
        const snapshot = await getCollection(messId, 'tasks').orderBy('dueDate', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function addTask(messId, task) {
        if (!messId) return null;
        return await getCollection(messId, 'tasks').add(task);
    }

    async function updateTask(messId, taskId, task) {
        if (!messId) return;
        await getCollection(messId, 'tasks').doc(taskId).update(task);
    }

    async function deleteTask(messId, taskId) {
        if (!messId) return;
        await getCollection(messId, 'tasks').doc(taskId).delete();
    }

    // Notices
    async function getNotices(messId) {
        if (!messId) return [];
        const snapshot = await getCollection(messId, 'notices').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function addNotice(messId, notice) {
        if (!messId) return null;
        return await getCollection(messId, 'notices').add(notice);
    }

    async function deleteNotice(messId, noticeId) {
        if (!messId) return;
        await getCollection(messId, 'notices').doc(noticeId).delete();
    }
    
    // Meals
    async function getMeals(messId) {
        if (!messId) return {};
        const snapshot = await getCollection(messId, 'meals').get();
        const meals = {};
        snapshot.docs.forEach(doc => {
            meals[doc.id] = doc.data();
        });
        return meals;
    }

    async function updateMeal(messId, mealDate, mealData) {
        if (!messId) return;
        await getCollection(messId, 'meals').doc(mealDate).set(mealData, { merge: true });
    }

    window.db = {
        getMembers,
        addMember,
        deleteMember,
        getExpenses,
        addExpense,
        deleteExpense,
        getDeposits,
        addDeposit,
        deleteDeposit,
        getTasks,
        addTask,
        updateTask,
        deleteTask,
        getNotices,
        addNotice,
        deleteNotice,
        getMeals,
        updateMeal,
    };

})(window);