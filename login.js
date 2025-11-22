// login.js
// Handles signup/login and mess create/join flow using Firebase Firestore.

document.addEventListener('DOMContentLoaded', () => {
    // Firebase services
    const firebaseAuth = window.firebaseAuth;
    const firestore = window.firestore;

    // Elements
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const signupError = document.getElementById('signup-error');
    const loginError = document.getElementById('login-error');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    const authSection = document.getElementById('auth-section');
    const postAuthSection = document.getElementById('post-auth-section');
    const chooseCreateBtn = document.getElementById('choose-create');
    const chooseJoinBtn = document.getElementById('choose-join');
    
    const createMessForm = document.getElementById('create-mess-form');
    const joinMessForm = document.getElementById('join-mess-form');
    const createMessError = document.getElementById('create-mess-error');
    const joinMessError = document.getElementById('join-mess-error');

    function show(el) { if (el) el.style.display = 'block'; }
    function hide(el) { if (el) el.style.display = 'none'; }

    function resetErrors() {
        if (signupError) signupError.textContent = '';
        if (loginError) loginError.textContent = '';
        if (createMessError) createMessError.textContent = '';
        if (joinMessError) joinMessError.textContent = '';
    }

    // Main logic based on auth state
    if (firebaseAuth) {
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in. Check if they have an active mess.
                const userPref = await getUserPreference(user.uid);
                if (userPref && userPref.activeMessId) {
                    // Active mess found, redirect to dashboard.
                    window.location.href = 'index.html';
                } else {
                    // No active mess, show create/join options.
                    hide(authSection);
                    show(postAuthSection);
                    hide(createMessForm);
                    hide(joinMessForm);
                }
            } else {
                // User is signed out. Show login/signup forms.
                hide(postAuthSection);
                show(authSection);
                showLogin();
            }
        });
    }

    // Toggle between login and signup forms
    function showSignup() {
        resetErrors();
        show(signupForm);
        hide(loginForm);
    }
    function showLogin() {
        resetErrors();
        hide(signupForm);
        show(loginForm);
    }
    if (showSignupBtn) showSignupBtn.addEventListener('click', showSignup);
    if (showLoginBtn) showLoginBtn.addEventListener('click', showLogin);


    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetErrors();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;

            if (!name || !email || password.length < 6) {
                if (signupError) signupError.textContent = 'Please fill all fields. Password must be at least 6 characters.';
                return;
            }

            try {
                const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
                const user = cred.user;
                if (user && user.updateProfile) {
                    await user.updateProfile({ displayName: name });
                }
                // Auth state change will handle the UI update
            } catch (err) {
                console.error('Firebase signup failed', err);
                if (signupError) signupError.textContent = err.message;
            }
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetErrors();
            const email = document.getElementById('login-id').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email.includes('@')) {
                if (loginError) loginError.textContent = 'Please enter a valid email address.';
                return;
            }

            try {
                await firebaseAuth.signInWithEmailAndPassword(email, password);
                // Auth state change will handle the UI update and redirection
            } catch (err) {
                console.error('Firebase login failed', err);
                if (loginError) loginError.textContent = err.message;
            }
        });
    }
    
    // Forgot Password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            resetErrors();
            const email = document.getElementById('login-id').value.trim();
            if (!email.includes('@')) {
                if (loginError) loginError.textContent = 'Please enter a valid email address to reset your password.';
                return;
            }
            try {
                await firebaseAuth.sendPasswordResetEmail(email);
                if (loginError) {
                    loginError.textContent = 'Password reset email sent! Check your inbox.';
                    loginError.style.color = '#b7f7b7';
                }
            } catch (err) {
                console.error('Firebase password reset failed', err);
                if (loginError) loginError.textContent = err.message;
            }
        });
    }

    // Choose create/join mess buttons
    if (chooseCreateBtn) chooseCreateBtn.addEventListener('click', () => {
        resetErrors();
        show(createMessForm);
        hide(joinMessForm);
    });
    if (chooseJoinBtn) chooseJoinBtn.addEventListener('click', () => {
        resetErrors();
        show(joinMessForm);
        hide(createMessForm);
    });

    // Create mess form submission
    if (createMessForm) {
        createMessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetErrors();
            const messId = document.getElementById('create-mess-id').value.trim();
            const messPassword = document.getElementById('create-mess-password').value;
            const user = firebaseAuth.currentUser;

            if (!messId || !messPassword || !user) {
                if (createMessError) createMessError.textContent = 'All fields are required and you must be logged in.';
                return;
            }

            const messRef = firestore.collection('messes').doc(messId);
            try {
                const messSnap = await messRef.get();
                if (messSnap.exists) {
                    if (createMessError) createMessError.textContent = 'Mess ID already exists.';
                    return;
                }

                // Create mess and add manager as the first member
                await messRef.set({ password: messPassword, createdBy: user.uid, createdAt: new Date() });
                await firestore.collection('members').add({ messId, email: user.email, name: user.displayName, role: 'manager', joinDate: new Date() });
                
                // Set this as the user's active mess
                await setUserPreference(user.uid, { activeMessId: messId });

                window.location.href = 'index.html';
            } catch (err) {
                console.error('Firestore mess creation failed', err);
                if (createMessError) createMessError.textContent = 'Failed to create mess.';
            }
        });
    }

    // Join mess form submission
    if (joinMessForm) {
        joinMessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetErrors();
            const messId = document.getElementById('join-mess-id').value.trim();
            const messPassword = document.getElementById('join-mess-password').value;
            const user = firebaseAuth.currentUser;

            if (!messId || !messPassword || !user) {
                if (joinMessError) joinMessError.textContent = 'All fields are required and you must be logged in.';
                return;
            }

            const messRef = firestore.collection('messes').doc(messId);
            try {
                const messSnap = await messRef.get();
                if (!messSnap.exists) {
                    if (joinMessError) joinMessError.textContent = 'Mess not found.';
                    return;
                }

                const messData = messSnap.data();
                if (messData.password !== messPassword) {
                    if (joinMessError) joinMessError.textContent = 'Incorrect mess password.';
                    return;
                }
                
                // Add user to the members collection
                await firestore.collection('members').add({ messId, email: user.email, name: user.displayName, role: 'member', joinDate: new Date() });
                
                // Set this as the user's active mess
                await setUserPreference(user.uid, { activeMessId: messId });

                window.location.href = 'index.html';
            } catch (err) {
                console.error('Firestore join failed', err);
                if (joinMessError) joinMessError.textContent = 'Failed to join mess.';
            }
        });
    }

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
});
