// login.js
// Handles signup/login and mess create/join flow using Firebase Firestore.

document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase is initialized before doing anything
    const firebaseCheckInterval = setInterval(() => {
        if (window.firebaseAuth && window.firestore) {
            clearInterval(firebaseCheckInterval);
            runLoginScript();
        }
    }, 100);
});

function runLoginScript() {
    const firebaseAuth = window.firebaseAuth;
    const firestore = window.firestore;

    // Elements
    const authSection = document.getElementById('auth-section');
    const postAuthSection = document.getElementById('post-auth-section');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const signupError = document.getElementById('signup-error');
    const loginError = document.getElementById('login-error');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const chooseCreateBtn = document.getElementById('choose-create');
    const chooseJoinBtn = document.getElementById('choose-join');
    const createMessForm = document.getElementById('create-mess-form');
    const joinMessForm = document.getElementById('join-mess-form');
    const createMessError = document.getElementById('create-mess-error');
    const joinMessError = document.getElementById('join-mess-error');

    const show = (el) => { if (el) el.style.display = 'block'; };
    const hide = (el) => { if (el) el.style.display = 'none'; };
    const resetErrors = () => {
        [signupError, loginError, createMessError, joinMessError].forEach(el => {
            if (el) el.textContent = '';
        });
    };

    // Main logic based on auth state
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            const userPref = await getUserPreference(user.uid);
            if (userPref && userPref.activeMessId) {
                window.location.href = 'index.html';
            } else {
                hide(authSection);
                show(postAuthSection);
                hide(createMessForm);
                hide(joinMessForm);
            }
        } else {
            hide(postAuthSection);
            show(authSection);
            showLogin();
        }
    });

    // Form toggling
    const showSignup = () => { resetErrors(); show(signupForm); hide(loginForm); };
    const showLogin = () => { resetErrors(); hide(signupForm); show(loginForm); };
    if (showSignupBtn) showSignupBtn.addEventListener('click', showSignup);
    if (showLoginBtn) showLoginBtn.addEventListener('click', showLogin);

    // Signup form
    if (signupForm) signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        if (!name || !email || password.length < 6) {
            signupError.textContent = 'Please fill all fields. Password must be at least 6 characters.';
            return;
        }
        try {
            const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            if (cred.user) await cred.user.updateProfile({ displayName: name });
            // onAuthStateChanged will handle the UI transition
        } catch (err) { signupError.textContent = err.message; }
    });

    // Login form
    if (loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors();
        const email = document.getElementById('login-id').value.trim();
        const password = document.getElementById('login-password').value;
        if (!email.includes('@')) {
            loginError.textContent = 'Please enter a valid email address.';
            return;
        }
        try {
            await firebaseAuth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged will handle redirection
        } catch (err) { loginError.textContent = err.message; }
    });

    // Forgot Password
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        resetErrors();
        const email = document.getElementById('login-id').value.trim();
        if (!email.includes('@')) {
            loginError.textContent = 'Please enter your email to reset password.';
            return;
        }
        try {
            await firebaseAuth.sendPasswordResetEmail(email);
            loginError.textContent = 'Password reset email sent!';
            loginError.style.color = '#b7f7b7';
        } catch (err) { loginError.textContent = err.message; }
    });

    // Create/Join Mess UI
    if (chooseCreateBtn) chooseCreateBtn.addEventListener('click', () => { resetErrors(); show(createMessForm); hide(joinMessForm); });
    if (chooseJoinBtn) chooseJoinBtn.addEventListener('click', () => { resetErrors(); hide(createMessForm); show(joinMessForm); });

    // Create mess form
    if (createMessForm) createMessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors();
        const messId = document.getElementById('create-mess-id').value.trim();
        const messPassword = document.getElementById('create-mess-password').value;
        const user = firebaseAuth.currentUser;

        if (!messId || !messPassword || !user) {
            createMessError.textContent = 'All fields are required.';
            return;
        }

        const messRef = firestore.collection('messes').doc(messId);
        try {
            const messSnap = await messRef.get();
            if (messSnap.exists) {
                createMessError.textContent = 'Mess ID already exists.';
                return;
            }

            // Create mess document
            await messRef.set({ password: messPassword, createdBy: user.uid, createdAt: new Date() });
            // ***FIXED***: Add manager to the correct nested 'members' collection
            await messRef.collection('members').add({ email: user.email, name: user.displayName, role: 'manager', joinDate: new Date() });
            // Set active mess preference
            await setUserPreference(user.uid, { activeMessId: messId });

            window.location.href = 'index.html';
        } catch (err) { createMessError.textContent = 'Failed to create mess: ' + err.message; }
    });

    // Join mess form
    if (joinMessForm) joinMessForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        resetErrors();
        const messId = document.getElementById('join-mess-id').value.trim();
        const messPassword = document.getElementById('join-mess-password').value;
        const user = firebaseAuth.currentUser;

        if (!messId || !messPassword || !user) {
            joinMessError.textContent = 'All fields are required.';
            return;
        }

        const messRef = firestore.collection('messes').doc(messId);
        try {
            const messSnap = await messRef.get();
            if (!messSnap.exists) {
                joinMessError.textContent = 'Mess not found.';
                return;
            }
            if (messSnap.data().password !== messPassword) {
                joinMessError.textContent = 'Incorrect mess password.';
                return;
            }

            // ***FIXED***: Add user to the correct nested 'members' collection
            await messRef.collection('members').add({ email: user.email, name: user.displayName, role: 'member', joinDate: new Date() });
            // Set active mess preference
            await setUserPreference(user.uid, { activeMessId: messId });

            window.location.href = 'index.html';
        } catch (err) { joinMessError.textContent = 'Failed to join mess: ' + err.message; }
    });

    // Firestore helpers for user preferences
    async function getUserPreference(uid) {
        if (!uid) return null;
        try {
            const doc = await firestore.collection('user_preferences').doc(uid).get();
            return doc.exists ? doc.data() : null;
        } catch (e) {
            console.error("Failed to get user preference", e);
            return null;
        }
    }

    async function setUserPreference(uid, data) {
        if (!uid) return;
        try {
            await firestore.collection('user_preferences').doc(uid).set(data, { merge: true });
        } catch (e) {
            console.error("Failed to set user preference", e);
        }
    }
}
