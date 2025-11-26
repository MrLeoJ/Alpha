// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your web app's Firebase configuration
// REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCvzmYxVbTDCgQUsDY0jhPWs5uArUf9Pjo",
  authDomain: "lx-index.firebaseapp.com",
  projectId: "lx-index",
  storageBucket: "lx-index.firebasestorage.app",
  messagingSenderId: "800756201282",
  appId: "1:800756201282:web:ac4411eef03ce6bf747adb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };