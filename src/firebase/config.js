import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBRlM880MkHeieMRiRlCWJedufAQTVkp1A",
    authDomain: "what-should-we-watch-de872.firebaseapp.com",
    projectId: "what-should-we-watch-de872",
    storageBucket: "what-should-we-watch-de872.firebasestorage.app",
    messagingSenderId: "108831813890",
    appId: "1:108831813890:web:352c4c88ed3f3e8121521b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth }; 