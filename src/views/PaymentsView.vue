<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Calendar from 'primevue/calendar'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import {
    getAllPayments, createPayment, getPaymentLines, getPaymentAllocations,
    generatePaymentNumber,
    type Payment, type PaymentLine, type PaymentAllocation, type PaymentMethod
} from '../services/paymentService'
import { getAllClients, type Client } from '../services/clientService'
import { getUnpaidInvoices, updateInvoicePaymentStatus, getInvoiceById, type InvoiceHeader } from '../services/invoiceService'

const toast = useToast()
const confirm = useConfirm()

// Data
const payments = ref<Payment[]>([])
const invoices = ref<InvoiceHeader[]>([])
const clients = ref<Client[]>([])
const loading = ref(false)

// Dialog state
const dialogVisible = ref(false)
const dialogStep = ref(1) // 1-4 steps
const selectedClient = ref<Client | null>(null)
const selectedInvoices = ref<InvoiceHeader[]>([])
const availableInvoices = ref<InvoiceHeader[]>([])

// Details dialog
const detailsDialogVisible = ref(false)
const selectedPayment = ref<Payment | null>(null)
const selectedPaymentLines = ref<PaymentLine[]>([])
const selectedPaymentAllocations = ref<PaymentAllocation[]>([])
const allocatedInvoices = ref<InvoiceHeader[]>([])

// Payment form
const paymentForm = ref<Omit<Payment, 'id'>>({
    paymentNumber: '',
    paymentDate: new Date(),
    clientId: '',
    totalAmount: 0,
    notes: '',
    createdAt: new Date()
})

// Payment lines
const paymentLines = ref<Omit<PaymentLine, 'id' | 'paymentId'>[]>([])

// Methods section definitions
const paymentMethods: { label: string, value: PaymentMethod }[] = [
    { label: 'Espèces', value: 'especes' },
    { label: 'Chèque', value: 'cheque' },
    { label: 'Traite', value: 'traite' },
    { label: 'Virement', value: 'virement' }
]

// Computed
const totalInvoices = computed(() =>
    selectedInvoices.value.reduce((sum, inv) => sum + (inv.remainingAmount || inv.totalTTC), 0)
)

const totalPaymentLines = computed(() =>
    paymentLines.value.reduce((sum, line) => sum + line.amount, 0)
)

const isAmountValid = computed(() =>
    Math.abs(totalPaymentLines.value - totalInvoices.value) < 0.01
)

// Load data
const loadPayments = async () => {
    loading.value = true
    try {
        payments.value = await getAllPayments()
        // Also load all invoices for reference
        invoices.value = await getUnpaidInvoices()
    } catch (error) {
        console.error('Error loading payments:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les règlements', life: 3000 })
    } finally {
        loading.value = false
    }
}

const loadClients = async () => {
    try {
        clients.value = await getAllClients()
    } catch (error) {
        console.error('Error loading clients:', error)
    }
}

// Open dialog
const openCreateDialog = async () => {
    const paymentNumber = await generatePaymentNumber()
    paymentForm.value = {
        paymentNumber,
        paymentDate: new Date(),
        clientId: '',
        totalAmount: 0,
        notes: '',
        createdAt: new Date()
    }
    selectedClient.value = null
    selectedInvoices.value = []
    paymentLines.value = []
    dialogStep.value = 1
    dialogVisible.value = true
}

// Step navigation
const nextStep = async () => {
    if (dialogStep.value === 1) {
        if (!selectedClient.value) {
            toast.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner un client', life: 3000 })
            return
        }
        // Load unpaid invoices
        try {
            availableInvoices.value = await getUnpaidInvoices(selectedClient.value.id)
            paymentForm.value.clientId = selectedClient.value.id!
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les factures', life: 3000 })
            return
        }
    } else if (dialogStep.value === 2) {
        if (selectedInvoices.value.length === 0) {
            toast.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner au moins une facture', life: 3000 })
            return
        }
    } else if (dialogStep.value === 3) {
        if (paymentLines.value.length === 0) {
            toast.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez ajouter au moins un mode de règlement', life: 3000 })
            return
        }
        if (!isAmountValid.value) {
            toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le total des lignes doit égaler le total des factures', life: 3000 })
            return
        }
    }

    dialogStep.value++
}

const previousStep = () => {
    dialogStep.value--
}

// Add payment line
const addPaymentLine = () => {
    paymentLines.value.push({
        paymentMethod: 'especes',
        amount: 0,
        reference: '',
        bankName: '',
        status: 'en_attente'
    })
}

const removePaymentLine = (index: number) => {
    paymentLines.value.splice(index, 1)
}

// Create payment
const validatePayment = async () => {
    if (!isAmountValid.value) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Montants invalides', life: 3000 })
        return
    }

    loading.value = true
    try {
        // Prepare allocations
        const allocations: Omit<PaymentAllocation, 'id' | 'paymentId' | 'allocationDate'>[] = []
        selectedInvoices.value.forEach(invoice => {
            allocations.push({
                invoiceId: invoice.id!,
                allocatedAmount: invoice.remainingAmount || invoice.totalTTC
            })
        })

        paymentForm.value.totalAmount = totalPaymentLines.value

        // Create payment
        await createPayment(paymentForm.value, paymentLines.value, allocations)

        // Update invoice statuses
        for (const allocation of allocations) {
            const invoice = selectedInvoices.value.find(inv => inv.id === allocation.invoiceId)
            if (invoice) {
                const newPaidAmount = (invoice.paidAmount || 0) + allocation.allocatedAmount
                await updateInvoicePaymentStatus(invoice.id!, newPaidAmount)
            }
        }

        toast.add({ severity: 'success', summary: 'Succès', detail: 'Règlement créé avec succès', life: 3000 })
        dialogVisible.value = false
        await loadPayments()
    } catch (error) {
        console.error('Error creating payment:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la création du règlement', life: 3000 })
    } finally {
        loading.value = false
    }
}

const formatCurrency = (value: number): string => {
    return value.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR')
}

const getClientName = (clientId: string): string => {
    const client = clients.value.find(c => c.id === clientId)
    return client ? `${client.prenom} ${client.nom}` : clientId
}

const getPaymentMethodLabel = (method: PaymentMethod): string => {
    return paymentMethods.find(m => m.value === method)?.label || method
}

const getPaymentLineStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        'en_attente': 'En attente',
        'encaisse': 'Encaissé',
        'rejete': 'Rejeté'
    }
    return labels[status] || status
}

const getPaymentLineStatusSeverity = (status: string): 'warning' | 'success' | 'danger' => {
    const severities: Record<string, 'warning' | 'success' | 'danger'> = {
        'en_attente': 'warning',
        'encaisse': 'success',
        'rejete': 'danger'
    }
    return severities[status] || 'warning'
}

// Open details dialog - FIXED: fetch invoices by ID from Firestore
const openDetailsDialog = async (payment: Payment) => {
    selectedPayment.value = payment
    try {
        // Load payment lines
        selectedPaymentLines.value = await getPaymentLines(payment.id!)

        // Load payment allocations
        selectedPaymentAllocations.value = await getPaymentAllocations(payment.id!)

        // Load invoices for allocations - fetch each invoice by ID from Firestore
        allocatedInvoices.value = []
        for (const allocation of selectedPaymentAllocations.value) {
            const invoice = await getInvoiceById(allocation.invoiceId)
            if (invoice) {
                allocatedInvoices.value.push(invoice)
            }
        }

        detailsDialogVisible.value = true
    } catch (error) {
        console.error('Error loading payment details:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les détails', life: 3000 })
    }
}

const getAllocatedAmount = (invoiceId: string): number => {
    const allocation = selectedPaymentAllocations.value.find(a => a.invoiceId === invoiceId)
    return allocation?.allocatedAmount || 0
}

onMounted(async () => {
    await loadClients()
    await loadPayments()
})
</script>

<template>
    <MainLayout>
        <Toast />
        <ConfirmDialog />

        <div class="payments-view">
            <div class="header">
                <h2>Règlements</h2>
                <Button label="Nouveau règlement" icon="pi pi-plus" @click="openCreateDialog" />
            </div>

            <DataTable :value="payments" :loading="loading" strippedRows :paginator="true" :rows="20">
                <Column field="paymentNumber" header="N° Règlement" sortable />
                <Column field="paymentDate" header="Date" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.paymentDate) }}
                    </template>
                </Column>
                <Column field="clientId" header="Client" sortable>
                    <template #body="slotProps">
                        {{ getClientName(slotProps.data.clientId) }}
                    </template>
                </Column>
                <Column field="totalAmount" header="Montant" sortable>
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.totalAmount) }}
                    </template>
                </Column>
                <Column header="Actions">
                    <template #body="slotProps">
                        <Button icon="pi pi-eye" label="Détails" size="small"
                            @click="openDetailsDialog(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>

            <!-- Dialog Création (4 étapes)-->
            <Dialog v-model:visible="dialogVisible" :header="`Nouveau règlement - Étape ${dialogStep}/4`" :modal="true"
                :style="{ width: '80vw' }">

                <!-- Step 1: Client Selection -->
                <div v-if="dialogStep === 1" class="step-content">
                    <div class="form-group">
                        <label>Numéro</label>
                        <InputText v-model="paymentForm.paymentNumber" disabled />
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <Calendar v-model="paymentForm.paymentDate" dateFormat="dd/mm/yy" />
                    </div>
                    <div class="form-group">
                        <label>Client *</label>
                        <Dropdown v-model="selectedClient" :options="clients" optionLabel="nom"
                            placeholder="Sélectionner un client" filter :style="{ width: '100%' }">
                            <template #value="slotProps">
                                <span v-if="slotProps.value">{{ slotProps.value.prenom }} {{ slotProps.value.nom
                                    }}</span>
                                <span v-else>{{ slotProps.placeholder }}</span>
                            </template>
                            <template #option="slotProps">
                                {{ slotProps.option.prenom }} {{ slotProps.option.nom }}
                            </template>
                        </Dropdown>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <Textarea v-model="paymentForm.notes" rows="3" :style="{ width: '100%' }" />
                    </div>
                </div>

                <!-- Step 2: Invoice Selection -->
                <div v-if="dialogStep === 2" class="step-content">
                    <h4>Sélectionnez les factures à régler</h4>
                    <DataTable v-model:selection="selectedInvoices" :value="availableInvoices" dataKey="id"
                        :selection-mode="'multiple'">
                        <Column selectionMode="multiple" headerStyle="width: 3rem" />
                        <Column field="invoiceNumber" header="N° Facture" />
                        <Column field="invoiceDate" header="Date">
                            <template #body="slotProps">
                                {{ formatDate(slotProps.data.invoiceDate) }}
                            </template>
                        </Column>
                        <Column field="totalTTC" header="Montant TTC">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.totalTTC) }}
                            </template>
                        </Column>
                        <Column field="paidAmount" header="Déjà réglé">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.paidAmount || 0) }}
                            </template>
                        </Column>
                        <Column field="remainingAmount" header="Reste à payer">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.remainingAmount || slotProps.data.totalTTC) }}
                            </template>
                        </Column>
                    </DataTable>
                    <div class="total-line">
                        <strong>Total à régler: {{ formatCurrency(totalInvoices) }}</strong>
                    </div>
                </div>

                <!-- Step 3: Payment Methods -->
                <div v-if="dialogStep === 3" class="step-content">
                    <div class="header-section">
                        <h4>Modes de règlement</h4>
                        <Button label="Ajouter" icon="pi pi-plus" size="small" @click="addPaymentLine" />
                    </div>

                    <DataTable :value="paymentLines">
                        <Column field="paymentMethod" header="Mode *">
                            <template #body="slotProps">
                                <Dropdown v-model="paymentLines[slotProps.index].paymentMethod"
                                    :options="paymentMethods" optionLabel="label" optionValue="value" />
                            </template>
                        </Column>
                        <Column field="amount" header="Montant *">
                            <template #body="slotProps">
                                <InputNumber v-model="paymentLines[slotProps.index].amount" mode="currency"
                                    currency="TND" locale="fr-TN" />
                            </template>
                        </Column>
                        <Column field="reference" header="Référence">
                            <template #body="slotProps">
                                <InputText v-model="paymentLines[slotProps.index].reference" />
                            </template>
                        </Column>
                        <Column field="bankName" header="Banque">
                            <template #body="slotProps">
                                <InputText v-model="paymentLines[slotProps.index].bankName" />
                            </template>
                        </Column>
                        <Column field="dueDate" header="Échéance">
                            <template #body="slotProps">
                                <Calendar v-model="paymentLines[slotProps.index].dueDate" dateFormat="dd/mm/yy"
                                    v-if="['traite', 'cheque'].includes(paymentLines[slotProps.index].paymentMethod)" />
                            </template>
                        </Column>
                        <Column header="Actions">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" text
                                    @click="removePaymentLine(slotProps.index)" />
                            </template>
                        </Column>
                    </DataTable>

                    <div class="total-line">
                        <div>Total lignes: {{ formatCurrency(totalPaymentLines) }}</div>
                        <div>Total factures: {{ formatCurrency(totalInvoices) }}</div>
                        <Tag v-if="!isAmountValid" severity="danger" value="Montants différents !" />
                        <Tag v-else severity="success" value="Montants OK" />
                    </div>
                </div>

                <!-- Step 4: Summary -->
                <div v-if="dialogStep === 4" class="step-content">
                    <h4>Récapitulatif</h4>

                    <div class="summary-section">
                        <h5>Client</h5>
                        <p>{{ selectedClient?.prenom }} {{ selectedClient?.nom }}</p>
                    </div>

                    <div class="summary-section">
                        <h5>Factures ({{ selectedInvoices.length }})</h5>
                        <ul>
                            <li v-for="invoice in selectedInvoices" :key="invoice.id">
                                {{ invoice.invoiceNumber }} - {{ formatCurrency(invoice.remainingAmount ||
                                invoice.totalTTC) }}
                            </li>
                        </ul>
                    </div>

                    <div class="summary-section">
                        <h5>Modes de règlement ({{ paymentLines.length }})</h5>
                        <ul>
                            <li v-for="(line, i) in paymentLines" :key="i">
                                {{ getPaymentMethodLabel(line.paymentMethod) }} - {{ formatCurrency(line.amount) }}
                            </li>
                        </ul>
                    </div>

                    <div class="summary-total">
                        <strong>Total: {{ formatCurrency(totalPaymentLines) }}</strong>
                    </div>
                </div>

                <template #footer>
                    <Button v-if="dialogStep > 1" label="Précédent" icon="pi pi-arrow-left" @click="previousStep"
                        severity="secondary" />
                    <Button v-if="dialogStep < 4" label="Suivant" icon="pi pi-arrow-right" @click="nextStep" />
                    <Button v-if="dialogStep === 4" label="Valider" icon="pi pi-check" @click="validatePayment"
                        severity="success" />
                </template>
            </Dialog>

            <!-- Details Dialog -->
            <Dialog v-model:visible="detailsDialogVisible" header="Détails du règlement" :modal="true"
                :style="{ width: '70vw' }">
                <div v-if="selectedPayment" class="details-content">
                    <!-- Payment Info -->
                    <div class="info-section">
                        <h4>Informations générales</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <label>N° Règlement</label>
                                <p>{{ selectedPayment.paymentNumber }}</p>
                            </div>
                            <div class="info-item">
                                <label>Date</label>
                                <p>{{ formatDate(selectedPayment.paymentDate) }}</p>
                            </div>
                            <div class="info-item">
                                <label>Client</label>
                                <p>{{ getClientName(selectedPayment.clientId) }}</p>
                            </div>
                            <div class="info-item">
                                <label>Montant total</label>
                                <p><strong>{{ formatCurrency(selectedPayment.totalAmount) }}</strong></p>
                            </div>
                        </div>
                        <div v-if="selectedPayment.notes" class="info-item">
                            <label>Notes</label>
                            <p>{{ selectedPayment.notes }}</p>
                        </div>
                    </div>

                    <!-- Payment Lines -->
                    <div class="info-section">
                        <h4>Modes de règlement ({{ selectedPaymentLines.length }})</h4>
                        <DataTable :value="selectedPaymentLines" size="small">
                            <Column field="paymentMethod" header="Mode">
                                <template #body="slotProps">
                                    {{ getPaymentMethodLabel(slotProps.data.paymentMethod) }}
                                </template>
                            </Column>
                            <Column field="amount" header="Montant">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.amount) }}
                                </template>
                            </Column>
                            <Column field="reference" header="Référence" />
                            <Column field="bankName" header="Banque" />
                            <Column field="dueDate" header="Échéance">
                                <template #body="slotProps">
                                    <span v-if="slotProps.data.dueDate">{{ formatDate(slotProps.data.dueDate) }}</span>
                                    <span v-else>-</span>
                                </template>
                            </Column>
                            <Column field="status" header="Statut">
                                <template #body="slotProps">
                                    <Tag :value="getPaymentLineStatusLabel(slotProps.data.status)"
                                        :severity="getPaymentLineStatusSeverity(slotProps.data.status)" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>

                    <!-- Allocated Invoices -->
                    <div class="info-section">
                        <h4>Factures réglées ({{ allocatedInvoices.length }})</h4>
                        <DataTable :value="allocatedInvoices" size="small">
                            <Column field="invoiceNumber" header="N° Facture" />
                            <Column field="invoiceDate" header="Date">
                                <template #body="slotProps">
                                    {{ formatDate(slotProps.data.invoiceDate) }}
                                </template>
                            </Column>
                            <Column field="totalTTC" header="Total TTC">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.totalTTC) }}
                                </template>
                            </Column>
                            <Column header="Montant réglé">
                                <template #body="slotProps">
                                    <strong>{{ formatCurrency(getAllocatedAmount(slotProps.data.id!)) }}</strong>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.payments-view {
    padding: 2rem;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.step-content {
    padding: 1rem 0;
    min-height: 400px;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #334155;
}

.total-line {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.summary-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 6px;
}

.summary-section h5 {
    margin: 0 0 0.5rem 0;
    color: #1e3a8a;
}

.summary-section ul {
    margin: 0;
    padding-left: 1.5rem;
}

.summary-total {
    padding: 1rem;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    color: white;
    border-radius: 6px;
    text-align: center;
    font-size: 1.2rem;
}

.details-content {
    padding: 1rem 0;
}

.info-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
}

.info-section:last-child {
    border-bottom: none;
}

.info-section h4 {
    margin: 0 0 1rem 0;
    color: #1e3a8a;
    font-size: 1.1rem;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.info-item label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 600;
}

.info-item p {
    margin: 0;
    color: #1e293b;
    font-size: 1rem;
}
</style>
