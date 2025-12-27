<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
    getAllLocations, getLocationStatus,
    type Location, type LocationStatus
} from '../services/locationService'
import { getAllClients, type Client } from '../services/clientService'
import { getAllVehicles, type Vehicle } from '../services/vehicleService'
import { getAllModels, type Model } from '../services/modelService'
import { getAllBrands, type Brand } from '../services/brandService'
import MainLayout from '../layouts/MainLayout.vue'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Button from 'primevue/button'

const toast = useToast()

const locations = ref<Location[]>([])
const clients = ref<Client[]>([])
const vehicles = ref<Vehicle[]>([])
const models = ref<Model[]>([])
const brands = ref<Brand[]>([])
const loading = ref(false)

// Filtres
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth())
const viewMode = ref<'month' | 'week'>('month')
const selectedStatuses = ref<LocationStatus[]>(['planifiee', 'en_cours', 'terminee'])
const selectedVehicle = ref<string | null>(null) // null = tous les véhicules

const years = computed(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
})

const months = [
    { label: 'Janvier', value: 0 },
    { label: 'Février', value: 1 },
    { label: 'Mars', value: 2 },
    { label: 'Avril', value: 3 },
    { label: 'Mai', value: 4 },
    { label: 'Juin', value: 5 },
    { label: 'Juillet', value: 6 },
    { label: 'Août', value: 7 },
    { label: 'Septembre', value: 8 },
    { label: 'Octobre', value: 9 },
    { label: 'Novembre', value: 10 },
    { label: 'Décembre', value: 11 }
]

const statusOptions = [
    { label: 'Planifiée', value: 'planifiee' as LocationStatus },
    { label: 'En cours', value: 'en_cours' as LocationStatus },
    { label: 'Terminée', value: 'terminee' as LocationStatus }
]

onMounted(async () => {
    await Promise.all([
        loadLocations(),
        loadClients(),
        loadVehicles(),
        loadModels(),
        loadBrands()
    ])
})

const loadLocations = async () => {
    loading.value = true
    try {
        locations.value = await getAllLocations()
    } catch (error) {
        console.error('Error loading locations:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les locations', life: 3000 })
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

const loadVehicles = async () => {
    try {
        vehicles.value = await getAllVehicles()
    } catch (error) {
        console.error('Error loading vehicles:', error)
    }
}

const loadModels = async () => {
    try {
        models.value = await getAllModels()
    } catch (error) {
        console.error('Error loading models:', error)
    }
}

const loadBrands = async () => {
    try {
        brands.value = await getAllBrands()
    } catch (error) {
        console.error('Error loading brands:', error)
    }
}

// Filtrer les locations selon les critères
const filteredLocations = computed(() => {
    return locations.value.filter(location => {
        const status = getLocationStatus(location.dateDebut, location.dateFin)

        // Filtre par statut
        if (!selectedStatuses.value.includes(status)) {
            return false
        }

        // Filtre par véhicule
        if (selectedVehicle.value && location.vehicleId !== selectedVehicle.value) {
            return false
        }

        // Filtre par période (mois/année)
        const debut = new Date(location.dateDebut)
        const fin = new Date(location.dateFin)

        if (viewMode.value === 'month') {
            // Vérifier si la location touche le mois sélectionné
            const monthStart = new Date(selectedYear.value, selectedMonth.value, 1)
            const monthEnd = new Date(selectedYear.value, selectedMonth.value + 1, 0, 23, 59, 59)

            return (debut <= monthEnd && fin >= monthStart)
        } else {
            // Vue semaine : afficher tout le mois pour l'instant
            const monthStart = new Date(selectedYear.value, selectedMonth.value, 1)
            const monthEnd = new Date(selectedYear.value, selectedMonth.value + 1, 0)

            return (debut <= monthEnd && fin >= monthStart)
        }
    })
})

// Générer les jours du mois pour la vue calendrier
const calendarDays = computed(() => {
    const firstDay = new Date(selectedYear.value, selectedMonth.value, 1)
    const lastDay = new Date(selectedYear.value, selectedMonth.value + 1, 0)
    const days: Date[] = []

    // Ajouter les jours du mois précédent pour compléter la première semaine
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(firstDay)
        date.setDate(date.getDate() - (i + 1))
        days.push(date)
    }

    // Ajouter tous les jours du mois
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(selectedYear.value, selectedMonth.value, i))
    }

    // Ajouter les jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - days.length // 6 semaines max
    for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(lastDay)
        date.setDate(date.getDate() + i)
        days.push(date)
    }

    return days
})

// Obtenir les locations pour un jour donné
const getLocationsForDay = (day: Date) => {
    return filteredLocations.value.filter(location => {
        const debut = new Date(location.dateDebut)
        const fin = new Date(location.dateFin)
        debut.setHours(0, 0, 0, 0)
        fin.setHours(23, 59, 59, 999)

        const checkDay = new Date(day)
        checkDay.setHours(12, 0, 0, 0)

        return checkDay >= debut && checkDay <= fin
    })
}

const getClientName = (clientId: string): string => {
    const client = clients.value.find(c => c.id === clientId)
    if (!client) return 'N/A'
    return client.typeClient === 'morale'
        ? client.raisonSociale || client.nom
        : `${client.nom} ${client.prenom}`
}

const getVehicleInfo = (vehicleId: string): string => {
    const vehicle = vehicles.value.find(v => v.id === vehicleId)
    if (!vehicle) return 'N/A'
    const model = models.value.find(m => m.id === vehicle.modelId)
    if (!model) return vehicle.immatriculation || 'N/A'
    const brand = brands.value.find(b => b.id === model.brandId)
    return `${brand?.nom || ''} ${model.nom || ''} - ${vehicle.immatriculation}`
}

const getStatusSeverity = (status: LocationStatus): 'info' | 'success' | 'secondary' => {
    const severities = {
        'planifiee': 'info' as const,
        'en_cours': 'success' as const,
        'terminee': 'secondary' as const
    }
    return severities[status]
}

// Options pour le dropdown véhicules
const vehicleOptions = computed(() => {
    return vehicles.value.map(vehicle => {
        const model = models.value.find(m => m.id === vehicle.modelId)
        const brand = brands.value.find(b => b.id === model?.brandId)
        return {
            label: `${brand?.nom || ''} ${model?.nom || ''} - ${vehicle.immatriculation}`,
            value: vehicle.id
        }
    })
})

const isCurrentMonth = (day: Date): boolean => {
    return day.getMonth() === selectedMonth.value
}

const isToday = (day: Date): boolean => {
    const today = new Date()
    return day.toDateString() === today.toDateString()
}

const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR')
}

const previousMonth = () => {
    if (selectedMonth.value === 0) {
        selectedMonth.value = 11
        selectedYear.value--
    } else {
        selectedMonth.value--
    }
}

const nextMonth = () => {
    if (selectedMonth.value === 11) {
        selectedMonth.value = 0
        selectedYear.value++
    } else {
        selectedMonth.value++
    }
}

const goToToday = () => {
    const today = new Date()
    selectedYear.value = today.getFullYear()
    selectedMonth.value = today.getMonth()
}
</script>

<template>
    <MainLayout>
        <div class="calendar-container">
            <div class="calendar-header page-header">
                <h1>Calendrier des Réservations</h1>
            </div>

            <!-- Filtres -->
            <Card class="filters-card">
                <template #content>
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label>Année</label>
                            <Dropdown v-model="selectedYear" :options="years" placeholder="Année" />
                        </div>

                        <div class="filter-group">
                            <label>Mois</label>
                            <Dropdown v-model="selectedMonth" :options="months" optionLabel="label" optionValue="value"
                                placeholder="Mois" />
                        </div>

                        <div class="filter-group">
                            <label>Véhicule</label>
                            <Dropdown v-model="selectedVehicle" :options="vehicleOptions" optionLabel="label"
                                optionValue="value" placeholder="Tous les véhicules" showClear filter />
                        </div>

                        <div class="filter-group">
                            <label>Statuts</label>
                            <MultiSelect v-model="selectedStatuses" :options="statusOptions" optionLabel="label"
                                optionValue="value" placeholder="Tous les statuts" display="chip" />
                        </div>

                        <div class="filter-actions">
                            <Button label="Aujourd'hui" icon="pi pi-calendar" @click="goToToday" outlined />
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Statistiques et Navigation Mois -->
            <div class="stats-month-container">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon total">
                            <i class="pi pi-calendar"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">{{ filteredLocations.length }}</span>
                            <span class="stat-label">Total locations</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon planifiee">
                            <i class="pi pi-clock"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">{{filteredLocations.filter(l => getLocationStatus(l.dateDebut,
                                l.dateFin) ===
                                'planifiee').length }}</span>
                            <span class="stat-label">Planifiées</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon en-cours">
                            <i class="pi pi-car"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">{{filteredLocations.filter(l => getLocationStatus(l.dateDebut,
                                l.dateFin) ===
                                'en_cours').length }}</span>
                            <span class="stat-label">En cours</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon terminee">
                            <i class="pi pi-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value">{{filteredLocations.filter(l => getLocationStatus(l.dateDebut,
                                l.dateFin) ===
                                'terminee').length }}</span>
                            <span class="stat-label">Terminées</span>
                        </div>
                    </div>
                </div>

                <div class="month-navigation">
                    <Button icon="pi pi-chevron-left" @click="previousMonth" text rounded />
                    <h2>{{ months[selectedMonth].label }} {{ selectedYear }}</h2>
                    <Button icon="pi pi-chevron-right" @click="nextMonth" text rounded />
                </div>
            </div>

            <!-- Calendrier -->
            <div class="calendar-grid">
                <!-- Jours de la semaine -->
                <div class="calendar-weekdays">
                    <div class="weekday">Lun</div>
                    <div class="weekday">Mar</div>
                    <div class="weekday">Mer</div>
                    <div class="weekday">Jeu</div>
                    <div class="weekday">Ven</div>
                    <div class="weekday">Sam</div>
                    <div class="weekday">Dim</div>
                </div>

                <!-- Jours du mois -->
                <div class="calendar-days">
                    <div v-for="(day, index) in calendarDays" :key="index" :class="['calendar-day', {
                        'other-month': !isCurrentMonth(day),
                        'today': isToday(day)
                    }]">
                        <div class="day-header">
                            <span class="day-number">{{ day.getDate() }}</span>
                        </div>

                        <div class="day-locations">
                            <div v-for="location in getLocationsForDay(day)" :key="location.id" class="location-item"
                                :class="'status-' + getLocationStatus(location.dateDebut, location.dateFin)">
                                <div class="location-info">
                                    <strong>{{ getVehicleInfo(location.vehicleId) }}</strong>
                                    <small>{{ getClientName(location.clientId) }}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>

<style scoped>
.calendar-container {
    background: #f8fafc;
    padding: 1rem;
    min-height: calc(100vh - 80px);
}

.calendar-header {
    margin-bottom: 1rem;
}

.calendar-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
}

.filters-card {
    margin-bottom: 1rem;
}

.filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
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

.filter-actions {
    display: flex;
    align-items: flex-end;
}

.stats-month-container {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
}

.month-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    background: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    min-width: 250px;
}

.month-navigation h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
    min-width: 180px;
    text-align: center;
}

.calendar-grid {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 2rem;
}

.calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.weekday {
    text-align: center;
    font-weight: 600;
    color: #64748b;
    padding: 0.75rem;
    font-size: 0.875rem;
}

.calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
}

.calendar-day {
    min-height: 120px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem;
    background: white;
    transition: all 0.2s;
}

.calendar-day:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.calendar-day.other-month {
    background: #f8fafc;
    opacity: 0.5;
}

.calendar-day.today {
    border-color: #3b82f6;
    border-width: 2px;
    background: #eff6ff;
}

.day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.day-number {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
}

.today .day-number {
    color: #3b82f6;
    font-size: 1rem;
}

.day-locations {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.location-item {
    padding: 0.4rem;
    border-radius: 4px;
    font-size: 0.75rem;
    border-left: 3px solid;
    background: #f8fafc;
}

.location-item.status-planifiee {
    border-color: #3b82f6;
    background: #eff6ff;
}

.location-item.status-en_cours {
    border-color: #22c55e;
    background: #f0fdf4;
}

.location-item.status-terminee {
    border-color: #64748b;
    background: #f8fafc;
}

.location-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.location-info strong {
    color: #1e293b;
    font-weight: 600;
    line-height: 1.2;
}

.location-info small {
    color: #64748b;
    font-size: 0.7rem;
}

.stats-section {
    margin-bottom: 2rem;
}

.stats-grid {
    display: flex;
    gap: 1rem;
    flex: 1;
}

.stat-card {
    background: white;
    padding: 0.75rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: transform 0.2s, box-shadow 0.2s;
    flex: 1;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
    width: 45px;
    height: 45px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
}

.stat-icon.total {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.planifiee {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.stat-icon.en-cours {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.stat-icon.terminee {
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
}

.stat-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1;
}

.stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
}

.stat-value.status-planifiee {
    color: #3b82f6;
}

.stat-value.status-en-cours {
    color: #22c55e;
}

.stat-value.status-terminee {
    color: #64748b;
}
</style>
