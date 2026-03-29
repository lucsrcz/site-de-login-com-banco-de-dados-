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
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// ===== GLOBAL STATE =====
let allAddresses = [];
let selectedStops = [];
let mapsLoaded = false;
let unsubscribeAddresses = null;

// ===== UI INITIALIZATION =====
(function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#8b5cf6', '#06d6e0', '#a78bfa', '#67e8f9', '#c084fc'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
})();

// ===== UI HELPERS =====
function showSection(id) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Carregando...';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.text || btn.textContent;
    btn.disabled = false;
  }
}

function togglePassword(id, btn) {
  const input = document.getElementById(id);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '👁️' : '🔒';
}

// ===== AUTH ACTIONS =====
async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLogin');
  setLoading(btn, true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showToast('Erro ao entrar. Verifique seus dados.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleRegister() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const pass = document.getElementById('registerPassword').value;
  const btn = document.getElementById('btnRegister');
  setLoading(btn, true);
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    const ref = doc(db, 'users', res.user.uid);
    await setDoc(ref, { uid: res.user.uid, email, displayName: name, createdAt: serverTimestamp() });
  } catch (e) {
    showToast('Erro ao criar conta.', 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleGoogleLogin() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    const ref = doc(db, 'users', res.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { uid: res.user.uid, email: res.user.email, displayName: res.user.displayName, createdAt: serverTimestamp() });
    }
  } catch (e) { console.error(e); }
}

async function handleLogout() {
  await signOut(auth);
  if (unsubscribeAddresses) unsubscribeAddresses();
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.body.classList.add('is-logged-in');
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('loggedInContainer').style.display = 'block';
    document.getElementById('dashboardNav').style.display = 'block';
    const avatar = document.getElementById('navAvatar');
    if (avatar) {
      if (user.photoURL) avatar.innerHTML = `<img src="${user.photoURL}">`;
      else avatar.innerHTML = `<span>${(user.displayName || user.email || 'U')[0].toUpperCase()}</span>`;
    }
    document.querySelectorAll('#userName').forEach(el => el.textContent = user.displayName || 'Usuário');
    document.querySelectorAll('#userEmail').forEach(el => el.textContent = user.email);
    loadAddresses(user.uid);
  } else {
    document.body.classList.remove('is-logged-in');
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('loggedInContainer').style.display = 'none';
    document.getElementById('dashboardNav').style.display = 'none';
    showSection('loginForm');
  }
});

// ===== ADDRESS MANAGEMENT =====
function loadAddresses(uid) {
  if (unsubscribeAddresses) unsubscribeAddresses();
  const q = query(collection(db, 'users', uid, 'addresses'), orderBy('createdAt', 'desc'));
  unsubscribeAddresses = onSnapshot(q, (snap) => {
    allAddresses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAddresses(allAddresses);
  });
}

function renderAddresses(list) {
  const el = document.getElementById('addressList');
  if (!el) return;
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum local salvo ainda.</div>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="address-item stacked">
      <div class="address-info-full">
        <span class="address-name">${a.name}</span>
        <div class="address-link-exposed" onclick="copyToClipboard('${a.link}')">${a.link}</div>
      </div>
      <div class="address-actions-row">
        <div class="btn-group-main">
          <button class="btn-go" onclick="window.open('${a.link}', '_blank')">📍 Ir</button>
          <button class="btn-copy-small" onclick="copyToClipboard('${a.link}')">📋 Copiar</button>
          <button class="btn-add-route" onclick="addStopToRoute('${a.name}', '${a.link}')">➕ Incluir</button>
        </div>
        <div class="btn-group-edit">
          <button class="btn-icon edit" onclick="editAddress('${a.id}')">✏️</button>
          <button class="btn-icon delete" onclick="deleteAddress('${a.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function handleSaveAddress() {
  const u = auth.currentUser;
  if (!u) return;
  const id = document.getElementById('editAddressId').value;
  const name = document.getElementById('addressName').value;
  const link = document.getElementById('addressLink').value;
  if (!name || !link) return showToast('Preencha os campos.', 'error');
  try {
    const colRef = collection(db, 'users', u.uid, 'addresses');
    if (id) await updateDoc(doc(db, 'users', u.uid, 'addresses', id), { name, link });
    else await addDoc(colRef, { name, link, createdAt: serverTimestamp() });
    toggleAddressForm(false);
  } catch (e) { console.error(e); }
}

async function deleteAddress(id) {
  const u = auth.currentUser;
  if (!u) return;
  await deleteDoc(doc(db, 'users', u.uid, 'addresses', id));
}

function editAddress(id) {
  const a = allAddresses.find(x => x.id === id);
  if (!a) return;
  document.getElementById('editAddressId').value = a.id;
  document.getElementById('addressName').value = a.name;
  document.getElementById('addressLink').value = a.link;
  toggleAddressForm(true);
}

// ===== SMART ROUTE SYSTEM =====
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) return resolve();
    
    // Safety timeout to prevent silent hangs
    const timeout = setTimeout(() => {
      reject(new Error('Tempo de conexão com Google Maps esgotado. Verifique sua internet.'));
    }, 8000);

    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCwFuaNuzw50bn9CV2RnP3xTx8TNcFr6D4&libraries=places`;
    s.async = true;
    s.defer = true;
    
    s.onload = () => { 
      clearTimeout(timeout);
      mapsLoaded = true; 
      resolve(); 
    };
    
    s.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Erro crítico ao carregar Google Maps. Verifique sua chave de API.'));
    };
    
    document.head.appendChild(s);
  });
}


async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('GPS não suportado');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

function addStopToRoute(name, link) {
  if (selectedStops.some(s => s.name === name)) return showToast('Já está na rota.', 'error');
  selectedStops.push({ name, link });
  renderSelectedStops();
  // Ensure planner is visible
  document.getElementById('smartRouteBox').style.display = 'block';
  document.querySelector('.divider').style.display = 'flex';
  document.querySelector('.modal-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function removeStopFromRoute(idx) {
  selectedStops.splice(idx, 1);
  renderSelectedStops();
}

function renderSelectedStops() {
  const list = document.getElementById('selectedStopsList');
  const count = document.getElementById('stopsCount');
  if (count) count.textContent = selectedStops.length;
  if (!list) return;
  list.innerHTML = selectedStops.length === 0 ? '<div class="empty-stops">Nenhuma parada ainda.</div>' : 
    selectedStops.map((s, i) => `<div class="stop-chip"><span>${s.name}</span><button onclick="removeStopFromRoute(${i})">&times;</button></div>`).join('');
}

async function handleAddQuickStop() {
  const name = document.getElementById('quickStopName').value.trim();
  const link = document.getElementById('quickStopLink').value.trim();
  const u = auth.currentUser;
  if (!name || !link || !u) return showToast('Dados incompletos.', 'error');
  try {
    await addDoc(collection(db, 'users', u.uid, 'addresses'), { name, link, createdAt: serverTimestamp() });
    addStopToRoute(name, link);
    document.getElementById('quickStopName').value = '';
    document.getElementById('quickStopLink').value = '';
    showToast('Salvo e incluído!');
  } catch (e) { console.error(e); }
}

async function generateSmartRoute() {
  const startInput = document.getElementById('smartStart');
  const endInput = document.getElementById('smartEnd');
  const resultBox = document.getElementById('smartRouteResult');
  const resultLink = document.getElementById('smartRouteLink');
  
  if (!endInput.value) return showToast('Ponto final é obrigatório!', 'error');
  if (selectedStops.length === 0) return showToast('Inclua paradas primeiro.', 'error');

  try {
    showToast('Conectando ao Google Maps... 📡');
    await loadGoogleMaps();
    
    // Check if GPS or manual input is used
    let origin = startInput.value.trim();
    if (!origin) {
      showToast('Obtendo sua localização GPS... 🛰️');
      try {
        origin = await getCurrentLocation();
      } catch (e) {
        return showToast('Informe um ponto de partida ou ative o GPS.', 'error');
      }
    }

    showToast('Otimizando trajeto mais rápido... 🧠');
    const service = new google.maps.DirectionsService();
    
    service.route({
      origin: origin,
      destination: endInput.value,
      waypoints: selectedStops.map(s => ({ location: s.name, stopover: true })),
      optimizeWaypoints: true,
      travelMode: 'DRIVING'
    }, (res, status) => {
      if (status === 'OK') {
        const order = res.routes[0].waypoint_order;
        const optimizedWaypoints = order.map(idx => encodeURIComponent(selectedStops[idx].name)).join('/');
        
        // Final Optimized Google Maps URL
        const finalUrl = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${optimizedWaypoints}/${encodeURIComponent(endInput.value)}`;
        
        if (resultLink) resultLink.href = finalUrl;
        if (resultBox) resultBox.style.display = 'block';
        
        showToast('Sucesso! Rota gerada. 🚗💨');
        
        // Final Redirection
        setTimeout(() => {
          window.open(finalUrl, '_blank');
        }, 800);
      } else {
        console.error('Maps API Error:', status);
        showToast('Erro ao calcular rota. Verifique os nomes dos locais.', 'error');
      }
    });

  } catch (err) {
    console.error(err);
    showToast('Erro técnico ao gerar rota.', 'error');
  }
}

// ===== NAVIGATION & MODALS =====
function toggleAddressModal(show = null, addressesOnly = false) {
  const m = document.getElementById('addressModal');
  const planner = document.querySelector('.route-planner-box');
  const divider = document.querySelector('.divider');
  if (show === null) show = m.style.display === 'none';
  m.style.display = show ? 'flex' : 'none';
  if (show) {
    if (addressesOnly) {
      planner.style.display = 'none';
      divider.style.display = 'none';
    } else {
      planner.style.display = 'block';
      divider.style.display = 'flex';
    }
    document.getElementById('addressSearch').value = '';
    handleAddressSearch('');
  }
}

function toggleAddressForm(show = null) {
  const f = document.getElementById('addressForm');
  const listArea = document.querySelector('.address-list-area');
  const searchBox = document.querySelector('.search-box');
  if (show === null) show = f.style.display === 'none';
  f.style.display = show ? 'block' : 'none';
  listArea.style.display = show ? 'none' : 'block';
  searchBox.style.display = show ? 'none' : 'block';
  if (!show) {
    document.getElementById('editAddressId').value = '';
    f.reset();
  }
}

function handleAddressSearch(val) {
  const filtered = allAddresses.filter(a => a.name.toLowerCase().includes(val.toLowerCase()));
  renderAddresses(filtered);
}

function handleAddressNameInput(val) {
  const listArea = document.querySelector('.address-list-area');
  if (!val) { listArea.style.display = 'none'; return; }
  const duplicate = allAddresses.filter(a => a.name.toLowerCase().includes(val.toLowerCase()));
  if (duplicate.length > 0) {
    listArea.style.display = 'block';
    renderAddresses(duplicate);
  } else {
    listArea.style.display = 'none';
  }
}

function toggleProfileMenu() {
  const d = document.getElementById('profileDropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

function toggleMobileMenu() {
  document.getElementById('navMenu').classList.toggle('active');
}

async function copyToClipboard(txt) {
  await navigator.clipboard.writeText(txt);
  showToast('Copiado! 📋');
}

// ===== GLOBAL EXPOSURE =====
window.showSection = showSection;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.toggleProfileMenu = toggleProfileMenu;
window.toggleAddressModal = toggleAddressModal;
window.toggleAddressForm = toggleAddressForm;
window.handleSaveAddress = handleSaveAddress;
window.editAddress = editAddress;
window.deleteAddress = deleteAddress;
window.toggleMobileMenu = toggleMobileMenu;
window.copyToClipboard = copyToClipboard;
window.handleAddressSearch = handleAddressSearch;
window.handleAddressNameInput = handleAddressNameInput;
window.addStopToRoute = addStopToRoute;
window.removeStopFromRoute = removeStopFromRoute;
window.handleAddQuickStop = handleAddQuickStop;
window.generateSmartRoute = generateSmartRoute;
