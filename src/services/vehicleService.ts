import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export interface Vehicle {
    id?: string
    modelId: string  // Clé étrangère vers le modèle
    numeroChassis: string
    immatriculation: string
    dateMiseCirculation: Date
    nomAssurance: string
    dateAssurance: Date
    dateVisite: Date
    dateVignette: Date
    actif: boolean
    prixUnitaireHT: number
}

const COLLECTION_NAME = 'vehicles'

// Convertir les dates Firestore en Date JavaScript
const convertTimestampToDate = (data: any): Vehicle => {
    return {
        ...data,
        dateMiseCirculation: data.dateMiseCirculation?.toDate ? data.dateMiseCirculation.toDate() : new Date(data.dateMiseCirculation),
        dateAssurance: data.dateAssurance?.toDate ? data.dateAssurance.toDate() : new Date(data.dateAssurance),
        dateVisite: data.dateVisite?.toDate ? data.dateVisite.toDate() : new Date(data.dateVisite),
        dateVignette: data.dateVignette?.toDate ? data.dateVignette.toDate() : new Date(data.dateVignette),
    }
}

// Récupérer tous les véhicules
export const getAllVehicles = async (): Promise<Vehicle[]> => {
    const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('immatriculation'))
    )
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Vehicle[]
}

// Ajouter un véhicule
export const addVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        modelId: vehicle.modelId,
        numeroChassis: vehicle.numeroChassis,
        immatriculation: vehicle.immatriculation,
        dateMiseCirculation: Timestamp.fromDate(new Date(vehicle.dateMiseCirculation)),
        nomAssurance: vehicle.nomAssurance,
        dateAssurance: Timestamp.fromDate(new Date(vehicle.dateAssurance)),
        dateVisite: Timestamp.fromDate(new Date(vehicle.dateVisite)),
        dateVignette: Timestamp.fromDate(new Date(vehicle.dateVignette)),
        actif: vehicle.actif,
        prixUnitaireHT: vehicle.prixUnitaireHT,
    })
    return docRef.id
}

// Modifier un véhicule
export const updateVehicle = async (id: string, vehicle: Partial<Omit<Vehicle, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = {}

    if (vehicle.modelId !== undefined) updateData.modelId = vehicle.modelId
    if (vehicle.numeroChassis !== undefined) updateData.numeroChassis = vehicle.numeroChassis
    if (vehicle.immatriculation !== undefined) updateData.immatriculation = vehicle.immatriculation
    if (vehicle.dateMiseCirculation !== undefined) updateData.dateMiseCirculation = Timestamp.fromDate(new Date(vehicle.dateMiseCirculation))
    if (vehicle.nomAssurance !== undefined) updateData.nomAssurance = vehicle.nomAssurance
    if (vehicle.dateAssurance !== undefined) updateData.dateAssurance = Timestamp.fromDate(new Date(vehicle.dateAssurance))
    if (vehicle.dateVisite !== undefined) updateData.dateVisite = Timestamp.fromDate(new Date(vehicle.dateVisite))
    if (vehicle.dateVignette !== undefined) updateData.dateVignette = Timestamp.fromDate(new Date(vehicle.dateVignette))
    if (vehicle.actif !== undefined) updateData.actif = vehicle.actif
    if (vehicle.prixUnitaireHT !== undefined) updateData.prixUnitaireHT = vehicle.prixUnitaireHT

    await updateDoc(docRef, updateData)
}

// Supprimer un véhicule
export const deleteVehicle = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
}
