<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllUsers, createUser, updateUserData, deleteUserAccount, type User } from '../services/userService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Card from 'primevue/card'

const toast = useToast()

const users = ref<User[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const isEditing = ref(false)

const currentUser = ref<Partial<User>>({
    email: '',
    displayName: '',
    role: 'user'
})

const newPassword = ref('')
const selectedUser = ref<User | null>(null)

const roleOptions = [
    { label: 'Utilisateur', value: 'user' },
    { label: 'Administrateur', value: 'admin' }
]

onMounted(async () => {
    await loadUsers()
})

const loadUsers = async () => {
    loading.value = true
    try {
        users.value = await getAllUsers()
    } catch (error) {
        console.error('Error loading users:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les utilisateurs', life: 3000 })
    } finally {
        loading.value = false
    }
}

const openAddDialog = () => {
    isEditing.value = false
    currentUser.value = {
        email: '',
        displayName: '',
        role: 'user'
    }
    newPassword.value = ''
    dialogVisible.value = true
}

const openEditDialog = (user: User) => {
    isEditing.value = true
    currentUser.value = { ...user }
    newPassword.value = ''
    dialogVisible.value = true
}

const openDeleteDialog = (user: User) => {
    selectedUser.value = user
    deleteDialogVisible.value = true
}

const closeDialog = () => {
    dialogVisible.value = false
    currentUser.value = {
        email: '',
        displayName: '',
        role: 'user'
    }
    newPassword.value = ''
}

const saveUser = async () => {
    if (!currentUser.value.email || !currentUser.value.displayName) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Email et nom complet sont requis', life: 3000 })
        return
    }

    if (!isEditing.value && !newPassword.value) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le mot de passe est requis', life: 3000 })
        return
    }

    loading.value = true
    try {
        if (isEditing.value) {
            await updateUserData(currentUser.value.id!, {
                displayName: currentUser.value.displayName,
                role: currentUser.value.role
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur modifié avec succès', life: 3000 })
        } else {
            await createUser(
                currentUser.value.email!,
                newPassword.value,
                currentUser.value.displayName!,
                currentUser.value.role || 'user'
            )
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur créé avec succès', life: 3000 })
        }
        await loadUsers()
        closeDialog()
    } catch (error: any) {
        console.error('Error saving user:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: error.message || 'Erreur lors de la sauvegarde', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDelete = async () => {
    if (!selectedUser.value) return

    loading.value = true
    try {
        await deleteUserAccount(selectedUser.value.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur supprimé', life: 3000 })
        await loadUsers()
        deleteDialogVisible.value = false
    } catch (error) {
        console.error('Error deleting user:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer l\'utilisateur', life: 3000 })
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
        <div class="settings-container">
            <div class="settings-header page-header">
                <h1>Paramètres</h1>
            </div>

            <Card>
                <template #content>
                    <TabView>
                        <TabPanel header="Gestion des Utilisateurs" value="0">
                            <div class="users-content">
                                <div class="table-header">
                                    <Button label="Ajouter un utilisateur" icon="pi pi-plus" @click="openAddDialog" />
                                </div>

                                <DataTable :value="users" :loading="loading" paginator :rows="10"
                                    responsiveLayout="scroll" stripedRows>
                                    <Column field="displayName" header="Nom" sortable></Column>
                                    <Column field="email" header="Email" sortable></Column>
                                    <Column field="role" header="Rôle" sortable>
                                        <template #body="slotProps">
                                            {{ slotProps.data.role === 'admin' ? 'Administrateur' : 'Utilisateur' }}
                                        </template>
                                    </Column>
                                    <Column field="createdAt" header="Créé le" sortable>
                                        <template #body="slotProps">
                                            {{ formatDate(slotProps.data.createdAt) }}
                                        </template>
                                    </Column>
                                    <Column header="Actions" style="min-width: 10rem">
                                        <template #body="slotProps">
                                            <div class="action-buttons">
                                                <Button icon="pi pi-pencil" severity="secondary" text rounded
                                                    @click="openEditDialog(slotProps.data)" v-tooltip="'Modifier'" />
                                                <Button icon="pi pi-trash" severity="danger" text rounded
                                                    @click="openDeleteDialog(slotProps.data)" v-tooltip="'Supprimer'" />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
                        </TabPanel>

                        <TabPanel header="Général" value="1">
                            <p class="m-0">
                                Autres paramètres à venir...
                            </p>
                        </TabPanel>
                    </TabView>
                </template>
            </Card>

            <!-- Dialog Ajout/Modification -->
            <Dialog v-model:visible="dialogVisible"
                :header="isEditing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'" :modal="true"
                :closable="true" :style="{ width: '500px' }">
                <div class="dialog-content">
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <InputText id="email" v-model="currentUser.email" :disabled="isEditing" class="w-full"
                            placeholder="email@exemple.com" />
                    </div>

                    <div class="form-group">
                        <label for="displayName">Nom complet *</label>
                        <InputText id="displayName" v-model="currentUser.displayName" class="w-full"
                            placeholder="Prénom Nom" />
                    </div>

                    <div class="form-group" v-if="!isEditing">
                        <label for="password">Mot de passe *</label>
                        <Password id="password" v-model="newPassword" class="w-full" toggleMask :feedback="false"
                            placeholder="Minimum 6 caractères" />
                    </div>

                    <div class="form-group">
                        <label for="role">Rôle</label>
                        <Dropdown id="role" v-model="currentUser.role" :options="roleOptions" optionLabel="label"
                            optionValue="value" class="w-full" />
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="closeDialog" text />
                    <Button :label="isEditing ? 'Modifier' : 'Créer'" @click="saveUser" :loading="loading" />
                </template>
            </Dialog>

            <!-- Dialog Suppression -->
            <Dialog v-model:visible="deleteDialogVisible" header="Confirmer la suppression" :modal="true"
                :style="{ width: '450px' }">
                <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ selectedUser?.displayName }}</strong> ?
                </p>
                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="deleteDialogVisible = false" text />
                    <Button label="Supprimer" severity="danger" @click="confirmDelete" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.settings-container {
    padding: 1rem;
}

.users-content {
    margin-top: 1rem;
}

.table-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
}

.dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

.action-buttons {
    display: flex;
    gap: 0.5rem;
}

:deep(.p-tabview-nav) {
    background: transparent !important;
}

:deep(.p-tabview-panels) {
    padding: 1.5rem 0 !important;
}
</style>
