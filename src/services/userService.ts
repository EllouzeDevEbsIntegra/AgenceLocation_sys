import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, addDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'

export interface User {
    id: string
    email: string
    displayName: string
    createdAt: Date
    role?: string
    password?: string // Stocké uniquement en Firestore pour affichage (non recommandé en production)
}

// Obtenir tous les utilisateurs depuis Firestore
export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersCol = collection(db, 'users')
        const usersSnapshot = await getDocs(query(usersCol))
        return usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as User))
    } catch (error) {
        console.error('Error fetching users:', error)
        throw error
    }
}

// Créer un nouvel utilisateur dans Firestore
export const createUser = async (email: string, password: string, displayName: string, role: string = 'user'): Promise<void> => {
    try {
        const usersCol = collection(db, 'users')
        await addDoc(usersCol, {
            email,
            displayName,
            password, // Note: En production, ne jamais stocker les mots de passe en clair
            role,
            createdAt: new Date(),
            active: true
        })
    } catch (error) {
        console.error('Error creating user:', error)
        throw error
    }
}

// Mettre à jour un utilisateur dans Firestore
export const updateUserData = async (userId: string, data: Partial<User>): Promise<void> => {
    try {
        const userRef = doc(db, 'users', userId)
        await updateDoc(userRef, {
            ...data,
            updatedAt: new Date()
        })
    } catch (error) {
        console.error('Error updating user:', error)
        throw error
    }
}

// Supprimer un utilisateur de Firestore
export const deleteUserAccount = async (userId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'users', userId))
    } catch (error) {
        console.error('Error deleting user:', error)
        throw error
    }
}

// Vérifier les credentials d'un utilisateur
export const verifyUserCredentials = async (email: string, password: string): Promise<User | null> => {
    try {
        const usersCol = collection(db, 'users')
        const usersSnapshot = await getDocs(query(usersCol))
        const user = usersSnapshot.docs.find(doc => {
            const data = doc.data()
            return data.email === email && data.password === password
        })

        if (user) {
            return {
                id: user.id,
                ...user.data(),
                createdAt: user.data().createdAt?.toDate() || new Date()
            } as User
        }
        return null
    } catch (error) {
        console.error('Error verifying credentials:', error)
        return null
    }
}
