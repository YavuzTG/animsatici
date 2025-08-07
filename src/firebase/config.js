import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; // Storage aktif edildi
import { getFunctions } from 'firebase/functions';

// Firebase yapılandırması - GERÇEK PROJE
const firebaseConfig = {
  apiKey: "AIzaSyClJ9tcmqgk7TGJTEUS8uevVn_5HGDEwJM",
  authDomain: "animsatici-demo.firebaseapp.com",
  projectId: "animsatici-demo",
  storageBucket: "animsatici-demo.firebasestorage.app",
  messagingSenderId: "1088332096032",
  appId: "1:1088332096032:web:2218431c43bf45d0a51245",
  measurementId: "G-DGSQ7DGWJE"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firebase servislerini dışa aktar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Storage aktif edildi
export const functions = getFunctions(app);

export default app;
