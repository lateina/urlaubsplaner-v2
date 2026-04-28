import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAopuMnqYLzaG3ZOK5CurDLvZHU26beqjk",
  authDomain: "rotationstool-stefan.firebaseapp.com",
  projectId: "rotationstool-stefan",
  storageBucket: "rotationstool-stefan.firebasestorage.app",
  messagingSenderId: "1068602704394",
  appId: "1:1068602704394:web:47acb001136b65654bd5f3"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const auth = getAuth(app);
