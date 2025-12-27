import { db } from '../firebase'
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore'

export interface Brand {
    id?: string
    nom: string
    logo: string
}

const brandsCollection = collection(db, 'brands')

// Récupérer toutes les marques
export const getAllBrands = async (): Promise<Brand[]> => {
    const q = query(brandsCollection, orderBy('nom'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Brand))
}

// Ajouter une marque
export const addBrand = async (brand: Omit<Brand, 'id'>): Promise<string> => {
    const docRef = await addDoc(brandsCollection, brand)
    return docRef.id
}

// Modifier une marque
export const updateBrand = async (id: string, brand: Partial<Brand>): Promise<void> => {
    const brandDoc = doc(db, 'brands', id)
    await updateDoc(brandDoc, brand)
}

// Supprimer une marque
export const deleteBrand = async (id: string): Promise<void> => {
    const brandDoc = doc(db, 'brands', id)
    await deleteDoc(brandDoc)
}
