import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, limit } from 'firebase/firestore'
import { db } from '../firebase'

// Types de modes de paiement
export type PaymentMethod = 'especes' | 'cheque' | 'traite' | 'virement'

// Statuts des lignes de règlement (pour échéances)
export type PaymentLineStatus = 'en_attente' | 'encaisse' | 'rejete'

// Règlement principal
export interface Payment {
    id?: string
    paymentNumber: string
    paymentDate: Date
    clientId: string
    totalAmount: number
    notes: string
    createdAt: Date
}

// Ligne de règlement (mode de paiement)
export interface PaymentLine {
    id?: string
    paymentId: string
    paymentMethod: PaymentMethod
    amount: number
    reference: string  // N° chèque, traite, virement
    bankName: string
    dueDate?: Date  // Pour traites et chèques différés
    status: PaymentLineStatus
}

// Affectation règlement -> facture
export interface PaymentAllocation {
    id?: string
    paymentId: string
    invoiceId: string
    allocatedAmount: number
    allocationDate: Date
}

const PAYMENTS_COLLECTION = 'payments'
const PAYMENT_LINES_COLLECTION = 'payment_lines'
const PAYMENT_ALLOCATIONS_COLLECTION = 'payment_allocations'

// Convertir les Timestamps Firestore en Dates
const convertTimestampToDate = (data: any): any => {
    const converted = { ...data }
    if (data.paymentDate?.toDate) converted.paymentDate = data.paymentDate.toDate()
    if (data.createdAt?.toDate) converted.createdAt = data.createdAt.toDate()
    if (data.dueDate?.toDate) converted.dueDate = data.dueDate.toDate()
    if (data.allocationDate?.toDate) converted.allocationDate = data.allocationDate.toDate()
    return converted
}

// ============ PAYMENTS ============

// Générer le numéro de règlement
export const generatePaymentNumber = async (): Promise<string> => {
    const year = new Date().getFullYear()
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        orderBy('paymentNumber', 'desc'),
        limit(1)
    )
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
        return `REG${year}-0001`
    }

    const lastPayment = querySnapshot.docs[0].data()
    const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[1])
    const newNumber = (lastNumber + 1).toString().padStart(4, '0')
    return `REG${year}-${newNumber}`
}

// Créer un règlement complet (payment + lines + allocations)
export const createPayment = async (
    payment: Omit<Payment, 'id'>,
    lines: Omit<PaymentLine, 'id' | 'paymentId'>[],
    allocations: Omit<PaymentAllocation, 'id' | 'paymentId' | 'allocationDate'>[]
): Promise<string> => {
    // Créer le payment
    const paymentRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
        ...payment,
        paymentDate: Timestamp.fromDate(new Date(payment.paymentDate)),
        createdAt: Timestamp.fromDate(new Date())
    })

    const paymentId = paymentRef.id

    // Créer les lignes de règlement
    for (const line of lines) {
        await addDoc(collection(db, PAYMENT_LINES_COLLECTION), {
            ...line,
            paymentId,
            dueDate: line.dueDate ? Timestamp.fromDate(new Date(line.dueDate)) : null
        })
    }

    // Créer les affectations
    for (const allocation of allocations) {
        await addDoc(collection(db, PAYMENT_ALLOCATIONS_COLLECTION), {
            ...allocation,
            paymentId,
            allocationDate: Timestamp.fromDate(new Date())
        })
    }

    return paymentId
}

// Récupérer tous les règlements
export const getAllPayments = async (): Promise<Payment[]> => {
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        orderBy('paymentDate', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as Payment[]
}

// Récupérer un règlement par ID
export const getPaymentById = async (id: string): Promise<Payment | null> => {
    const querySnapshot = await getDocs(
        query(collection(db, PAYMENTS_COLLECTION), where('__name__', '==', id))
    )
    if (querySnapshot.empty) return null

    const doc = querySnapshot.docs[0]
    return {
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    } as Payment
}

// Récupérer les lignes d'un règlement
export const getPaymentLines = async (paymentId: string): Promise<PaymentLine[]> => {
    const q = query(
        collection(db, PAYMENT_LINES_COLLECTION),
        where('paymentId', '==', paymentId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentLine[]
}

// Récupérer les affectations d'un règlement
export const getPaymentAllocations = async (paymentId: string): Promise<PaymentAllocation[]> => {
    const q = query(
        collection(db, PAYMENT_ALLOCATIONS_COLLECTION),
        where('paymentId', '==', paymentId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentAllocation[]
}

// ============ RECHERCHES ET FILTRES ============

// Règlements par client
export const getPaymentsByClient = async (clientId: string): Promise<Payment[]> => {
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where('clientId', '==', clientId),
        orderBy('paymentDate', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as Payment[]
}

// Affectations par facture (pour voir tous les paiements d'une facture)
export const getPaymentsByInvoice = async (invoiceId: string): Promise<PaymentAllocation[]> => {
    const q = query(
        collection(db, PAYMENT_ALLOCATIONS_COLLECTION),
        where('invoiceId', '==', invoiceId)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentAllocation[]
}

// Règlements par période
export const getPaymentsByDateRange = async (startDate: Date, endDate: Date): Promise<Payment[]> => {
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where('paymentDate', '>=', Timestamp.fromDate(startDate)),
        where('paymentDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('paymentDate', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as Payment[]
}

// Lignes de règlement par mode
export const getPaymentLinesByMethod = async (method: PaymentMethod): Promise<PaymentLine[]> => {
    const q = query(
        collection(db, PAYMENT_LINES_COLLECTION),
        where('paymentMethod', '==', method)
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentLine[]
}

// ============ GESTION DES ÉCHÉANCES ============

// Échéances à venir (X jours)
export const getUpcomingDueDates = async (days: number = 30): Promise<PaymentLine[]> => {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    const q = query(
        collection(db, PAYMENT_LINES_COLLECTION),
        where('dueDate', '>=', Timestamp.fromDate(today)),
        where('dueDate', '<=', Timestamp.fromDate(futureDate)),
        where('status', '==', 'en_attente'),
        orderBy('dueDate', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentLine[]
}

// Échéances en retard
export const getOverdueDueDates = async (): Promise<PaymentLine[]> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const q = query(
        collection(db, PAYMENT_LINES_COLLECTION),
        where('dueDate', '<', Timestamp.fromDate(today)),
        where('status', '==', 'en_attente'),
        orderBy('dueDate', 'asc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentLine[]
}

// Mettre à jour le statut d'une ligne de règlement
export const updatePaymentLineStatus = async (lineId: string, status: PaymentLineStatus): Promise<void> => {
    const docRef = doc(db, PAYMENT_LINES_COLLECTION, lineId)
    await updateDoc(docRef, { status })
}

// Toutes les échéances avec filtre de statut
export const getAllDueDates = async (status?: PaymentLineStatus): Promise<PaymentLine[]> => {
    let q
    if (status) {
        q = query(
            collection(db, PAYMENT_LINES_COLLECTION),
            where('status', '==', status),
            orderBy('dueDate', 'asc')
        )
    } else {
        q = query(
            collection(db, PAYMENT_LINES_COLLECTION),
            orderBy('dueDate', 'asc')
        )
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestampToDate(doc.data())
    })) as PaymentLine[]
}

// ============ STATISTIQUES ============

// Calculer le total des règlements par client
export const getTotalPaymentsByClient = async (clientId: string): Promise<number> => {
    const payments = await getPaymentsByClient(clientId)
    return payments.reduce((sum, payment) => sum + payment.totalAmount, 0)
}

// Calculer le total encaissé sur une période
export const getTotalCollectedByPeriod = async (startDate: Date, endDate: Date): Promise<number> => {
    const payments = await getPaymentsByDateRange(startDate, endDate)
    return payments.reduce((sum, payment) => sum + payment.totalAmount, 0)
}
