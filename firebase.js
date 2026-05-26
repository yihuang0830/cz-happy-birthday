import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNRbPF5yaPqA5YxI5pS08WUF8xjULMckM",
  authDomain: "czhbd-cdd83.firebaseapp.com",
  databaseURL: "https://czhbd-cdd83-default-rtdb.firebaseio.com",
  projectId: "czhbd-cdd83",
  storageBucket: "czhbd-cdd83.firebasestorage.app",
  messagingSenderId: "351314351457",
  appId: "1:351314351457:web:ce12bfa877efabbc8e6120"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const todosRef = ref(db, "todos");

export { db, todosRef, push, onValue, remove };
