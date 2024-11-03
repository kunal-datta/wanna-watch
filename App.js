import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Initialize Firebase (do this once at app startup)
const firebaseConfig = {
    // Your firebase config here
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Example createSession function
const createSession = async () => {
    try {
        const sessionsRef = collection(db, 'sessions');
        const newSession = await addDoc(sessionsRef, {
            // your session data here
            createdAt: new Date(),
            // other fields...
        });
        console.log("Session created with ID: ", newSession.id);
        return newSession;
    } catch (error) {
        console.error("Error creating session: ", error);
        throw error;
    }
}; 