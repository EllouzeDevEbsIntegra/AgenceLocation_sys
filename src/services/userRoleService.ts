import { ref } from 'vue'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import type { User } from './userService'

const currentUserRole = ref<string>('user')
const currentUserData = ref<User | null>(null)
const isAdmin = ref(false)

// Charger les données de l'utilisateur connecté depuis Firestore
export const loadCurrentUserRole = async (): Promise<void> => {
    try {
        if (!auth.currentUser) {
            currentUserRole.value = 'user'
            isAdmin.value = false
            currentUserData.value = null
            return
        }

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))

        if (userDoc.exists()) {
            const userData = {
                id: userDoc.id,
                ...userDoc.data(),
                createdAt: userDoc.data().createdAt?.toDate() || new Date()
            } as User

            currentUserData.value = userData
            currentUserRole.value = userData.role || 'user'
            isAdmin.value = userData.role === 'admin'
        } else {
            // Si l'utilisateur n'existe pas dans Firestore, chercher par email
            const { collection, query, where, getDocs } = await import('firebase/firestore')
            const usersCol = collection(db, 'users')
            const q = query(usersCol, where('email', '==', auth.currentUser.email))
            const snapshot = await getDocs(q)

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0]
                const userData = {
                    id: userDoc.id,
                    ...userDoc.data(),
                    createdAt: userDoc.data().createdAt?.toDate() || new Date()
                } as User

                currentUserData.value = userData
                currentUserRole.value = userData.role || 'user'
                isAdmin.value = userData.role === 'admin'
            } else {
                currentUserRole.value = 'user'
                isAdmin.value = false
                currentUserData.value = null
            }
        }
    } catch (error) {
        console.error('Error loading user role:', error)
        currentUserRole.value = 'user'
        isAdmin.value = false
    }
}

export const useUserRole = () => {
    return {
        currentUserRole,
        currentUserData,
        isAdmin,
        loadCurrentUserRole
    }
}
