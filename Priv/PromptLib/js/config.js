import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLvCCY_QzjqrgO-tSmtVX_Wx4ZH9uqY5U",
  authDomain: "lx-prompt-library.firebaseapp.com",
  projectId: "lx-prompt-library",
  storageBucket: "lx-prompt-library.firebasestorage.app",
  messagingSenderId: "798680172524",
  appId: "1:798680172524:web:bf265f51c9d4eeeda9e2c9"
};

let app;
let db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { db };