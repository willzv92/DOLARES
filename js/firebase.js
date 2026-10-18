import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrEYcnNbWLgVShx6v5GmeU3eddCGTQ1xU",
  authDomain: "dolares-aa1fa.firebaseapp.com",
  projectId: "dolares-aa1fa",
  storageBucket: "dolares-aa1fa.firebasestorage.app",
  messagingSenderId: "383367321854",
  appId: "1:383367321854:web:924a893f685f21b6feadaf",
  measurementId: "G-L8CPLQSREN",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "historial_cambios");

export { db, colRef, addDoc, onSnapshot, query, orderBy, deleteDoc, doc };
