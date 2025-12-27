import { collection, addDoc, getDocs, doc, updateDoc, getDoc, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Types
// Statut de règlement
export type PaymentStatus = 'non_regle' | 'partiellement_regle' | 'regle'

export interface InvoiceHeader {
    id?: string
    invoiceNumber: string
    invoiceDate: Date
    locationIds: string[] // Multiple locations can be invoiced together
    clientId: string
    clientName: string
    clientTaxId: string // CIN ou Matricule Fiscal
    subtotalHT: number
    discountAmount: number
    taxableAmount: number
    tvaRate: number // 19%
    tvaAmount: number
    timbreFiscal: number // 1 DT
    totalTTC: number
    paymentStatus: PaymentStatus
    paidAmount: number
    remainingAmount: number
    status: 'draft' | 'validated' | 'paid' | 'cancelled'
    createdAt: Date
    validatedAt?: Date
}

export interface InvoiceLine {
    id?: string
    invoiceId: string
    locationId: string // Link to the original location
    description: string
    period: string // Ex: "01/01/2025 - 05/01/2025"
    vehicleRegistration: string
    vehicleBrandModel: string
    quantity: number // nombre de jours
    unitPrice: number
    discountPercent: number
    discountAmount: number
    totalHT: number
}

// Helper to convert Firestore Timestamps to Date objects
const convertTimestampsToDates = (data: any): any => {
    const newData = { ...data }
    if (newData.invoiceDate && typeof newData.invoiceDate.toDate === 'function') {
        newData.invoiceDate = newData.invoiceDate.toDate()
    }
    if (newData.createdAt && typeof newData.createdAt.toDate === 'function') {
        newData.createdAt = newData.createdAt.toDate()
    }
    if (newData.validatedAt && typeof newData.validatedAt.toDate === 'function') {
        newData.validatedAt = newData.validatedAt.toDate()
    }
    return newData
}

// Générer un numéro de facture unique
export const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const invoicesCol = collection(db, 'invoices')
    const q = query(invoicesCol, orderBy('invoiceNumber', 'desc'))
    const snapshot = await getDocs(q)

    let nextNumber = 1
    if (!snapshot.empty) {
        const lastInvoice = snapshot.docs[0].data()
        const lastNumber = parseInt(lastInvoice.invoiceNumber?.split('-')[1] || '0')
        nextNumber = lastNumber + 1
    }

    return `${year}-${nextNumber.toString().padStart(5, '0')}`
}

// Calculer les totaux d'une facture
export const calculateInvoiceTotals = (lines: InvoiceLine[], tvaRate: number = 19, timbreFiscal: number = 1) => {
    const subtotalHT = lines.reduce((sum, line) => sum + line.totalHT, 0)
    const discountAmount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
    const taxableAmount = subtotalHT - discountAmount
    const tvaAmount = taxableAmount * (tvaRate / 100)
    const totalTTC = taxableAmount + tvaAmount + timbreFiscal

    return {
        subtotalHT,
        discountAmount,
        taxableAmount,
        tvaRate,
        tvaAmount,
        timbreFiscal,
        totalTTC
    }
}

// Créer une facture complète (header + lines)
export const createInvoice = async (header: Omit<InvoiceHeader, 'id'>, lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[]): Promise<string> => {
    try {
        // Créer le header avec les champs de règlement initialisés
        const invoicesCol = collection(db, 'invoices')
        const invoiceDoc = await addDoc(invoicesCol, {
            ...header,
            paymentStatus: 'non_regle' as PaymentStatus,
            paidAmount: 0,
            remainingAmount: header.totalTTC,
            invoiceDate: Timestamp.fromDate(new Date(header.invoiceDate)),
            createdAt: Timestamp.fromDate(new Date())
        })

        // Créer les lignes
        const linesCol = collection(db, 'invoiceLines')
        const linePromises = lines.map(line =>
            addDoc(linesCol, {
                ...line,
                invoiceId: invoiceDoc.id
            })
        )
        await Promise.all(linePromises)

        return invoiceDoc.id
    } catch (error) {
        console.error('Error creating invoice:', error)
        throw error
    }
}

// Obtenir toutes les factures
export const getAllInvoices = async (): Promise<InvoiceHeader[]> => {
    try {
        const invoicesCol = collection(db, 'invoices')
        const q = query(invoicesCol, orderBy('invoiceDate', 'desc'))
        const snapshot = await getDocs(q)

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...convertTimestampsToDates(doc.data())
        } as InvoiceHeader))
    } catch (error) {
        console.error('Error fetching invoices:', error)
        throw error
    }
}

// Obtenir les lignes d'une facture
export const getInvoiceLines = async (invoiceId: string): Promise<InvoiceLine[]> => {
    try {
        const linesCol = collection(db, 'invoiceLines')
        const q = query(linesCol, where('invoiceId', '==', invoiceId))
        const snapshot = await getDocs(q)

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InvoiceLine))
    } catch (error) {
        console.error('Error fetching invoice lines:', error)
        throw error
    }
}

// Obtenir une facture par son ID
export const getInvoiceById = async (invoiceId: string): Promise<InvoiceHeader | null> => {
    try {
        const invoiceRef = doc(db, 'invoices', invoiceId)
        const invoiceSnap = await getDoc(invoiceRef)

        if (!invoiceSnap.exists()) {
            return null
        }

        return {
            id: invoiceSnap.id,
            ...convertTimestampsToDates(invoiceSnap.data())
        } as InvoiceHeader
    } catch (error) {
        console.error('Error fetching invoice by ID:', error)
        throw error
    }
}

// Valider une facture
export const validateInvoice = async (invoiceId: string): Promise<void> => {
    try {
        const invoiceRef = doc(db, 'invoices', invoiceId)
        await updateDoc(invoiceRef, {
            status: 'validated',
            validatedAt: Timestamp.fromDate(new Date())
        })
    } catch (error) {
        console.error('Error validating invoice:', error)
        throw error
    }
}

// Annuler une facture
export const cancelInvoice = async (invoiceId: string): Promise<void> => {
    try {
        const invoiceRef = doc(db, 'invoices', invoiceId)
        await updateDoc(invoiceRef, { status: 'cancelled' })
    } catch (error) {
        console.error('Error cancelling invoice:', error)
        throw error
    }
}

// ============ GESTION DES RÈGLEMENTS ============

// Mettre à jour le statut de règlement d'une facture
export const updateInvoicePaymentStatus = async (invoiceId: string, paidAmount: number): Promise<void> => {
    try {
        const invoiceRef = doc(db, 'invoices', invoiceId)
        const invoiceSnap = await getDoc(invoiceRef)

        if (!invoiceSnap.exists()) {
            console.warn(`Invoice with ID ${invoiceId} not found.`)
            return
        }

        const invoice = convertTimestampsToDates(invoiceSnap.data()) as InvoiceHeader
        const totalTTC = invoice.totalTTC
        const newPaidAmount = paidAmount
        const remainingAmount = totalTTC - newPaidAmount

        let paymentStatus: PaymentStatus = 'non_regle'
        if (newPaidAmount >= totalTTC) {
            paymentStatus = 'regle'
        } else if (newPaidAmount > 0) {
            paymentStatus = 'partiellement_regle'
        }

        await updateDoc(invoiceRef, {
            paidAmount: newPaidAmount,
            remainingAmount,
            paymentStatus
        })
    } catch (error) {
        console.error('Error updating invoice payment status:', error)
        throw error
    }
}

// Récupérer les factures non réglées
export const getUnpaidInvoices = async (clientId?: string): Promise<InvoiceHeader[]> => {
    try {
        let q
        const invoicesCol = collection(db, 'invoices')
        if (clientId) {
            q = query(
                invoicesCol,
                where('clientId', '==', clientId),
                where('paymentStatus', 'in', ['non_regle', 'partiellement_regle']),
                orderBy('invoiceDate', 'desc')
            )
        } else {
            q = query(
                invoicesCol,
                where('paymentStatus', 'in', ['non_regle', 'partiellement_regle']),
                orderBy('invoiceDate', 'desc')
            )
        }

        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...convertTimestampsToDates(doc.data())
        })) as InvoiceHeader[]
    } catch (error) {
        console.error('Error fetching unpaid invoices:', error)
        throw error
    }
}

// Récupérer les factures partiellement réglées
export const getPartiallyPaidInvoices = async (clientId?: string): Promise<InvoiceHeader[]> => {
    try {
        let q
        const invoicesCol = collection(db, 'invoices')
        if (clientId) {
            q = query(
                invoicesCol,
                where('clientId', '==', clientId),
                where('paymentStatus', '==', 'partiellement_regle'),
                orderBy('invoiceDate', 'desc')
            )
        } else {
            q = query(
                invoicesCol,
                where('paymentStatus', '==', 'partiellement_regle'),
                orderBy('invoiceDate', 'desc')
            )
        }

        const querySnapshot = await getDocs(q)
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...convertTimestampsToDates(doc.data())
        })) as InvoiceHeader[]
    } catch (error) {
        console.error('Error fetching partially paid invoices:', error)
        throw error
    }
}
