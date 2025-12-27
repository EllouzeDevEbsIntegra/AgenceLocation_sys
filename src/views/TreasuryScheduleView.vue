<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import { getUpcomingDueDates, getOverdueDueDates, updatePaymentLineStatus, type PaymentLine } from '../services/paymentService'
import { getAllClients, type Client } from '../services/clientService'

const toast = useToast()

// Data
const dueDates = ref<PaymentLine[]>([])
const clients = ref<Client[]>([])
const loading = ref(false)

// Filters
const filterPeriod = ref<number>(30) // days
const filterClient = ref<string>('')
const filterStatus = ref<string>('en_attente')

const periodOptions = [
    { label: '7 jours', value: 7 },
    { label: '30 jours', value: 30 },
    { label: '90 jours', value: 90 },
    { label: 'Tout', value: 365 }
]

const statusOptions = [
    { label: 'En attente', value: 'en_attente' },
    { label: 'Encaissé', value: 'encaisse' },
    { label: 'Rejeté', value: 'rejete' }
]

// Computed
const overdueCount = computed(() =>
    dueDates.value.filter(d => new Date(d.dueDate!) < new Date() && d.status === 'en_attente').length
)

const upcomingTotal = computed(() =>
    dueDates.value.filter(d => d.status === 'en_attente').reduce((sum, d) => sum + d.amount, 0)
)

// Load data
const loadDueDates = async () => {
    loading.value = true
    try {
        const upcoming = await getUpcomingDueDates(filterPeriod.value)
        const overdue = await getOverdueDueDates()
        dueDates.value = [...overdue, ...upcoming]
    } catch (error) {
        console.error('Error loading due dates:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les échéances', life: 3000 })
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

const updateStatus = async (line: PaymentLine, status: 'encaisse' | 'rejete') => {
    try {
        await updatePaymentLineStatus(line.id!, status)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Statut mis à jour', life: 3000 })
        await loadDueDates()
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur de mise à jour', life: 3000 })
    }
}

const formatCurrency = (value: number): string => {
    return value.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR')
}

const getMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
        especes: 'Espèces',
        cheque: 'Chèque',
        traite: 'Traite',
        virement: 'Virement'
    }
    return labels[method] || method
}

const getStatusSeverity = (status: string, dueDate: Date): string => {
    if (status !== 'en_attente') return status === 'encaisse' ? 'success' : 'danger'
    return new Date(dueDate) < new Date() ? 'danger' : 'warning'
}

onMounted(async () => {
    await loadClients()
    await loadDueDates()
})
</script>

<template>
    <MainLayout>
        <Toast />

        <div class="treasury-view">
            <div class="header">
                <h2>Échéancier Trésorerie</h2>
            </div>

            <!-- KPIs -->
            <div class="kpis">
                <div class="kpi-card danger">
                    <div class="kpi-value">{{ overdueCount }}</div>
                    <div class="kpi-label">Retards</div>
                </div>
                <div class="kpi-card warning">
                    <div class="kpi-value">{{ formatCurrency(upcomingTotal) }}</div>
                    <div class="kpi-label">À encaisser</div>
                </div>
            </div>

            <!-- Filters -->
            <div class="filters">
                <div class="filter-group">
                    <label>Période</label>
                    <Dropdown v-model="filterPeriod" :options="periodOptions" optionLabel="label" optionValue="value"
                        @change="loadDueDates" />
                </div>
                <div class="filter-group">
                    <label>Statut</label>
                    <Dropdown v-model="filterStatus" :options="statusOptions" optionLabel="label" optionValue="value"
                        @change="loadDueDates" />
                </div>
            </div>

            <!-- Table -->
            <DataTable :value="dueDates" :loading="loading" stripedRows :paginator="true" :rows="20">
                <Column field="dueDate" header="Échéance" sortable>
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.dueDate) }}
                    </template>
                </Column>
                <Column field="paymentMethod" header="Mode">
                    <template #body="slotProps">
                        {{ getMethodLabel(slotProps.data.paymentMethod) }}
                    </template>
                </Column>
                <Column field="reference" header="Référence" />
                <Column field="bankName" header="Banque" />
                <Column field="amount" header="Montant" sortable>
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.amount) }}
                    </template>
                </Column>
                <Column field="status" header="Statut">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.status"
                            :severity="getStatusSeverity(slotProps.data.status, slotProps.data.dueDate)" />
                    </template>
                </Column>
                <Column header="Actions">
                    <template #body="slotProps">
                        <Button v-if="slotProps.data.status === 'en_attente'" label="Encaisser" size="small"
                            severity="success" @click="updateStatus(slotProps.data, 'encaisse')" />
                        <Button v-if="slotProps.data.status === 'en_attente'" label="Rejeter" size="small"
                            severity="danger" @click="updateStatus(slotProps.data, 'rejete')"
                            style="margin-left: 0.5rem" />
                    </template>
                </Column>
            </DataTable>
        </div>
    </MainLayout>
</template>

<style scoped>
.treasury-view {
    padding: 2rem;
}

.header {
    margin-bottom: 2rem;
}

.kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.kpi-card {
    padding: 1.5rem;
    border-radius: 8px;
    background: white;
    border-left: 4px solid;
}

.kpi-card.danger {
    border-color: #ef4444;
}

.kpi-card.warning {
    border-color: #f59e0b;
}

.kpi-value {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.kpi-label {
    color: #64748b;
    margin-top: 0.5rem;
}

.filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.filter-group {
    flex: 1;
}

.filter-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #334155;
}
</style>
