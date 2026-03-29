// =============================================
// FIREBASE CONFIGURATION - Cabun
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwFuaNuzw50bn9CV2RnP3xTx8TNcFr6D4",
  authDomain: "rotas-cabun-app.firebaseapp.com",
  projectId: "rotas-cabun-app",
  storageBucket: "rotas-cabun-app.firebasestorage.app",
  messagingSenderId: "1017676204969",
  appId: "1:1017676204969:web:81ffb5a7df77e050a752b8",
  measurementId: "G-F6BNPV9Y8X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Set language to Portuguese
auth.languageCode = 'pt';

export { auth, db, googleProvider, githubProvider };

