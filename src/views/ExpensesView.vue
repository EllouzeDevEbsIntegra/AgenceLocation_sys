<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import MainLayout from '../layouts/MainLayout.vue'
import {
    getAllExpenses, addExpense, updateExpense, deleteExpense,
    type Expense, type ExpenseCategory, type FixedExpenseType,
    type VehicleExpenseType, type MiscExpenseType
} from '../services/expenseService'
import { getAllVehicles, type Vehicle } from '../services/vehicleService'
import { getAllParameters, type Parameter } from '../services/parameterService'

// Components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Textarea from 'primevue/textarea'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

import { useAppConfig } from '../composables/useAppConfig'
const { config, loadConfig, formatCurrency } = useAppConfig()

// Data
const expenses = ref<Expense[]>([])
const vehicles = ref<Vehicle[]>([])
const loading = ref(false)
const expenseDialog = ref(false)
const submitted = ref(false)
const deleteExpenseDialog = ref(false)

// Filters
const dateRange = ref<Date[]>([])
const selectedCategoryFilter = ref<string | null>(null)
const selectedVehicleFilter = ref<string | null>(null)

// Form
const expense = ref<Partial<Expense>>({
    date: new Date(),
    amount: 0,
    category: 'fixe',
    type: 'autre' as any,
    description: '',
    paymentMethod: 'especes'
})

// Options
const categories = ref<Parameter[]>([])
const allExpenseTypes = ref<Parameter[]>([])
const paymentMethods = ref<Parameter[]>([])

// Computed
const filteredExpenses = computed(() => {
    return expenses.value.filter(item => {
        // Date Filter
        if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
            const start = dateRange.value[0]
            const end = dateRange.value[1]
            const itemDate = new Date(item.date)
            if (itemDate < start || itemDate > end) return false
        }

        // Category Filter
        if (selectedCategoryFilter.value && item.category !== selectedCategoryFilter.value) {
            return false
        }

        // Vehicle Filter
        if (selectedVehicleFilter.value && item.vehicleId !== selectedVehicleFilter.value) {
            return false
        }

        return true
    })
})

const expenseTypes = computed(() => {
    if (!expense.value.category) return []
    return allExpenseTypes.value.filter(t => t.parentValue === expense.value.category)
})

// KPIs
const totalExpenses = computed(() => filteredExpenses.value.reduce((sum, item) => sum + item.amount, 0))
const fixedExpensesTotal = computed(() => filteredExpenses.value.filter(e => e.category === 'fixe').reduce((sum, item) => sum + item.amount, 0))
const vehicleExpensesTotal = computed(() => filteredExpenses.value.filter(e => e.category === 'vehicule').reduce((sum, item) => sum + item.amount, 0))
const miscExpensesTotal = computed(() => filteredExpenses.value.filter(e => e.category === 'divers').reduce((sum, item) => sum + item.amount, 0))

// Methods
const loadParameters = async () => {
    try {
        const allParams = await getAllParameters()
        categories.value = allParams.filter(p => p.type === 'expense_category')
        allExpenseTypes.value = allParams.filter(p => p.type === 'expense_type')
        paymentMethods.value = allParams.filter(p => p.type === 'payment_method')
    } catch (error) {
        console.error('Error loading parameters:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les paramètres', life: 3000 })
    }
}

onMounted(async () => {
    loading.value = true
    try {
        await loadParameters()
        await loadConfig()
        const [expensesData, vehiclesData] = await Promise.all([
            getAllExpenses(),
            getAllVehicles()
        ])
        expenses.value = expensesData
        vehicles.value = vehiclesData

        // Init date range to current month
        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        dateRange.value = [firstDay, today]
    } catch (error) {
        console.error(error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données', life: 3000 })
    } finally {
        loading.value = false
    }
})

const openNew = () => {
    expense.value = {
        date: new Date(),
        amount: 0,
        category: 'fixe',
        type: 'autre' as any,
        description: '',
        paymentMethod: 'especes'
    }
    submitted.value = false
    expenseDialog.value = true
}

const editExpense = (item: Expense) => {
    expense.value = { ...item, date: new Date(item.date) }
    expenseDialog.value = true
}

const saveExpense = async () => {
    submitted.value = true

    if (!expense.value.amount || !expense.value.date || !expense.value.category || !expense.value.type) {
        return
    }

    if (expense.value.category === 'vehicule' && !expense.value.vehicleId) {
        return
    }

    try {
        if (expense.value.id) {
            await updateExpense(expense.value.id, expense.value)
            const index = expenses.value.findIndex(e => e.id === expense.value.id)
            expenses.value[index] = expense.value as Expense
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Dépense mise à jour', life: 3000 })
        } else {
            const id = await addExpense(expense.value as Expense)
            expenses.value.unshift({ ...expense.value, id } as Expense)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Dépense créée', life: 3000 })
        }
        expenseDialog.value = false
        expense.value = {}
    } catch (error) {
        console.error(error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue', life: 3000 })
    }
}

const confirmDeleteExpense = (item: Expense) => {
    confirm.require({
        message: 'Voulez-vous vraiment supprimer cette dépense ?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
            try {
                if (item.id) {
                    await deleteExpense(item.id)
                    expenses.value = expenses.value.filter(e => e.id !== item.id)
                    toast.add({ severity: 'success', summary: 'Succès', detail: 'Dépense supprimée', life: 3000 })
                }
            } catch (error) {
                console.error(error)
                toast.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la suppression', life: 3000 })
            }
        }
    })
}



const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR')
}

const getVehicleName = (id?: string) => {
    if (!id) return '-'
    const v = vehicles.value.find(v => v.id === id)
    return v ? v.immatriculation : 'Inconnu'
}

const getCategoryLabel = (cat: string) => {
    const found = categories.value.find(c => c.value === cat)
    return found ? found.label : cat
}

const getTypeLabel = (type: string) => {
    const found = allExpenseTypes.value.find(t => t.value === type)
    return found ? found.label : type
}

const getSeverity = (cat: string) => {
    switch (cat) {
        case 'fixe': return 'danger'
        case 'vehicule': return 'warning'
        case 'divers': return 'info'
        default: return 'secondary'
    }
}
</script>

<template>
    <MainLayout>
        <div class="expenses-container">
            <div class="header-section">
                <h1>Gestion des Dépenses</h1>
                <Button label="Nouvelle Dépense" icon="pi pi-plus" @click="openNew" />
            </div>

            <!-- KPIs -->
            <div class="kpi-grid">
                <div class="kpi-card total">
                    <div class="kpi-icon">
                        <i class="pi pi-wallet"></i>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-value">{{ formatCurrency(totalExpenses) }}</span>
                        <span class="kpi-label">Total Dépenses</span>
                    </div>
                </div>
                <div class="kpi-card fixed">
                    <div class="kpi-icon">
                        <i class="pi pi-building"></i>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-value">{{ formatCurrency(fixedExpensesTotal) }}</span>
                        <span class="kpi-label">Charges Fixes</span>
                    </div>
                </div>
                <div class="kpi-card vehicle">
                    <div class="kpi-icon">
                        <i class="pi pi-car"></i>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-value">{{ formatCurrency(vehicleExpensesTotal) }}</span>
                        <span class="kpi-label">Charges Véhicules</span>
                    </div>
                </div>
                <div class="kpi-card misc">
                    <div class="kpi-icon">
                        <i class="pi pi-shopping-bag"></i>
                    </div>
                    <div class="kpi-content">
                        <span class="kpi-value">{{ formatCurrency(miscExpensesTotal) }}</span>
                        <span class="kpi-label">Divers</span>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <Card class="filters-card">
                <template #content>
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label>Période</label>
                            <Calendar v-model="dateRange" selectionMode="range" :showIcon="true" dateFormat="dd/mm/yy"
                                placeholder="Sélectionner une période" />
                        </div>
                        <div class="filter-group">
                            <label>Catégorie</label>
                            <Dropdown v-model="selectedCategoryFilter" :options="categories" optionLabel="label"
                                optionValue="value" placeholder="Toutes les catégories" showClear />
                        </div>
                        <div class="filter-group">
                            <label>Véhicule</label>
                            <Dropdown v-model="selectedVehicleFilter" :options="vehicles" optionLabel="immatriculation"
                                optionValue="id" placeholder="Tous les véhicules" showClear filter />
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Data Table -->
            <div class="table-container">
                <DataTable :value="filteredExpenses" :loading="loading" paginator :rows="10"
                    :rowsPerPageOptions="[10, 20, 50]" responsiveLayout="scroll" stripedRows>
                    <Column field="date" header="Date" sortable>
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.date) }}
                        </template>
                    </Column>
                    <Column field="category" header="Catégorie" sortable>
                        <template #body="slotProps">
                            <Tag :value="getCategoryLabel(slotProps.data.category)"
                                :severity="getSeverity(slotProps.data.category)" />
                        </template>
                    </Column>
                    <Column field="type" header="Type" sortable>
                        <template #body="slotProps">
                            {{ getTypeLabel(slotProps.data.type) }}
                        </template>
                    </Column>
                    <Column field="vehicleId" header="Véhicule" sortable>
                        <template #body="slotProps">
                            {{ getVehicleName(slotProps.data.vehicleId) }}
                        </template>
                    </Column>
                    <Column field="description" header="Description"></Column>
                    <Column field="amount" header="Montant" sortable>
                        <template #body="slotProps">
                            <span class="amount">{{ formatCurrency(slotProps.data.amount) }}</span>
                        </template>
                    </Column>
                    <Column header="Actions" :exportable="false" style="min-width:8rem">
                        <template #body="slotProps">
                            <Button icon="pi pi-pencil" outlined rounded class="mr-2"
                                @click="editExpense(slotProps.data)" />
                            <Button icon="pi pi-trash" outlined rounded severity="danger"
                                @click="confirmDeleteExpense(slotProps.data)" />
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Dialog -->
            <Dialog v-model:visible="expenseDialog" :style="{ width: '500px' }" header="Détails de la Dépense"
                :modal="true" class="p-fluid">
                <div class="field">
                    <label for="date">Date</label>
                    <Calendar id="date" v-model="expense.date" dateFormat="dd/mm/yy" :showIcon="true" required
                        :class="{ 'p-invalid': submitted && !expense.date }" />
                    <small class="p-error" v-if="submitted && !expense.date">La date est requise.</small>
                </div>

                <div class="field">
                    <label for="category">Catégorie</label>
                    <Dropdown id="category" v-model="expense.category" :options="categories" optionLabel="label"
                        optionValue="value" required :class="{ 'p-invalid': submitted && !expense.category }" />
                </div>

                <div class="field">
                    <label for="type">Type de Dépense</label>
                    <Dropdown id="type" v-model="expense.type" :options="expenseTypes" optionLabel="label"
                        optionValue="value" required :class="{ 'p-invalid': submitted && !expense.type }" />
                </div>

                <div class="field" v-if="expense.category === 'vehicule'">
                    <label for="vehicle">Véhicule Concerné</label>
                    <Dropdown id="vehicle" v-model="expense.vehicleId" :options="vehicles" optionLabel="immatriculation"
                        optionValue="id" placeholder="Sélectionner un véhicule" filter required
                        :class="{ 'p-invalid': submitted && !expense.vehicleId }" />
                    <small class="p-error" v-if="submitted && !expense.vehicleId">Le véhicule est requis.</small>
                </div>

                <div class="field">
                    <label for="amount">Montant TTC</label>
                    <InputNumber id="amount" v-model="expense.amount" mode="currency" :currency="config.currency"
                        locale="fr-TN" :minFractionDigits="config.decimals" required
                        :class="{ 'p-invalid': submitted && !expense.amount }" />
                    <small class="p-error" v-if="submitted && !expense.amount">Le montant est requis.</small>
                </div>

                <div class="field">
                    <label for="paymentMethod">Mode de Paiement</label>
                    <Dropdown id="paymentMethod" v-model="expense.paymentMethod" :options="paymentMethods"
                        optionLabel="label" optionValue="value" required />
                </div>

                <div class="field">
                    <label for="description">Description / Notes</label>
                    <Textarea id="description" v-model="expense.description" rows="3" cols="20" />
                </div>

                <template #footer>
                    <Button label="Annuler" icon="pi pi-times" text @click="expenseDialog = false" />
                    <Button label="Enregistrer" icon="pi pi-check" @click="saveExpense" />
                </template>
            </Dialog>

            <ConfirmDialog></ConfirmDialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.expenses-container {
    padding: 1.5rem;
    background-color: #f8fafc;
    min-height: 100vh;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.header-section h1 {
    margin: 0;
    font-size: 1.75rem;
    color: #1e293b;
    font-weight: 700;
}

/* KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.kpi-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid #e2e8f0;
}

.kpi-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.kpi-content {
    display: flex;
    flex-direction: column;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
}

.kpi-label {
    font-size: 0.875rem;
    color: #64748b;
}

/* KPI Colors */
.kpi-card.total .kpi-icon {
    background: #eff6ff;
    color: #3b82f6;
}

.kpi-card.fixed .kpi-icon {
    background: #fef2f2;
    color: #ef4444;
}

.kpi-card.vehicle .kpi-icon {
    background: #fff7ed;
    color: #f97316;
}

.kpi-card.misc .kpi-icon {
    background: #f0fdf4;
    color: #22c55e;
}

/* Filters */
.filters-card {
    margin-bottom: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-group label {
    font-weight: 600;
    color: #334155;
    font-size: 0.875rem;
}

/* Table */
.table-container {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.amount {
    font-weight: 600;
    color: #0f172a;
}

/* Dialog */
.field {
    margin-bottom: 1.5rem;
}

.field label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #334155;
}
</style>
