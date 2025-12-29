<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import Chart from 'primevue/chart'
import Card from 'primevue/card'
import Skeleton from 'primevue/skeleton'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useRouter } from 'vue-router'
import {
    getDashboardStats,
    getRevenueChartData,
    getVehicleStatusData,
    getBillingStatusData,
    getTopPerformers,
    type DashboardStats,
    type ChartData,
    type DashboardFilter,
    type TopPerformer
} from '../services/dashboardService'
import { getAllVehicles, type Vehicle } from '../services/vehicleService'
import { getAllClients, type Client } from '../services/clientService'
import { useAppConfig } from '../composables/useAppConfig'

const { config, loadConfig, formatCurrency } = useAppConfig()
const router = useRouter()
const loading = ref(true)

// Filters
const dateRange = ref<Date[]>([])
const selectedVehicle = ref<string | undefined>()
const selectedClient = ref<string | undefined>()

const vehicles = ref<Vehicle[]>([])
const clients = ref<Client[]>([])

// Data
const stats = ref<DashboardStats>({
    totalRevenue: 0,
    pendingRevenue: 0,
    unpaidAmount: 0,
    cashIn: 0,
    activeRentals: 0,
    occupancyRate: 0,
    avgDailyRate: 0,
    avgRentalDuration: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0
})

const revenueChartData = ref<ChartData | null>(null)
const vehicleStatusChartData = ref<ChartData | null>(null)
const billingStatusChartData = ref<ChartData | null>(null)
const topVehicles = ref<TopPerformer[]>([])
const topClients = ref<TopPerformer[]>([])

// Chart Options
const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom'
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: '#e2e8f0'
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    }
}

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right'
        }
    }
}

const loadData = async () => {
    loading.value = true
    try {
        const filter: DashboardFilter = {
            startDate: dateRange.value?.[0],
            endDate: dateRange.value?.[1],
            vehicleId: selectedVehicle.value,
            clientId: selectedClient.value
        }

        const [statsData, revenueData, statusData, billingData, topData] = await Promise.all([
            getDashboardStats(filter),
            getRevenueChartData(filter),
            getVehicleStatusData(),
            getBillingStatusData(filter),
            getTopPerformers(filter)
        ])

        stats.value = statsData
        revenueChartData.value = revenueData
        vehicleStatusChartData.value = statusData
        billingStatusChartData.value = billingData
        topVehicles.value = topData.vehicles
        topClients.value = topData.clients
    } catch (error) {
        console.error('Error loading dashboard data:', error)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    // Initialize filters with current month
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    dateRange.value = [firstDay, today]

    // Load filter options
    const [v, c] = await Promise.all([getAllVehicles(), getAllClients(), loadConfig()])
    vehicles.value = v
    clients.value = c

    await loadData()
})

watch([dateRange, selectedVehicle, selectedClient], () => {
    loadData()
})



const getClientName = (client: Client) => {
    return (client.typeClient === 'morale' ? client.raisonSociale : `${client.nom} ${client.prenom}`) || 'Client Inconnu'
}

const getVehicleName = (vehicle: Vehicle) => {
    return `${vehicle.immatriculation}` // Ideally join with model name
}
</script>

<template>
    <MainLayout>
        <div class="dashboard-container">
            <!-- Filter Bar -->
            <div class="filter-bar">
                <div class="filter-group">
                    <span class="p-input-icon-left">
                        <i class="pi pi-calendar" />
                        <Calendar v-model="dateRange" selectionMode="range" placeholder="Période" :showIcon="true"
                            dateFormat="dd/mm/yy" class="w-full" />
                    </span>
                </div>
                <div class="filter-group">
                    <Dropdown v-model="selectedVehicle" :options="vehicles" optionLabel="immatriculation"
                        optionValue="id" placeholder="Tous les véhicules" showClear filter class="w-full" />
                </div>
                <div class="filter-group">
                    <Dropdown v-model="selectedClient" :options="clients" :optionLabel="getClientName" optionValue="id"
                        placeholder="Tous les clients" showClear filter class="w-full" />
                </div>
                <Button icon="pi pi-refresh" @click="loadData" text rounded severity="secondary" />
            </div>

            <!-- KPI Cards Row 1: Financials -->
            <div class="kpi-grid">
                <div class="kpi-card revenue">
                    <div class="kpi-header">
                        <span class="kpi-title">Chiffre d'Affaires</span>
                        <i class="pi pi-wallet kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="100px" height="2rem" />
                        <span v-else class="kpi-value">{{ formatCurrency(stats.totalRevenue) }}</span>
                        <span class="kpi-subtitle">Facturé & Validé</span>
                    </div>
                </div>

                <div class="kpi-card pending">
                    <div class="kpi-header">
                        <span class="kpi-title">En Attente</span>
                        <i class="pi pi-hourglass kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="100px" height="2rem" />
                        <span v-else class="kpi-value">{{ formatCurrency(stats.pendingRevenue) }}</span>
                        <span class="kpi-subtitle">Locations terminées non facturées</span>
                    </div>
                </div>

                <div class="kpi-card cash">
                    <div class="kpi-header">
                        <span class="kpi-title">Encaissements</span>
                        <i class="pi pi-money-bill kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="100px" height="2rem" />
                        <span v-else class="kpi-value">{{ formatCurrency(stats.cashIn) }}</span>
                        <span class="kpi-subtitle">Montant réellement perçu</span>
                    </div>
                </div>

                <div class="kpi-card unpaid">
                    <div class="kpi-header">
                        <span class="kpi-title">Impayés</span>
                        <i class="pi pi-exclamation-circle kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="100px" height="2rem" />
                        <span v-else class="kpi-value">{{ formatCurrency(stats.unpaidAmount) }}</span>
                        <span class="kpi-subtitle">Reste à payer sur factures</span>
                    </div>
                </div>
            </div>

            <!-- KPI Cards Row 2: Operations -->
            <div class="kpi-grid mt-4">
                <div class="kpi-card info">
                    <div class="kpi-header">
                        <span class="kpi-title">Locations Actives</span>
                        <i class="pi pi-key kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="50px" height="2rem" />
                        <span v-else class="kpi-value">{{ stats.activeRentals }}</span>
                        <span class="kpi-subtitle">Véhicules sur la route</span>
                    </div>
                </div>

                <div class="kpi-card info">
                    <div class="kpi-header">
                        <span class="kpi-title">Taux d'Occupation</span>
                        <i class="pi pi-chart-pie kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="60px" height="2rem" />
                        <span v-else class="kpi-value">{{ stats.occupancyRate }}%</span>
                        <div class="progress-bar">
                            <div class="progress-fill" :style="{ width: stats.occupancyRate + '%' }"></div>
                        </div>
                    </div>
                </div>

                <div class="kpi-card info">
                    <div class="kpi-header">
                        <span class="kpi-title">Prix Moyen / Jour</span>
                        <i class="pi pi-tags kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="80px" height="2rem" />
                        <span v-else class="kpi-value">{{ formatCurrency(stats.avgDailyRate) }}</span>
                        <span class="kpi-subtitle">Moyenne sur la période</span>
                    </div>
                </div>

                <div class="kpi-card info">
                    <div class="kpi-header">
                        <span class="kpi-title">Durée Moyenne</span>
                        <i class="pi pi-calendar-clock kpi-icon"></i>
                    </div>
                    <div class="kpi-body">
                        <Skeleton v-if="loading" width="50px" height="2rem" />
                        <span v-else class="kpi-value">{{ stats.avgRentalDuration }} Jours</span>
                        <span class="kpi-subtitle">Par contrat de location</span>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="charts-grid mt-6">
                <!-- Main Revenue Chart -->
                <div class="chart-card main-chart">
                    <div class="chart-header">
                        <h3>Évolution du Chiffre d'Affaires</h3>
                    </div>
                    <div class="chart-container">
                        <Skeleton v-if="loading" height="100%" width="100%" />
                        <Chart v-else-if="revenueChartData" type="line" :data="revenueChartData"
                            :options="revenueChartOptions" class="h-full" />
                    </div>
                </div>

                <!-- Right Side Charts -->
                <div class="right-charts">
                    <div class="chart-card small-chart">
                        <div class="chart-header">
                            <h3>État du Parc</h3>
                        </div>
                        <div class="chart-container doughnut">
                            <Skeleton v-if="loading" height="100%" width="100%" shape="circle" />
                            <Chart v-else-if="vehicleStatusChartData" type="doughnut" :data="vehicleStatusChartData"
                                :options="doughnutOptions" class="h-full" />
                        </div>
                    </div>

                    <div class="chart-card small-chart mt-4">
                        <div class="chart-header">
                            <h3>État Facturation</h3>
                        </div>
                        <div class="chart-container doughnut">
                            <Skeleton v-if="loading" height="100%" width="100%" shape="circle" />
                            <Chart v-else-if="billingStatusChartData" type="doughnut" :data="billingStatusChartData"
                                :options="doughnutOptions" class="h-full" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Performers -->
            <div class="performers-grid mt-6">
                <div class="performer-card">
                    <div class="card-header">
                        <h3>Top 5 Véhicules (Revenus)</h3>
                    </div>
                    <DataTable :value="topVehicles" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="Véhicule"></Column>
                        <Column field="count" header="Loc."></Column>
                        <Column field="revenue" header="CA">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.revenue) }}
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div class="performer-card">
                    <div class="card-header">
                        <h3>Top 5 Clients (Revenus)</h3>
                    </div>
                    <DataTable :value="topClients" :loading="loading" responsiveLayout="scroll">
                        <Column field="name" header="Client"></Column>
                        <Column field="count" header="Loc."></Column>
                        <Column field="revenue" header="CA">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.revenue) }}
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>
    </MainLayout>
</template>

<style scoped>
.dashboard-container {
    padding: 1.5rem;
    width: 100%;
    background-color: #f8fafc;
    min-height: 100vh;
}

/* Filter Bar */
.filter-bar {
    display: flex;
    gap: 1rem;
    background: white;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    align-items: center;
    flex-wrap: wrap;
}

.filter-group {
    flex: 1;
    min-width: 200px;
}

/* KPI Grid */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
}

.kpi-card {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    transition: transform 0.2s;
}

.kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.kpi-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.kpi-title {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 600;
}

.kpi-icon {
    padding: 0.5rem;
    border-radius: 8px;
    font-size: 1.25rem;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    display: block;
    margin-bottom: 0.25rem;
}

.kpi-subtitle {
    font-size: 0.75rem;
    color: #94a3b8;
}

/* KPI Colors */
.kpi-card.revenue .kpi-icon {
    background: #eff6ff;
    color: #3b82f6;
}

.kpi-card.revenue .kpi-value {
    color: #3b82f6;
}

.kpi-card.pending .kpi-icon {
    background: #fff7ed;
    color: #f97316;
}

.kpi-card.pending .kpi-value {
    color: #f97316;
}

.kpi-card.cash .kpi-icon {
    background: #f0fdf4;
    color: #22c55e;
}

.kpi-card.cash .kpi-value {
    color: #22c55e;
}

.kpi-card.unpaid .kpi-icon {
    background: #fef2f2;
    color: #ef4444;
}

.kpi-card.unpaid .kpi-value {
    color: #ef4444;
}

.kpi-card.info .kpi-icon {
    background: #f8fafc;
    color: #64748b;
}

.progress-bar {
    height: 6px;
    background: #f1f5f9;
    border-radius: 3px;
    margin-top: 0.5rem;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 3px;
}

/* Charts Grid */
.charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
}

.chart-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.chart-header h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
}

.chart-container {
    height: 300px;
    position: relative;
}

.chart-container.doughnut {
    height: 200px;
}

/* Performers Grid */
.performers-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.performer-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.card-header h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
}

@media (max-width: 1024px) {

    .charts-grid,
    .performers-grid {
        grid-template-columns: 1fr;
    }
}
</style>
