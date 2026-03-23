// =============================================
// FIREBASE CONFIGURATION - Cabun
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3gGb_JPopyPMkMAPRULy7KlT4kd4Hu2Y",
  authDomain: "cabun-d8375.firebaseapp.com",
  projectId: "cabun-d8375",
  storageBucket: "cabun-d8375.firebasestorage.app",
  messagingSenderId: "916696900173",
  appId: "1:916696900173:web:95c553b3933d24e6ccb204"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Set language to Portuguese
auth.languageCode = 'pt';

export { auth, db, googleProvider, githubProvider };

