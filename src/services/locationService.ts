import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export type CautionType = 'especes' | 'cheque' | 'carte_bancaire' | 'virement'
export type LocationStatus = 'planifiee' | 'en_cours' | 'terminee'
export type BillingStatus = 'Ouvert' | 'Facturé'

// Anomalie/Constat (utilisé pour début et fin de location)
export interface Anomaly {
    type: string  // Ex: "Choc", "Fissure", "Rayure", "Casse", etc.
    description: string
    emplacement: string  // Ex: "Pare-choc avant", "Porte conducteur", etc.
    photos?: string[]  // URLs des photos (optionnel pour plus tard)
}

export interface Location {
    id?: string
    // Relations
    clientId: string
    vehicleId: string

    // Dates
    dateDebut: Date
    dateFin: Date

    // Kilométrage
    kmDebut: number
    kmFin: number

    // Carburant (en %, 0-100)
    niveauCarburantDebut: number
    niveauCarburantFin: number

    // Constat début (livraison)
    anomaliesDebut: Anomaly[]

    // Constat fin (réception)
    anomaliesFin: Anomaly[]

    // Caution
    typeCaution: CautionType
    montantCaution: number

    // Tarification
    prixUnitaireHT: number
    nombreJours: number  // Calculé
    totalHT: number  // Calculé
    totalTTC: number  // Calculé (TVA 19%)

    // Notes
    notes: string

    // Facturation
    statutFacturation: BillingStatus
}

const COLLECTION_NAME = 'locations'
const TVA_RATE = 0.19

// Calculer le nombre de jours entre deux dates
export const calculateDays = (dateDebut: Date, dateFin: Date): number => {
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    const diffTime = Math.abs(fin.getTime() - debut.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays || 1  // Minimum 1 jour
}

// Calculer les totaux
export const calculateTotals = (prixUnitaireHT: number, nombreJours: number) => {
    const totalHT = prixUnitaireHT * nombreJours
    const totalTTC = totalHT * (1 + TVA_RATE)
    return { totalHT, totalTTC }
}

// Calculer le statut de la location basé sur les dates
export const getLocationStatus = (dateDebut: Date, dateFin: Date): LocationStatus => {
    const now = new Date()
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)

    if (now < debut) {
        return 'planifiee'
    } else if (now > fin) {
        return 'terminee'
    } else {
        return 'en_cours'
    }
}

// Convertir les dates Firestore en Date JavaScript
const convertTimestampToDate = (data: any): Location => {
    return {
        ...data,
        dateDebut: data.dateDebut?.toDate ? data.dateDebut.toDate() : new Date(data.dateDebut),
        dateFin: data.dateFin?.toDate ? data.dateFin.toDate() : new Date(data.dateFin),
    }
}

// Récupérer toutes les locations
export const getAllLocations = async (): Promise<Location[]> => {
    const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('dateDebut', 'desc'))
    )
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Location[]
}

// Ajouter une location
export const addLocation = async (location: Omit<Location, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...location,
        dateDebut: Timestamp.fromDate(new Date(location.dateDebut)),
        dateFin: Timestamp.fromDate(new Date(location.dateFin)),
    })
    return docRef.id
}

// Modifier une location
export const updateLocation = async (id: string, location: Partial<Omit<Location, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...location }

    if (location.dateDebut) {
        updateData.dateDebut = Timestamp.fromDate(new Date(location.dateDebut))
    }
    if (location.dateFin) {
        updateData.dateFin = Timestamp.fromDate(new Date(location.dateFin))
    }

    await updateDoc(docRef, updateData)
}


// Supprimer une location
export const deleteLocation = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
}

// Récupérer les locations non facturées d'un client
export const getLocationsByClientAndStatus = async (clientId: string, status: BillingStatus = 'Ouvert'): Promise<Location[]> => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId),
        where('statutFacturation', '==', status),
        orderBy('dateDebut', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Location[]
}

// Mettre à jour le statut de facturation de plusieurs locations
export const updateLocationsBillingStatus = async (locationIds: string[], status: BillingStatus): Promise<void> => {
    const updatePromises = locationIds.map(id => {
        const docRef = doc(db, COLLECTION_NAME, id)
        return updateDoc(docRef, { statutFacturation: status })
    })
    await Promise.all(updatePromises)
}
