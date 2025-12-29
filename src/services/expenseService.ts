import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export type ExpenseCategory = 'fixe' | 'vehicule' | 'divers'

export type FixedExpenseType = 'loyer' | 'salaire' | 'cnss' | 'impot' | 'autre'
export type VehicleExpenseType = 'entretien' | 'assurance' | 'lavage' | 'carburant' | 'taxe' | 'reparation' | 'autre'
export type MiscExpenseType = 'fourniture_bureau' | 'informatique' | 'nettoyage' | 'marketing' | 'autre'

export interface Expense {
    id?: string
    date: Date
    amount: number | null // Montant TTC
    category: ExpenseCategory
    type: FixedExpenseType | VehicleExpenseType | MiscExpenseType
    description: string
    vehicleId?: string // Required if category is 'vehicule'
    paymentMethod: 'especes' | 'cheque' | 'virement' | 'carte'
    createdAt: Date
}

const COLLECTION_NAME = 'expenses'

// Convertir les dates Firestore en Date JavaScript
const convertTimestampToDate = (data: any): Expense => {
    return {
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    }
}

// Ajouter une dépense
export const addExpense = async (expense: Omit<Expense, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...expense,
        date: Timestamp.fromDate(new Date(expense.date)),
        createdAt: Timestamp.fromDate(new Date())
    })
    return docRef.id
}

// Modifier une dépense
export const updateExpense = async (id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...expense }

    if (expense.date) {
        updateData.date = Timestamp.fromDate(new Date(expense.date))
    }

    await updateDoc(docRef, updateData)
}

// Supprimer une dépense
export const deleteExpense = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
}

// Récupérer toutes les dépenses
export const getAllExpenses = async (): Promise<Expense[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Expense[]
}

// Récupérer les dépenses par période
export const getExpensesByDateRange = async (start: Date, end: Date): Promise<Expense[]> => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Expense[]
}

// Récupérer les dépenses par véhicule
export const getExpensesByVehicle = async (vehicleId: string): Promise<Expense[]> => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('vehicleId', '==', vehicleId),
        orderBy('date', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Expense[]
}
