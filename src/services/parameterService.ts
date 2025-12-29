import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore'

export type ParameterType = 'caution_type' | 'anomaly_type' | 'payment_method' | 'expense_category' | 'expense_type'

export interface Parameter {
    id?: string
    type: ParameterType
    label: string
    value: string
    parentValue?: string // For hierarchical data (e.g. expense types belonging to a category)
    order?: number
}

const COLLECTION_NAME = 'parameters'

export const getAllParameters = async (type?: ParameterType): Promise<Parameter[]> => {
    try {
        let q = query(collection(db, COLLECTION_NAME), orderBy('label'))

        if (type) {
            q = query(collection(db, COLLECTION_NAME), where('type', '==', type))
        }

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Parameter))
    } catch (error) {
        console.error('Error getting parameters:', error)
        throw error
    }
}

export const addParameter = async (parameter: Omit<Parameter, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), parameter)
        return docRef.id
    } catch (error) {
        console.error('Error adding parameter:', error)
        throw error
    }
}

export const updateParameter = async (id: string, updates: Partial<Parameter>): Promise<void> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id)
        await updateDoc(docRef, updates)
    } catch (error) {
        console.error('Error updating parameter:', error)
        throw error
    }
}

export const deleteParameter = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id))
    } catch (error) {
        console.error('Error deleting parameter:', error)
        throw error
    }
}

// Seed initial data if needed
export const initParameters = async () => {
    const params = await getAllParameters()
    if (params.length > 0) return

    const initialData: Omit<Parameter, 'id'>[] = [
        // Caution Types
        { type: 'caution_type', label: 'Espèces', value: 'especes' },
        { type: 'caution_type', label: 'Chèque', value: 'cheque' },
        { type: 'caution_type', label: 'Carte Bancaire', value: 'carte_bancaire' },
        { type: 'caution_type', label: 'Virement', value: 'virement' },

        // Anomaly Types
        { type: 'anomaly_type', label: 'Choc', value: 'choc' },
        { type: 'anomaly_type', label: 'Rayure', value: 'rayure' },
        { type: 'anomaly_type', label: 'Fissure', value: 'fissure' },
        { type: 'anomaly_type', label: 'Bosselure', value: 'bosselure' },
        { type: 'anomaly_type', label: 'Éclat peinture', value: 'eclat_peinture' },
        { type: 'anomaly_type', label: 'Pare-choc endommagé', value: 'pare_choc' },
        { type: 'anomaly_type', label: 'Rétroviseur cassé', value: 'retroviseur' },
        { type: 'anomaly_type', label: 'Vitre fissurée', value: 'vitre' },
        { type: 'anomaly_type', label: 'Pneu usé', value: 'pneu' },
        { type: 'anomaly_type', label: 'Autre', value: 'autre' },

        // Payment Methods
        { type: 'payment_method', label: 'Espèces', value: 'especes' },
        { type: 'payment_method', label: 'Chèque', value: 'cheque' },
        { type: 'payment_method', label: 'Traite', value: 'traite' },
        { type: 'payment_method', label: 'Virement', value: 'virement' },
        { type: 'payment_method', label: 'Carte Bancaire', value: 'carte' },

        // Expense Categories
        { type: 'expense_category', label: 'Charges Fixes', value: 'fixe' },
        { type: 'expense_category', label: 'Charges Véhicule', value: 'vehicule' },
        { type: 'expense_category', label: 'Charges Diverses', value: 'divers' },

        // Expense Types - Fixe
        { type: 'expense_type', label: 'Loyer', value: 'loyer', parentValue: 'fixe' },
        { type: 'expense_type', label: 'Salaire', value: 'salaire', parentValue: 'fixe' },
        { type: 'expense_type', label: 'CNSS', value: 'cnss', parentValue: 'fixe' },
        { type: 'expense_type', label: 'Impôt', value: 'impot', parentValue: 'fixe' },
        { type: 'expense_type', label: 'Autre', value: 'autre_fixe', parentValue: 'fixe' },

        // Expense Types - Vehicule
        { type: 'expense_type', label: 'Entretien', value: 'entretien', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Assurance', value: 'assurance', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Lavage', value: 'lavage', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Carburant', value: 'carburant', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Taxe', value: 'taxe', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Réparation', value: 'reparation', parentValue: 'vehicule' },
        { type: 'expense_type', label: 'Autre', value: 'autre_vehicule', parentValue: 'vehicule' },

        // Expense Types - Divers
        { type: 'expense_type', label: 'Fourniture Bureau', value: 'fourniture_bureau', parentValue: 'divers' },
        { type: 'expense_type', label: 'Informatique', value: 'informatique', parentValue: 'divers' },
        { type: 'expense_type', label: 'Nettoyage', value: 'nettoyage', parentValue: 'divers' },
        { type: 'expense_type', label: 'Marketing', value: 'marketing', parentValue: 'divers' },
        { type: 'expense_type', label: 'Autre', value: 'autre_divers', parentValue: 'divers' }
    ]

    for (const param of initialData) {
        await addParameter(param)
    }
}
