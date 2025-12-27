<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllBrands, addBrand, updateBrand, deleteBrand, type Brand } from '../services/brandService'
import { initializeBrands } from '../utils/initBrands'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const brands = ref<Brand[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const currentBrand = ref<Brand>({ nom: '', logo: '' })

onMounted(async () => {
    await loadBrands()
})

const loadBrands = async () => {
    loading.value = true
    try {
        brands.value = await getAllBrands()
    } catch (error) {
        console.error('Error loading brands:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les marques', life: 3000 })
    } finally {
        loading.value = false
    }
}

const openAddDialog = () => {
    isEditMode.value = false
    currentBrand.value = { nom: '', logo: '' }
    dialogVisible.value = true
}

const openEditDialog = (brand: Brand) => {
    isEditMode.value = true
    currentBrand.value = { ...brand }
    dialogVisible.value = true
}

const saveBrand = async () => {
    if (!currentBrand.value.nom.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le nom est requis', life: 3000 })
        return
    }

    loading.value = true
    try {
        if (isEditMode.value && currentBrand.value.id) {
            await updateBrand(currentBrand.value.id, {
                nom: currentBrand.value.nom,
                logo: currentBrand.value.logo
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Marque modifiée', life: 3000 })
        } else {
            await addBrand({
                nom: currentBrand.value.nom,
                logo: currentBrand.value.logo
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Marque ajoutée', life: 3000 })
        }
        dialogVisible.value = false
        await loadBrands()
    } catch (error) {
        console.error('Error saving brand:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder la marque', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = (brand: Brand) => {
    confirm.require({
        message: `Voulez-vous vraiment supprimer ${brand.nom} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleDelete(brand)
    })
}

const handleDelete = async (brand: Brand) => {
    if (!brand.id) return

    loading.value = true
    try {
        await deleteBrand(brand.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Marque supprimée', life: 3000 })
        await loadBrands()
    } catch (error) {
        console.error('Error deleting brand:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la marque', life: 3000 })
    } finally {
        loading.value = false
    }
}

const handleInitializeBrands = async () => {
    loading.value = true
    try {
        toast.add({ severity: 'info', summary: 'Initialisation', detail: 'Ajout des marques en cours...', life: 3000 })
        await initializeBrands()
        toast.add({ severity: 'success', summary: 'Succès', detail: '16 marques ont été ajoutées !', life: 3000 })
        await loadBrands()
    } catch (error) {
        console.error('Error initializing brands:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'initialiser les marques', life: 3000 })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <MainLayout>
        <div class="brands-container">
            <div class="brands-header page-header">
                <h1>Gestion des Marques</h1>
                <div class="header-actions">
                    <Button label="Initialiser les marques" icon="pi pi-database" severity="secondary"
                        @click="handleInitializeBrands" :loading="loading" />
                    <Button label="Ajouter une marque" icon="pi pi-plus" @click="openAddDialog" />
                </div>
            </div>

            <div class="brands-content">
                <DataTable :value="brands" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 50rem">
                    <Column field="nom" header="Nom" sortable></Column>
                    <Column field="logo" header="Logo">
                        <template #body="slotProps">
                            <div class="logo-cell">
                                <i v-if="!slotProps.data.logo" class="pi pi-car"
                                    style="font-size: 2rem; color: #3b82f6;"></i>
                                <img v-else :src="slotProps.data.logo" alt="Logo" class="brand-logo" />
                            </div>
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
            <Dialog v-model:visible="dialogVisible" :header="isEditMode ? 'Modifier la marque' : 'Ajouter une marque'"
                :modal="true" :style="{ width: '450px' }">
                <div class="dialog-content">
                    <div class="form-group">
                        <label for="nom">Nom *</label>
                        <InputText id="nom" v-model="currentBrand.nom" class="w-full" placeholder="Ex: Mercedes-Benz" />
                    </div>

                    <div class="form-group">
                        <label for="logo">Logo (URL ou emoji)</label>
                        <InputText id="logo" v-model="currentBrand.logo" class="w-full" placeholder="Ex: 🚗 ou URL" />
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" text @click="dialogVisible = false" />
                    <Button label="Sauvegarder" @click="saveBrand" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.brands-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.brands-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.brands-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.brands-content {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.logo-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
}

.brand-logo {
    width: 60px;
    height: 60px;
    object-fit: contain;
    border-radius: 8px;
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
