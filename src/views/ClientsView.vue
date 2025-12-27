<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllClients, addClient, updateClient, deleteClient, type Client, type Driver, type ClientType, type Gender } from '../services/clientService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import Divider from 'primevue/divider'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const clients = ref<Client[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)

const emptyDriver: Driver = {
    nom: '',
    prenom: '',
    dateNaissance: new Date(),
    sexe: 'homme',
    numeroPermis: '',
    datePermis: new Date(),
    adresse: '',
    telephone: '',
    commentaire: ''
}

const currentClient = ref<Client>({
    nom: '',
    prenom: '',
    typeClient: 'physique',
    raisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
    numeroCIN: '',
    matriculeFiscale: '',
    conducteurs: []
})

const clientTypes = [
    { label: 'Personne Physique', value: 'physique' },
    { label: 'Personne Morale', value: 'morale' }
]

const genderOptions = [
    { label: 'Homme', value: 'homme' },
    { label: 'Femme', value: 'femme' }
]

onMounted(async () => {
    await loadClients()
})

const loadClients = async () => {
    loading.value = true
    try {
        clients.value = await getAllClients()
    } catch (error) {
        console.error('Error loading clients:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les clients', life: 3000 })
    } finally {
        loading.value = false
    }
}

const openAddDialog = () => {
    isEditMode.value = false
    currentClient.value = {
        nom: '',
        prenom: '',
        typeClient: 'physique',
        raisonSociale: '',
        adresse: '',
        telephone: '',
        email: '',
        numeroCIN: '',
        matriculeFiscale: '',
        conducteurs: []
    }
    dialogVisible.value = true
}

const openEditDialog = (client: Client) => {
    isEditMode.value = true
    currentClient.value = {
        ...client,
        conducteurs: client.conducteurs.map(driver => ({
            ...driver,
            dateNaissance: new Date(driver.dateNaissance),
            datePermis: new Date(driver.datePermis)
        }))
    }
    dialogVisible.value = true
}

const addDriver = () => {
    if (currentClient.value.conducteurs.length < 2) {
        currentClient.value.conducteurs.push({ ...emptyDriver })
    } else {
        toast.add({ severity: 'warn', summary: 'Limite atteinte', detail: 'Maximum 2 conducteurs par client', life: 3000 })
    }
}

const removeDriver = (index: number) => {
    currentClient.value.conducteurs.splice(index, 1)
}

const saveClient = async () => {
    // Validation
    if (!currentClient.value.nom.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le nom est requis', life: 3000 })
        return
    }

    if (currentClient.value.typeClient === 'physique' && !currentClient.value.prenom.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le prénom est requis', life: 3000 })
        return
    }

    if (currentClient.value.typeClient === 'morale' && !currentClient.value.raisonSociale?.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'La raison sociale est requise', life: 3000 })
        return
    }

    if (!currentClient.value.email.trim()) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'L\'email est requis', life: 3000 })
        return
    }

    loading.value = true
    try {
        const clientData = {
            nom: currentClient.value.nom,
            prenom: currentClient.value.prenom,
            typeClient: currentClient.value.typeClient,
            raisonSociale: currentClient.value.raisonSociale || '',
            adresse: currentClient.value.adresse,
            telephone: currentClient.value.telephone,
            email: currentClient.value.email,
            numeroCIN: currentClient.value.typeClient === 'physique' ? currentClient.value.numeroCIN : '',
            matriculeFiscale: currentClient.value.typeClient === 'morale' ? currentClient.value.matriculeFiscale : '',
            conducteurs: currentClient.value.conducteurs
        }

        if (isEditMode.value && currentClient.value.id) {
            await updateClient(currentClient.value.id, clientData)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Client modifié', life: 3000 })
        } else {
            await addClient(clientData)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Client ajouté', life: 3000 })
        }
        dialogVisible.value = false
        await loadClients()
    } catch (error) {
        console.error('Error saving client:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder le client', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = (client: Client) => {
    confirm.require({
        message: `Voulez-vous vraiment supprimer ${client.nom} ${client.prenom} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleDelete(client)
    })
}

const handleDelete = async (client: Client) => {
    if (!client.id) return

    loading.value = true
    try {
        await deleteClient(client.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Client supprimé', life: 3000 })
        await loadClients()
    } catch (error) {
        console.error('Error deleting client:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le client', life: 3000 })
    } finally {
        loading.value = false
    }
}

const getClientDisplay = (client: Client): string => {
    if (client.typeClient === 'morale') {
        return client.raisonSociale || client.nom
    }
    return `${client.nom} ${client.prenom}`
}
</script>

<template>
    <MainLayout>
        <div class="clients-container">
            <div class="clients-header page-header">
                <h1>Gestion des Clients</h1>
                <Button label="Ajouter un client" icon="pi pi-plus" @click="openAddDialog" />
            </div>

            <div class="clients-content">
                <DataTable :value="clients" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 70rem">
                    <Column field="nom" header="Nom" sortable></Column>
                    <Column field="prenom" header="Prénom" sortable></Column>
                    <Column field="typeClient" header="Type" sortable>
                        <template #body="slotProps">
                            <Tag :value="slotProps.data.typeClient === 'physique' ? 'Personne Physique' : 'Personne Morale'"
                                :severity="slotProps.data.typeClient === 'physique' ? 'info' : 'warning'" />
                        </template>
                    </Column>
                    <Column field="raisonSociale" header="Raison Sociale" sortable></Column>
                    <Column field="telephone" header="Téléphone" sortable></Column>
                    <Column field="email" header="Email" sortable></Column>
                    <Column header="Conducteurs" style="min-width: 10rem">
                        <template #body="slotProps">
                            <Tag :value="`${slotProps.data.conducteurs.length} conducteur(s)`" severity="success" />
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
            <Dialog v-model:visible="dialogVisible" :header="isEditMode ? 'Modifier le client' : 'Ajouter un client'"
                :modal="true" :style="{ width: '900px', maxHeight: '90vh' }" :contentStyle="{ overflow: 'auto' }">
                <div class="dialog-content">
                    <!-- Informations Client -->
                    <h3 class="section-title">Informations Client</h3>

                    <!-- Type de client -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="typeClient">Type de client *</label>
                            <Dropdown id="typeClient" v-model="currentClient.typeClient" :options="clientTypes"
                                optionLabel="label" optionValue="value" class="w-full" />
                        </div>
                    </div>

                    <!-- Nom et Prénom / Raison Sociale -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nom">{{ currentClient.typeClient === 'morale' ? 'Nom de la société' : 'Nom' }}
                                *</label>
                            <InputText id="nom" v-model="currentClient.nom" class="w-full" />
                        </div>
                        <div class="form-group" v-if="currentClient.typeClient === 'physique'">
                            <label for="prenom">Prénom *</label>
                            <InputText id="prenom" v-model="currentClient.prenom" class="w-full" />
                        </div>
                    </div>

                    <!-- Raison Sociale pour Morale -->
                    <div class="form-row" v-if="currentClient.typeClient === 'morale'">
                        <div class="form-group">
                            <label for="raisonSociale">Raison Sociale *</label>
                            <InputText id="raisonSociale" v-model="currentClient.raisonSociale" class="w-full" />
                        </div>
                    </div>

                    <!-- Adresse et Téléphone -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="adresse">Adresse</label>
                            <InputText id="adresse" v-model="currentClient.adresse" class="w-full" />
                        </div>
                        <div class="form-group">
                            <label for="telephone">Téléphone</label>
                            <InputText id="telephone" v-model="currentClient.telephone" class="w-full"
                                placeholder="Ex: +216 12 345 678" />
                        </div>
                    </div>

                    <!-- Email et Identification -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <InputText id="email" v-model="currentClient.email" type="email" class="w-full"
                                placeholder="ex@example.com" />
                        </div>
                        <div class="form-group">
                            <label for="identification">
                                {{ currentClient.typeClient === 'physique' ? 'Numéro CIN' : 'Matricule Fiscale' }}
                            </label>
                            <InputText v-if="currentClient.typeClient === 'physique'" id="cin"
                                v-model="currentClient.numeroCIN" class="w-full" placeholder="Ex: 12345678" />
                            <InputText v-else id="matricule" v-model="currentClient.matriculeFiscale" class="w-full"
                                placeholder="Ex: 1234567ABC" />
                        </div>
                    </div>

                    <Divider />

                    <!-- Section Conducteurs -->
                    <div class="drivers-section">
                        <div class="section-header">
                            <h3 class="section-title">Conducteurs (Max 2)</h3>
                            <Button label="Ajouter conducteur" icon="pi pi-plus" size="small" @click="addDriver"
                                :disabled="currentClient.conducteurs.length >= 2" />
                        </div>

                        <!-- Liste des conducteurs -->
                        <div v-for="(driver, index) in currentClient.conducteurs" :key="index" class="driver-card">
                            <div class="driver-header">
                                <h4>Conducteur {{ index + 1 }}</h4>
                                <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                    @click="removeDriver(index)" />
                            </div>

                            <!-- Nom et Prénom -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nom</label>
                                    <InputText v-model="driver.nom" class="w-full" />
                                </div>
                                <div class="form-group">
                                    <label>Prénom</label>
                                    <InputText v-model="driver.prenom" class="w-full" />
                                </div>
                            </div>

                            <!-- Date naissance et Sexe -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Date de naissance</label>
                                    <Calendar v-model="driver.dateNaissance" dateFormat="dd/mm/yy" class="w-full"
                                        showIcon />
                                </div>
                                <div class="form-group">
                                    <label>Sexe</label>
                                    <Dropdown v-model="driver.sexe" :options="genderOptions" optionLabel="label"
                                        optionValue="value" class="w-full" />
                                </div>
                            </div>

                            <!-- Permis -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label>N° Permis de conduite</label>
                                    <InputText v-model="driver.numeroPermis" class="w-full" />
                                </div>
                                <div class="form-group">
                                    <label>Date Permis</label>
                                    <Calendar v-model="driver.datePermis" dateFormat="dd/mm/yy" class="w-full"
                                        showIcon />
                                </div>
                            </div>

                            <!-- Adresse et Téléphone -->
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Adresse</label>
                                    <InputText v-model="driver.adresse" class="w-full" />
                                </div>
                                <div class="form-group">
                                    <label>Téléphone</label>
                                    <InputText v-model="driver.telephone" class="w-full" />
                                </div>
                            </div>

                            <!-- Commentaire -->
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <label>Commentaire</label>
                                    <InputText v-model="driver.commentaire" class="w-full" />
                                </div>
                            </div>
                        </div>

                        <div v-if="currentClient.conducteurs.length === 0" class="no-drivers">
                            <p>Aucun conducteur ajouté</p>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" text @click="dialogVisible = false" />
                    <Button label="Sauvegarder" @click="saveClient" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.clients-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.clients-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.clients-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
}

.clients-content {
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

.drivers-section {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 8px;
}

.driver-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #e2e8f0;
}

.driver-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.driver-header h4 {
    margin: 0;
    color: #1e293b;
    font-size: 1.1rem;
}

.no-drivers {
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
</style>
