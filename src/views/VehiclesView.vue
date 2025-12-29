<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllVehicles, addVehicle, updateVehicle, deleteVehicle, type Vehicle } from '../services/vehicleService'
import { getAllModels, type Model } from '../services/modelService'
import { getAllBrands, type Brand } from '../services/brandService'
import { useAppConfig } from '../composables/useAppConfig'
import MainLayout from '../layouts/MainLayout.vue'

const { config, loadConfig, formatCurrency } = useAppConfig()
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import InputSwitch from 'primevue/inputswitch'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const vehicles = ref<Vehicle[]>([])
const models = ref<Model[]>([])
const brands = ref<Brand[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const currentVehicle = ref<Vehicle>({
    modelId: '',
    numeroChassis: '',
    immatriculation: '',
    dateMiseCirculation: new Date(),
    nomAssurance: '',
    dateAssurance: new Date(),
    dateVisite: new Date(),
    dateVignette: new Date(),
    actif: true,
    prixUnitaireHT: 0
})

onMounted(async () => {
    await Promise.all([loadVehicles(), loadModels(), loadBrands(), loadConfig()])
})

const loadVehicles = async () => {
    loading.value = true
    try {
        vehicles.value = await getAllVehicles()
    } catch (error) {
        console.error('Error loading vehicles:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les véhicules', life: 3000 })
    } finally {
        loading.value = false
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

// Obtenir le nom du modèle
const getModelName = (modelId: string): string => {
    const model = models.value.find(m => m.id === modelId)
    return model?.nom || 'N/A'
}

// Obtenir le nom de la marque à partir du modelId
const getBrandName = (modelId: string): string => {
    const model = models.value.find(m => m.id === modelId)
    if (!model) return 'N/A'
    const brand = brands.value.find(b => b.id === model.brandId)
    return brand?.nom || 'N/A'
}

const openAddDialog = () => {
    isEditMode.value = false
    currentVehicle.value = {
        modelId: '',
        numeroChassis: '',
        immatriculation: '',
        dateMiseCirculation: new Date(),
        nomAssurance: '',
        dateAssurance: new Date(),
        dateVisite: new Date(),
        dateVignette: new Date(),
        actif: true,
        prixUnitaireHT: 0
    }
    dialogVisible.value = true
}

const openEditDialog = (vehicle: Vehicle) => {
    isEditMode.value = true
    currentVehicle.value = {
        ...vehicle,
        dateMiseCirculation: new Date(vehicle.dateMiseCirculation),
        dateAssurance: new Date(vehicle.dateAssurance),
        dateVisite: new Date(vehicle.dateVisite),
        dateVignette: new Date(vehicle.dateVignette)
    }
    dialogVisible.value = true
}

const saveVehicle = async () => {
    // Validation
    if (!currentVehicle.value.modelId) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le modèle est requis', life: 3000 })
        return
    }
    if (!currentVehicle.value.numeroChassis.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le numéro de chassis est requis', life: 3000 })
        return
    }
    if (!currentVehicle.value.immatriculation.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'L\'immatriculation est requise', life: 3000 })
        return
    }

    loading.value = true
    try {
        if (isEditMode.value && currentVehicle.value.id) {
            await updateVehicle(currentVehicle.value.id, {
                modelId: currentVehicle.value.modelId,
                numeroChassis: currentVehicle.value.numeroChassis,
                immatriculation: currentVehicle.value.immatriculation,
                dateMiseCirculation: currentVehicle.value.dateMiseCirculation,
                nomAssurance: currentVehicle.value.nomAssurance,
                dateAssurance: currentVehicle.value.dateAssurance,
                dateVisite: currentVehicle.value.dateVisite,
                dateVignette: currentVehicle.value.dateVignette,
                actif: currentVehicle.value.actif,
                prixUnitaireHT: currentVehicle.value.prixUnitaireHT
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Véhicule modifié', life: 3000 })
        } else {
            await addVehicle({
                modelId: currentVehicle.value.modelId,
                numeroChassis: currentVehicle.value.numeroChassis,
                immatriculation: currentVehicle.value.immatriculation,
                dateMiseCirculation: currentVehicle.value.dateMiseCirculation,
                nomAssurance: currentVehicle.value.nomAssurance,
                dateAssurance: currentVehicle.value.dateAssurance,
                dateVisite: currentVehicle.value.dateVisite,
                dateVignette: currentVehicle.value.dateVignette,
                actif: currentVehicle.value.actif,
                prixUnitaireHT: currentVehicle.value.prixUnitaireHT
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Véhicule ajouté', life: 3000 })
        }
        dialogVisible.value = false
        await loadVehicles()
    } catch (error) {
        console.error('Error saving vehicle:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder le véhicule', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = (vehicle: Vehicle) => {
    confirm.require({
        message: `Voulez-vous vraiment supprimer le véhicule ${vehicle.immatriculation} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleDelete(vehicle)
    })
}

const handleDelete = async (vehicle: Vehicle) => {
    if (!vehicle.id) return

    loading.value = true
    try {
        await deleteVehicle(vehicle.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Véhicule supprimé', life: 3000 })
        await loadVehicles()
    } catch (error) {
        console.error('Error deleting vehicle:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le véhicule', life: 3000 })
    } finally {
        loading.value = false
    }
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR')
}
</script>

<template>
    <MainLayout>
        <div class="vehicles-container">
            <div class="vehicles-header page-header">
                <h1>Gestion du Parc de Véhicules</h1>
                <Button label="Ajouter un véhicule" icon="pi pi-plus" @click="openAddDialog" />
            </div>

            <div class="vehicles-content">
                <DataTable :value="vehicles" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 70rem">
                    <Column field="immatriculation" header="Immatriculation" sortable style="min-width: 10rem"></Column>
                    <Column field="numeroChassis" header="Numéro Chassis" sortable style="min-width: 12rem"></Column>
                    <Column field="modelId" header="Modèle" sortable>
                        <template #body="slotProps">
                            {{ getModelName(slotProps.data.modelId) }}
                        </template>
                    </Column>
                    <Column field="modelId" header="Marque" sortable>
                        <template #body="slotProps">
                            {{ getBrandName(slotProps.data.modelId) }}
                        </template>
                    </Column>
                    <Column field="actif" header="État" sortable style="min-width: 8rem">
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.actif ? 'Actif' : 'Inactif'"
                                :severity="slotProps.data.actif ? 'success' : 'danger'" />
                        </template>
                    </Column>
                    <Column field="prixUnitaireHT" header="Prix HT" sortable>
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.prixUnitaireHT) }}
                        </template>
                    </Column>
                    <Column header="Actions" style="width: 10rem">
                        <template #body="slotProps">
                            <div class="action-buttons">
                                <Button icon="pi pi-pencil" severity="info" text rounded
                                    @click="openEditDialog(slotProps.data)" />
                                <Button icon="pi pi-trash" severity="danger" text rounded
                                    @click="confirmDelete(slotProps.data)" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Dialog Add/Edit -->
            <Dialog v-model:visible="dialogVisible"
                :header="isEditMode ? 'Modifier le véhicule' : 'Ajouter un véhicule'" :modal="true"
                :style="{ width: '700px' }">
                <div class="dialog-content">
                    <!-- Modèle -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="model">Modèle *</label>
                            <Dropdown id="model" v-model="currentVehicle.modelId" :options="models" optionLabel="nom"
                                optionValue="id" placeholder="Sélectionnez un modèle" class="w-full" />
                        </div>
                    </div>

                    <!-- Chassis et Immatriculation -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="chassis">Numéro de chassis *</label>
                            <InputText id="chassis" v-model="currentVehicle.numeroChassis" class="w-full"
                                placeholder="Ex: VF1XXXXXXXX123456" />
                        </div>
                        <div class="form-group">
                            <label for="immat">Immatriculation *</label>
                            <InputText id="immat" v-model="currentVehicle.immatriculation" class="w-full"
                                placeholder="Ex: 123-TUN-4567" />
                        </div>
                    </div>

                    <!-- Date Mise en Circulation et Prix -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dateMiseCirc">Date mise en circulation</label>
                            <Calendar id="dateMiseCirc" v-model="currentVehicle.dateMiseCirculation"
                                dateFormat="dd/mm/yy" class="w-full" showIcon />
                        </div>
                        <div class="form-group">
                            <label for="prix">Prix unitaire HT</label>
                            <InputNumber id="prix" v-model="currentVehicle.prixUnitaireHT" mode="currency"
                                :currency="config.currency" :minFractionDigits="config.decimals"
                                :maxFractionDigits="config.decimals" class="w-full"
                                @focus="currentVehicle.prixUnitaireHT = null" />
                        </div>
                    </div>

                    <!-- Nom Assurance et Date Assurance -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="assurance">Nom Assurance</label>
                            <InputText id="assurance" v-model="currentVehicle.nomAssurance" class="w-full"
                                placeholder="Ex: AXA Assurances" />
                        </div>
                        <div class="form-group">
                            <label for="dateAssurance">Date Assurance</label>
                            <Calendar id="dateAssurance" v-model="currentVehicle.dateAssurance" dateFormat="dd/mm/yy"
                                class="w-full" showIcon />
                        </div>
                    </div>

                    <!-- Date Visite et Date Vignette -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="dateVisite">Date Visite Technique</label>
                            <Calendar id="dateVisite" v-model="currentVehicle.dateVisite" dateFormat="dd/mm/yy"
                                class="w-full" showIcon />
                        </div>
                        <div class="form-group">
                            <label for="dateVignette">Date Vignette</label>
                            <Calendar id="dateVignette" v-model="currentVehicle.dateVignette" dateFormat="dd/mm/yy"
                                class="w-full" showIcon />
                        </div>
                    </div>

                    <!-- État -->
                    <div class="form-row">
                        <div class="form-group-switch">
                            <label for="actif">État du véhicule</label>
                            <div class="switch-container">
                                <InputSwitch id="actif" v-model="currentVehicle.actif" />
                                <span class="switch-label">{{ currentVehicle.actif ? 'Actif' : 'Inactif' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" text @click="dialogVisible = false" />
                    <Button label="Sauvegarder" @click="saveVehicle" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.vehicles-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.vehicles-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.vehicles-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.vehicles-content {
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

.form-group-switch {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.switch-container {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.switch-label {
    font-weight: 600;
    color: #334155;
}

.form-group label,
.form-group-switch label {
    font-weight: 600;
    color: #334155;
    font-size: 0.875rem;
}

.w-full {
    width: 100%;
}

:deep(.p-datatable) {
    font-size: 0.95rem;
}

:deep(.p-datatable-header) {
    background: #f8fafc;
}

:deep(.p-paginator) {
    padding: 1rem;
}

:deep(.p-inputnumber-input) {
    width: 100%;
}
</style>
