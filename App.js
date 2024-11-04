import { app, db, auth } from './src/firebase/config';

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