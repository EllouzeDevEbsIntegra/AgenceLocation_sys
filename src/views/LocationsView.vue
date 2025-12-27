<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
    getAllLocations, addLocation, updateLocation, deleteLocation,
    calculateDays, calculateTotals, getLocationStatus,
    type Location, type Anomaly, type CautionType, type LocationStatus, type BillingStatus
} from '../services/locationService'
import { getAllClients, type Client } from '../services/clientService'
import { getAllVehicles, type Vehicle } from '../services/vehicleService'
import { getAllModels, type Model } from '../services/modelService'
import { getAllBrands, type Brand } from '../services/brandService'
import {
    generateInvoiceNumber, createInvoice, calculateInvoiceTotals,
    type InvoiceHeader, type InvoiceLine
} from '../services/invoiceService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const locations = ref<Location[]>([])
const clients = ref<Client[]>([])
const vehicles = ref<Vehicle[]>([])
const models = ref<Model[]>([])
const brands = ref<Brand[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)

// Invoice
const invoiceDialogVisible = ref(false)
const invoicePreview = ref<{ header: Omit<InvoiceHeader, 'id'>, lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[] } | null>(null)
const selectedLocationForInvoice = ref<Location | null>(null)

const emptyAnomaly: Anomaly = {
    type: '',
    description: '',
    emplacement: ''
}

const currentLocation = ref<Location>({
    clientId: '',
    vehicleId: '',
    dateDebut: new Date(),
    dateFin: new Date(),
    kmDebut: 0,
    kmFin: 0,
    niveauCarburantDebut: 100,
    niveauCarburantFin: 100,
    anomaliesDebut: [],
    anomaliesFin: [],
    typeCaution: 'especes',
    montantCaution: 0,
    prixUnitaireHT: 0,
    nombreJours: 1,
    totalHT: 0,
    totalTTC: 0,
    notes: '',
    statutFacturation: 'Ouvert'
})

const cautionTypes = [
    { label: 'Espèces', value: 'especes' },
    { label: 'Chèque', value: 'cheque' },
    { label: 'Carte Bancaire', value: 'carte_bancaire' },
    { label: 'Virement', value: 'virement' }
]

// Types d'anomalies prédéfinis
const anomalyTypes = [
    'Choc', 'Rayure', 'Fissure', 'Bosselure', 'Éclat peinture',
    'Pare-choc endommagé', 'Rétroviseur cassé', 'Vitre fissurée',
    'Pneu usé', 'Autre'
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

// Calculer les dates désactivées pour le véhicule sélectionné
const disabledDates = computed(() => {
    if (!currentLocation.value.vehicleId) {
        return []
    }

    const disabledDatesList: Date[] = []

    // Filtrer les locations du même véhicule (exclure la location en cours d'édition)
    const vehicleLocations = locations.value.filter(loc =>
        loc.vehicleId === currentLocation.value.vehicleId &&
        loc.id !== currentLocation.value.id
    )

    // Pour chaque location, ajouter toutes les dates entre début et fin
    vehicleLocations.forEach(location => {
        const debut = new Date(location.dateDebut)
        const fin = new Date(location.dateFin)

        // Ajouter chaque jour entre début et fin
        const currentDate = new Date(debut)
        while (currentDate <= fin) {
            disabledDatesList.push(new Date(currentDate))
            currentDate.setDate(currentDate.getDate() + 1)
        }
    })

    return disabledDatesList
})

// Watcher pour recalculer automatiquement
watch([
    () => currentLocation.value.dateDebut,
    () => currentLocation.value.dateFin,
    () => currentLocation.value.prixUnitaireHT
], () => {
    if (currentLocation.value.dateDebut && currentLocation.value.dateFin) {
        currentLocation.value.nombreJours = calculateDays(
            currentLocation.value.dateDebut,
            currentLocation.value.dateFin
        )
        const totals = calculateTotals(
            currentLocation.value.prixUnitaireHT,
            currentLocation.value.nombreJours
        )
        currentLocation.value.totalHT = totals.totalHT
        currentLocation.value.totalTTC = totals.totalTTC
    }
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
    const brand = brands.value.find(b => b.id === model?.brandId)
    return `${brand?.nom || ''} ${model?.nom || ''} - ${vehicle.immatriculation}`
}

const openAddDialog = () => {
    isEditMode.value = false
    currentLocation.value = {
        clientId: '',
        vehicleId: '',
        dateDebut: new Date(),
        dateFin: new Date(),
        kmDebut: 0,
        kmFin: 0,
        niveauCarburantDebut: 100,
        niveauCarburantFin: 100,
        anomaliesDebut: [],
        anomaliesFin: [],
        typeCaution: 'especes',
        montantCaution: 0,
        prixUnitaireHT: 0,
        nombreJours: 1,
        totalHT: 0,
        totalTTC: 0,
        notes: '',
        statutFacturation: 'Ouvert'
    }
    dialogVisible.value = true
}

const openEditDialog = (location: Location) => {
    isEditMode.value = true
    currentLocation.value = {
        ...location,
        dateDebut: new Date(location.dateDebut),
        dateFin: new Date(location.dateFin)
    }
    dialogVisible.value = true
}

const addAnomalyDebut = () => {
    currentLocation.value.anomaliesDebut.push({ ...emptyAnomaly })
}

const removeAnomalyDebut = (index: number) => {
    currentLocation.value.anomaliesDebut.splice(index, 1)
}

const addAnomalyFin = () => {
    currentLocation.value.anomaliesFin.push({ ...emptyAnomaly })
}

const removeAnomalyFin = (index: number) => {
    currentLocation.value.anomaliesFin.splice(index, 1)
}

const saveLocation = async () => {
    // Validation
    if (!currentLocation.value.clientId) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le client est requis', life: 3000 })
        return
    }
    if (!currentLocation.value.vehicleId) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le véhicule est requis', life: 3000 })
        return
    }

    // Vérifier les conflits de dates
    const hasConflict = locations.value.some(loc => {
        // Ignorer la location en cours d'édition
        if (loc.id === currentLocation.value.id) return false

        // Vérifier seulement pour le même véhicule
        if (loc.vehicleId !== currentLocation.value.vehicleId) return false

        const existingDebut = new Date(loc.dateDebut)
        const existingFin = new Date(loc.dateFin)
        const newDebut = new Date(currentLocation.value.dateDebut)
        const newFin = new Date(currentLocation.value.dateFin)

        // Vérifier le chevauchement
        return (newDebut <= existingFin && newFin >= existingDebut)
    })

    if (hasConflict) {
        toast.add({
            severity: 'error',
            summary: 'Conflit de dates',
            detail: 'Ce véhicule est déjà réservé pour cette période',
            life: 5000
        })
        return
    }

    loading.value = true
    try {
        const locationData = { ...currentLocation.value }

        if (isEditMode.value && currentLocation.value.id) {
            await updateLocation(currentLocation.value.id, locationData)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Location modifiée', life: 3000 })
        } else {
            await addLocation(locationData)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Location ajoutée', life: 3000 })
        }
        dialogVisible.value = false
        await loadLocations()
    } catch (error) {
        console.error('Error saving location:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder la location', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = (location: Location) => {
    confirm.require({
        message: `Voulez-vous vraiment supprimer cette location ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleDelete(location)
    })
}

const handleDelete = async (location: Location) => {
    if (!location.id) return

    loading.value = true
    try {
        await deleteLocation(location.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Location supprimée', life: 3000 })
        await loadLocations()
    } catch (error) {
        console.error('Error deleting location:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la location', life: 3000 })
    } finally {
        loading.value = false
    }
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR')
}

const formatCurrency = (value: number): string => {
    return value.toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })
}

const getStatusLabel = (status: LocationStatus): string => {
    const labels = {
        'planifiee': 'Planifiée',
        'en_cours': 'En cours',
        'terminee': 'Terminée'
    }
    return labels[status]
}


const getStatusSeverity = (status: LocationStatus): 'info' | 'success' | 'secondary' => {
    const severities = {
        'planifiee': 'info' as const,
        'en_cours': 'success' as const,
        'terminee': 'secondary' as const
    }
    return severities[status]
}

// Génération de facture
const generateInvoice = async (location: Location) => {
    loading.value = true
    try {
        const client = clients.value.find(c => c.id === location.clientId)
        if (!client) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: 'Client introuvable', life: 3000 })
            return
        }

        const vehicle = vehicles.value.find(v => v.id === location.vehicleId)
        const model = vehicle ? models.value.find(m => m.id === vehicle.modelId) : null
        const brand = model ? brands.value.find(b => b.id === model.brandId) : null

        const invoiceNumber = await generateInvoiceNumber()
        const period = `${formatDate(location.dateDebut)} - ${formatDate(location.dateFin)}`
        const clientTaxId = client.typeClient === 'morale' ? (client.matriculeFiscale || 'N/A') : (client.numeroCIN || 'N/A')
        const clientName = client.typeClient === 'morale' ? (client.raisonSociale || client.nom) : `${client.nom} ${client.prenom}`

        const invoiceLine: Omit<InvoiceLine, 'id' | 'invoiceId'> = {
            locationId: location.id || '',
            description: 'Location véhicule',
            period,
            vehicleRegistration: vehicle?.immatriculation || 'N/A',
            vehicleBrandModel: `${brand?.nom || ''} ${model?.nom || ''}`.trim(),
            quantity: location.nombreJours,
            unitPrice: location.prixUnitaireHT,
            discountPercent: 0,
            discountAmount: 0,
            totalHT: location.totalHT
        }

        const totals = calculateInvoiceTotals([invoiceLine as unknown as InvoiceLine])
        const invoiceHeader: Omit<InvoiceHeader, 'id'> = {
            invoiceNumber,
            invoiceDate: new Date(),
            locationIds: [location.id || ''],
            clientId: location.clientId,
            clientName,
            clientTaxId,
            ...totals,
            status: 'draft',
            paymentStatus: 'non_regle',
            paidAmount: 0,
            remainingAmount: totals.totalTTC,
            createdAt: new Date()
        }

        confirm.require({
            message: `Générer la facture N° ${invoiceNumber} pour ${clientName} ?`,
            header: 'Confirmation de facturation',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Oui, générer',
            rejectLabel: 'Annuler',
            accept: async () => {
                loading.value = true
                try {
                    const header = { ...invoiceHeader, status: 'validated' as const }
                    await createInvoice(header, [invoiceLine])
                    toast.add({
                        severity: 'success',
                        summary: 'Facture générée',
                        detail: `Facture N° ${invoiceNumber} créée avec succès`,
                        life: 5000
                    })
                } catch (error) {
                    console.error('Error creating invoice:', error)
                    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer la facture', life: 3000 })
                } finally {
                    loading.value = false
                }
            }
        })
    } catch (error) {
        console.error('Error generating invoice:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de préparer la facture', life: 3000 })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <MainLayout>
        <div class="locations-container">
            <div class="locations-header page-header">
                <h1>Gestion des Locations</h1>
                <Button label="Nouvelle location" icon="pi pi-plus" @click="openAddDialog" />
            </div>

            <div class="locations-content">
                <DataTable :value="locations" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 80rem">
                    <Column field="clientId" header="Client" sortable style="min-width: 12rem">
                        <template #body="slotProps">
                            {{ getClientName(slotProps.data.clientId) }}
                        </template>
                    </Column>
                    <Column field="vehicleId" header="Véhicule" sortable style="min-width: 15rem">
                        <template #body="slotProps">
                            {{ getVehicleInfo(slotProps.data.vehicleId) }}
                        </template>
                    </Column>
                    <Column field="dateDebut" header="Début" sortable>
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.dateDebut) }}
                        </template>
                    </Column>
                    <Column field="dateFin" header="Fin" sortable>
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.dateFin) }}
                        </template>
                    </Column>
                    <Column field="nombreJours" header="Jours" sortable></Column>
                    <Column field="totalTTC" header="Total TTC" sortable>
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.totalTTC) }}
                        </template>
                    </Column>
                    <Column header="Statut" sortable style="min-width: 9rem">
                        <template #body="slotProps">
                            <Tag :value="getStatusLabel(getLocationStatus(slotProps.data.dateDebut, slotProps.data.dateFin))"
                                :severity="getStatusSeverity(getLocationStatus(slotProps.data.dateDebut, slotProps.data.dateFin))" />
                        </template>
                    </Column>
                    <Column field="statutFacturation" header="Facturation" sortable style="min-width: 9rem">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.statutFacturation || 'Ouvert'"
                                :severity="slotProps.data.statutFacturation === 'Facturé' ? 'success' : 'warning'" />
                        </template>
                    </Column>
                    <Column header="Anomalies" style="min-width: 10rem">
                        <template #body="slotProps">
                            <Tag :value="`Début: ${slotProps.data.anomaliesDebut.length}`" severity="info"
                                class="mr-2" />
                            <Tag :value="`Fin: ${slotProps.data.anomaliesFin.length}`" severity="warning" />
                        </template>
                    </Column>
                    <Column header="Actions" style="width: 15rem">
                        <template #body="slotProps">
                            <div class="action-buttons">
                                <Button icon="pi pi-file-invoice" severity="success" text rounded
                                    @click="generateInvoice(slotProps.data)" title="Facturer" />
                                <Button icon="pi pi-pencil" severity="info" text rounded
                                    @click="openEditDialog(slotProps.data)" title="Modifier" />
                                <Button icon="pi pi-trash" severity="danger" text rounded
                                    @click="confirmDelete(slotProps.data)" title="Supprimer" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Dialog Add/Edit -->
            <Dialog v-model:visible="dialogVisible" :header="isEditMode ? 'Modifier la location' : 'Nouvelle location'"
                :modal="true" :style="{ width: '1000px', maxHeight: '95vh' }" :contentStyle="{ overflow: 'auto' }">
                <div class="dialog-content">
                    <!-- Client et Véhicule -->
                    <h3 class="section-title">Informations Générales</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="client">Client *</label>
                            <Dropdown id="client" v-model="currentLocation.clientId" :options="clients"
                                :optionLabel="(client) => client.typeClient === 'morale' ? client.raisonSociale : `${client.nom} ${client.prenom}`"
                                optionValue="id" placeholder="Sélectionnez un client" class="w-full" filter />
                        </div>
                        <div class="form-group">
                            <label for="vehicle">Véhicule *</label>
                            <Dropdown id="vehicle" v-model="currentLocation.vehicleId" :options="vehicles"
                                :optionLabel="(v) => `${getVehicleInfo(v.id || '')}`" optionValue="id"
                                placeholder="Sélectionnez un véhicule" class="w-full" filter />
                        </div>
                    </div>

                    <!-- Dates -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dateDebut">Date début *</label>
                            <Calendar id="dateDebut" v-model="currentLocation.dateDebut" dateFormat="dd/mm/yy"
                                class="w-full" showIcon showTime hourFormat="24" :disabledDates="disabledDates"
                                :minDate="new Date()" />
                        </div>
                        <div class="form-group">
                            <label for="dateFin">Date fin *</label>
                            <Calendar id="dateFin" v-model="currentLocation.dateFin" dateFormat="dd/mm/yy"
                                class="w-full" showIcon showTime hourFormat="24" :disabledDates="disabledDates"
                                :minDate="currentLocation.dateDebut" />
                        </div>
                    </div>

                    <!-- Kilométrage et Carburant -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="kmDebut">Km début</label>
                            <InputNumber id="kmDebut" v-model="currentLocation.kmDebut" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label for="kmFin">Km fin</label>
                            <InputNumber id="kmFin" v-model="currentLocation.kmFin" class="w-full" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="carburantDebut">Niveau carburant début (%)</label>
                            <InputNumber id="carburantDebut" v-model="currentLocation.niveauCarburantDebut" :min="0"
                                :max="100" suffix="%" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label for="carburantFin">Niveau carburant fin (%)</label>
                            <InputNumber id="carburantFin" v-model="currentLocation.niveauCarburantFin" :min="0"
                                :max="100" suffix="%" class="w-full" />
                        </div>
                    </div>

                    <Divider />

                    <!-- Tarification -->
                    <h3 class="section-title">Tarification</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="typeCaution">Type caution</label>
                            <Dropdown id="typeCaution" v-model="currentLocation.typeCaution" :options="cautionTypes"
                                optionLabel="label" optionValue="value" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label for="montantCaution">Montant caution</label>
                            <InputNumber id="montantCaution" v-model="currentLocation.montantCaution" mode="currency"
                                currency="EUR" locale="fr-FR" class="w-full" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="prixHT">Prix unitaire HT (/ jour)</label>
                            <InputNumber id="prixHT" v-model="currentLocation.prixUnitaireHT" mode="currency"
                                currency="EUR" locale="fr-FR" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label>Nombre de jours (calculé)</label>
                            <InputNumber v-model="currentLocation.nombreJours" :disabled="true" class="w-full" />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Total HT (calculé)</label>
                            <InputNumber v-model="currentLocation.totalHT" mode="currency" currency="EUR" locale="fr-FR"
                                :disabled="true" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label>Total TTC - TVA 19% (calculé)</label>
                            <InputNumber v-model="currentLocation.totalTTC" mode="currency" currency="EUR"
                                locale="fr-FR" :disabled="true" class="w-full" />
                        </div>
                    </div>

                    <Divider />

                    <!-- Constat Début (Livraison) -->
                    <div class="anomalies-section">
                        <div class="section-header">
                            <h3 class="section-title">Constat de Livraison (Début)</h3>
                            <Button label="Ajouter anomalie" icon="pi pi-plus" size="small" @click="addAnomalyDebut" />
                        </div>

                        <div v-for="(anomaly, index) in currentLocation.anomaliesDebut" :key="'debut-' + index"
                            class="anomaly-card">
                            <div class="anomaly-header">
                                <h4>Anomalie {{ index + 1 }}</h4>
                                <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                    @click="removeAnomalyDebut(index)" />
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Type</label>
                                    <Dropdown v-model="anomaly.type" :options="anomalyTypes" editable
                                        placeholder="Sélectionner ou saisir" class="w-full" />
                                </div>
                                <div class="form-group">
                                    <label>Emplacement</label>
                                    <InputText v-model="anomaly.emplacement" placeholder="Ex: Pare-choc avant"
                                        class="w-full" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label>Description</label>
                                    <Textarea v-model="anomaly.description" rows="2" class="w-full" />
                                </div>
                            </div>
                        </div>

                        <div v-if="currentLocation.anomaliesDebut.length === 0" class="no-anomalies">
                            <p>Aucune anomalie au début</p>
                        </div>
                    </div>

                    <Divider />

                    <!-- Constat Fin (Réception) -->
                    <div class="anomalies-section">
                        <div class="section-header">
                            <h3 class="section-title">Constat de Réception (Fin)</h3>
                            <Button label="Ajouter anomalie" icon="pi pi-plus" size="small" @click="addAnomalyFin" />
                        </div>

                        <div v-for="(anomaly, index) in currentLocation.anomaliesFin" :key="'fin-' + index"
                            class="anomaly-card">
                            <div class="anomaly-header">
                                <h4>Anomalie {{ index + 1 }}</h4>
                                <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                    @click="removeAnomalyFin(index)" />
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Type</label>
                                    <Dropdown v-model="anomaly.type" :options="anomalyTypes" editable
                                        placeholder="Sélectionner ou saisir" class="w-full" />
                                </div>
                                <div class="form-group">
                                    <label>Emplacement</label>
                                    <InputText v-model="anomaly.emplacement" placeholder="Ex: Porte conducteur"
                                        class="w-full" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label>Description</label>
                                    <Textarea v-model="anomaly.description" rows="2" class="w-full" />
                                </div>
                            </div>
                        </div>

                        <div v-if="currentLocation.anomaliesFin.length === 0" class="no-anomalies">
                            <p>Aucune anomalie à la fin</p>
                        </div>
                    </div>

                    <Divider />

                    <!-- Notes -->
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label for="notes">Notes / Commentaires</label>
                            <Textarea id="notes" v-model="currentLocation.notes" rows="3" class="w-full" />
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" text @click="dialogVisible = false" />
                    <Button label="Sauvegarder" @click="saveLocation" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.locations-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.locations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.locations-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.locations-content {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.action-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

.dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 0;
}

.section-title {
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group label {
    font-weight: 600;
    color: #334155;
    font-size: 0.875rem;
}

.w-full {
    width: 100%;
}

.anomalies-section {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 8px;
}

.anomaly-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #e2e8f0;
}

.anomaly-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.anomaly-header h4 {
    margin: 0;
    color: #1e293b;
    font-size: 1.1rem;
}

.no-anomalies {
    text-align: center;
    padding: 2rem;
    color: #64748b;
}

:deep(.p-datatable) {
    font-size: 0.95rem;
}

:deep(.p-paginator) {
    padding: 1rem;
}

:deep(.p-inputnumber-input) {
    width: 100%;
}

.mr-2 {
    margin-right: 0.5rem;
}
</style>
