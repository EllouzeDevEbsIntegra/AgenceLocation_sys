import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export type ClientType = 'physique' | 'morale'
export type Gender = 'homme' | 'femme'

export interface Driver {
    nom: string
    prenom: string
    dateNaissance: Date
    sexe: Gender
    numeroPermis: string
    datePermis: Date
    adresse: string
    telephone: string
    commentaire: string
}

export interface Client {
    id?: string
    // Informations générales
    nom: string
    prenom: string
    typeClient: ClientType
    raisonSociale?: string  // Obligatoire si morale
    adresse: string
    telephone: string
    email: string
    // Identification
    numeroCIN?: string  // Si physique
    matriculeFiscale?: string  // Si morale
    // Conducteurs (max 2)
    conducteurs: Driver[]
}

const COLLECTION_NAME = 'clients'

// Convertir les dates Firestore en Date JavaScript
const convertTimestampToDate = (data: any): Client => {
    return {
        ...data,
        conducteurs: data.conducteurs?.map((driver: any) => ({
            ...driver,
            dateNaissance: driver.dateNaissance?.toDate ? driver.dateNaissance.toDate() : new Date(driver.dateNaissance),
            datePermis: driver.datePermis?.toDate ? driver.datePermis.toDate() : new Date(driver.datePermis),
        })) || []
    }
}

// Convertir les dates en Timestamp Firestore
const convertDateToTimestamp = (client: Omit<Client, 'id'>): any => {
    return {
        ...client,
        conducteurs: client.conducteurs.map(driver => ({
            ...driver,
            dateNaissance: Timestamp.fromDate(new Date(driver.dateNaissance)),
            datePermis: Timestamp.fromDate(new Date(driver.datePermis)),
        }))
    }
}

// Récupérer tous les clients
export const getAllClients = async (): Promise<Client[]> => {
    const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('nom'))
    )
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data()),
    })) as Client[]
}

// Ajouter un client
export const addClient = async (client: Omit<Client, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), convertDateToTimestamp(client))
    return docRef.id
}

// Modifier un client
export const updateClient = async (id: string, client: Partial<Omit<Client, 'id'>>): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    const updateData: any = { ...client }

    // Convertir les dates des conducteurs si présents
    if (client.conducteurs) {
        updateData.conducteurs = client.conducteurs.map(driver => ({
            ...driver,
            dateNaissance: Timestamp.fromDate(new Date(driver.dateNaissance)),
            datePermis: Timestamp.fromDate(new Date(driver.datePermis)),
        }))
    }

    await updateDoc(docRef, updateData)
}

// Supprimer un client
export const deleteClient = async (id: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
}
