import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

export interface Model {
    id?: string
    nom: string
    brandId: string  // Clé étrangère vers la marque
}

const COLLECTION_NAME = 'models'

// Récupérer tous les modèles
export const getAllModels = async (): Promise<Model[]> => {
    const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('nom'))
    )
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Model[]
}

// Récupérer les modèles d'une marque spécifique
export const getModelsByBrand = async (brandId: string): Promise<Model[]> => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('brandId', '==', brandId),
        orderBy('nom')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Model[]
}

// Ajouter un modèle
export const addModel = async (model: Omit<Model, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        nom: model.nom,
        brandId: model.brandId,
    })
    return docRef.id
}

// Modifier un modèle
export const updateModel = async (id: string, model: Partial<Omit<Model, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
        ...(model.nom && { nom: model.nom }),
        ...(model.brandId && { brandId: model.brandId }),
    })
}

// Supprimer un modèle
export const deleteModel = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
}
