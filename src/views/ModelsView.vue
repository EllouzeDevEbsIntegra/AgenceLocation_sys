<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllModels, addModel, updateModel, deleteModel, type Model } from '../services/modelService'
import { getAllBrands, type Brand } from '../services/brandService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const models = ref<Model[]>([])
const brands = ref<Brand[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const currentModel = ref<Model>({ nom: '', brandId: '' })

onMounted(async () => {
    await Promise.all([loadModels(), loadBrands()])
})

const loadModels = async () => {
    loading.value = true
    try {
        models.value = await getAllModels()
    } catch (error) {
        console.error('Error loading models:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les modèles', life: 3000 })
    } finally {
        loading.value = false
    }
}

const loadBrands = async () => {
    try {
        brands.value = await getAllBrands()
    } catch (error) {
        console.error('Error loading brands:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les marques', life: 3000 })
    }
}

// Computed pour obtenir le nom de la marque à partir de l'ID
const getBrandName = (brandId: string): string => {
    const brand = brands.value.find(b => b.id === brandId)
    return brand?.nom || 'N/A'
}

const openAddDialog = () => {
    isEditMode.value = false
    currentModel.value = { nom: '', brandId: '' }
    dialogVisible.value = true
}

const openEditDialog = (model: Model) => {
    isEditMode.value = true
    currentModel.value = { ...model }
    dialogVisible.value = true
}

const saveModel = async () => {
    if (!currentModel.value.nom.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le nom est requis', life: 3000 })
        return
    }

    if (!currentModel.value.brandId) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'La marque est requise', life: 3000 })
        return
    }

    loading.value = true
    try {
        if (isEditMode.value && currentModel.value.id) {
            await updateModel(currentModel.value.id, {
                nom: currentModel.value.nom,
                brandId: currentModel.value.brandId
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Modèle modifié', life: 3000 })
        } else {
            await addModel({
                nom: currentModel.value.nom,
                brandId: currentModel.value.brandId
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Modèle ajouté', life: 3000 })
        }
        dialogVisible.value = false
        await loadModels()
    } catch (error) {
        console.error('Error saving model:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder le modèle', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = (model: Model) => {
    confirm.require({
        message: `Voulez-vous vraiment supprimer ${model.nom} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleDelete(model)
    })
}

const handleDelete = async (model: Model) => {
    if (!model.id) return

    loading.value = true
    try {
        await deleteModel(model.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Modèle supprimé', life: 3000 })
        await loadModels()
    } catch (error) {
        console.error('Error deleting model:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le modèle', life: 3000 })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <MainLayout>
        <div class="models-container">
            <div class="models-header page-header">
                <h1>Gestion des Modèles</h1>
                <Button label="Ajouter un modèle" icon="pi pi-plus" @click="openAddDialog" />
            </div>

            <div class="models-content">
                <DataTable :value="models" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 50rem">
                    <Column field="nom" header="Nom" sortable></Column>
                    <Column field="brandId" header="Marque" sortable>
                        <template #body="slotProps">
                            {{ getBrandName(slotProps.data.brandId) }}
                        </template>
                    </Column>
                    <Column header="Actions" style="width: 12rem">
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
            <Dialog v-model:visible="dialogVisible" :header="isEditMode ? 'Modifier le modèle' : 'Ajouter un modèle'"
                :modal="true" :style="{ width: '450px' }">
                <div class="dialog-content">
                    <div class="form-group">
                        <label for="nom">Nom *</label>
                        <InputText id="nom" v-model="currentModel.nom" class="w-full" placeholder="Ex: Serie 3" />
                    </div>

                    <div class="form-group">
                        <label for="brand">Marque *</label>
                        <Dropdown id="brand" v-model="currentModel.brandId" :options="brands" optionLabel="nom"
                            optionValue="id" placeholder="Sélectionnez une marque" class="w-full" />
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" text @click="dialogVisible = false" />
                    <Button label="Sauvegarder" @click="saveModel" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.models-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.models-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.models-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.models-content {
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

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
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
</style>
