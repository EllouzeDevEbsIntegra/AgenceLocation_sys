import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBmwz5tClLVK3X7lWXCW7P_dNwliRbc6MY",
    authDomain: "keys-and-go-23da0.firebaseapp.com",
    projectId: "keys-and-go-23da0",
    storageBucket: "keys-and-go-23da0.firebasestorage.app",
    messagingSenderId: "253882613024",
    appId: "1:253882613024:web:2b9423231045a46d40ab45",
    measurementId: "G-PK45D6DBNR"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
