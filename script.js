import { auth, db, googleProvider, githubProvider } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// ===== PARTICLES =====
(function createParticles() {
  const container = document.getElementById('particles');
  const colors = ['#8b5cf6', '#06d6e0', '#a78bfa', '#67e8f9', '#c084fc'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      background: ${color};
      box-shadow: 0 0 ${size * 3}px ${color};
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
})();

// ===== SHOW / HIDE SECTIONS =====
function showSection(id) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(id);
  if (section) section.classList.add('active');
}

// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.innerHTML = isPassword
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== LOADING STATE =====
function setLoading(buttonEl, loading) {
  if (loading) {
    buttonEl.dataset.originalText = buttonEl.textContent;
    buttonEl.textContent = 'Carregando...';
    buttonEl.disabled = true;
    buttonEl.style.opacity = '0.7';
  } else {
    buttonEl.textContent = buttonEl.dataset.originalText || buttonEl.textContent;
    buttonEl.disabled = false;
    buttonEl.style.opacity = '1';
  }
}

// ===== FIREBASE ERROR MESSAGES (PT-BR) =====
function getFirebaseErrorMessage(errorCode) {
  const messages = {
    'auth/email-already-in-use': 'Este e-mail jÃ¡ estÃ¡ cadastrado.',
    'auth/invalid-email': 'E-mail invÃ¡lido.',
    'auth/weak-password': 'A senha deve ter no mÃ­nimo 6 caracteres.',
    'auth/user-not-found': 'UsuÃ¡rio nÃ£o encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/account-exists-with-different-credential': 'JÃ¡ existe conta com este e-mail usando outro mÃ©todo de login.',
    'auth/popup-blocked': 'Popup bloqueado pelo navegador. Permita popups para este site.',
    'auth/network-request-failed': 'Erro de conexÃ£o. Verifique sua internet.',
    'auth/cancelled-popup-request': 'OperaÃ§Ã£o cancelada.',
  };
  return messages[errorCode] || `Erro: ${errorCode}`;
}

// ===== SAVE USER TO FIRESTORE =====
async function saveUserToFirestore(user, extraData = {}) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // New user - create document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || extraData.displayName || '',
        photoURL: user.photoURL || '',
        provider: user.providerData[0]?.providerId || 'email',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        ...extraData
      });
    } else {
      // Existing user - update last login
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        displayName: user.displayName || userSnap.data().displayName,
        photoURL: user.photoURL || userSnap.data().photoURL,
      }, { merge: true });
    }
  } catch (error) {
    console.error('Erro ao salvar usuÃ¡rio no Firestore:', error);
  }
}

// ===== SHOW LOGGED IN UI =====
function showLoggedInUI(user) {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('loggedInContainer').style.display = 'block';

  const avatar = document.getElementById('userAvatar');
  const name = document.getElementById('userName');
  const email = document.getElementById('userEmail');
  const provider = document.getElementById('userProvider');

  if (user.photoURL) {
    avatar.innerHTML = `<img src="${user.photoURL}" alt="Avatar" />`;
  } else {
    const initials = (user.displayName || user.email || '?').charAt(0).toUpperCase();
    avatar.innerHTML = `<span>${initials}</span>`;
  }

  name.textContent = user.displayName || 'Jogador Cabun';
  email.textContent = user.email;

  const providerMap = {
    'google.com': 'ðŸ”µ Google',
    'github.com': 'âš« GitHub',
    'password': 'ðŸ“§ E-mail/Senha'
  };
  const providerId = user.providerData[0]?.providerId || 'password';
  provider.textContent = `Conectado via ${providerMap[providerId] || providerId}`;
}

// ===== SHOW AUTH UI =====
function showAuthUI() {
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('loggedInContainer').style.display = 'none';
  showSection('loginForm');
}

// ===== EMAIL VALIDATION =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===== LOGIN WITH EMAIL/PASSWORD =====
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLogin');

  if (!email || !pass) {
    showToast('Preencha todos os campos!', 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('E-mail invÃ¡lido!', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await saveUserToFirestore(userCredential.user);
    showToast('Login realizado com sucesso! ðŸŽ®', 'success');
  } catch (error) {
    showToast(getFirebaseErrorMessage(error.code), 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ===== REGISTER WITH EMAIL/PASSWORD =====
async function handleRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const pass = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;
  const btn = document.getElementById('btnRegister');

  if (!name || !email || !pass || !confirm) {
    showToast('Preencha todos os campos!', 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('E-mail invÃ¡lido!', 'error');
    return;
  }
  if (pass.length < 8) {
    showToast('A senha deve ter no mÃ­nimo 8 caracteres!', 'error');
    return;
  }
  if (pass !== confirm) {
    showToast('As senhas nÃ£o coincidem!', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);

    // Set display name
    await updateProfile(userCredential.user, { displayName: name });

    // Save to Firestore
    await saveUserToFirestore(userCredential.user, { displayName: name });

    showToast('Conta criada com sucesso! ðŸš€', 'success');
  } catch (error) {
    showToast(getFirebaseErrorMessage(error.code), 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ===== FORGOT PASSWORD =====
async function handleForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  const btn = document.getElementById('btnForgot');

  if (!email) {
    showToast('Informe seu e-mail!', 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('E-mail invÃ¡lido!', 'error');
    return;
  }

  setLoading(btn, true);
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Link de recuperaÃ§Ã£o enviado! ðŸ“§ Verifique seu e-mail.', 'success');
    setTimeout(() => showSection('loginForm'), 2000);
  } catch (error) {
    showToast(getFirebaseErrorMessage(error.code), 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ===== LOGIN WITH GOOGLE =====
async function handleGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user);
    showToast('Login com Google realizado! ðŸŽ®', 'success');
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      showToast(getFirebaseErrorMessage(error.code), 'error');
    }
  }
}

// ===== LOGIN WITH GITHUB =====
async function handleGithubLogin() {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    await saveUserToFirestore(result.user);
    showToast('Login com GitHub realizado! ðŸŽ®', 'success');
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      showToast(getFirebaseErrorMessage(error.code), 'error');
    }
  }
}

// ===== LOGOUT =====
async function handleLogout() {
  try {
    await signOut(auth);
    showToast('Logout realizado com sucesso!', 'success');
  } catch (error) {
    showToast('Erro ao sair. Tente novamente.', 'error');
  }
}

// ===== AUTH STATE OBSERVER =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    showLoggedInUI(user);
  } else {
    showAuthUI();
  }
});

// ===== ENTER KEY SUPPORT =====
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const active = document.querySelector('.form-section.active');
    if (!active) return;
    if (active.id === 'loginForm') handleLogin();
    else if (active.id === 'registerForm') handleRegister();
    else if (active.id === 'forgotForm') handleForgot();
  }
});

// ===== EXPOSE FUNCTIONS TO HTML =====
window.showSection = showSection;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgot = handleForgot;
window.handleGoogleLogin = handleGoogleLogin;
window.handleGithubLogin = handleGithubLogin;
window.handleLogout = handleLogout;

