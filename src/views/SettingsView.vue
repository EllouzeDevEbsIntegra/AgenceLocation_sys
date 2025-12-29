<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { getAllUsers, createUser, updateUserData, deleteUserAccount, type User } from '../services/userService'
import {
    getAllParameters, addParameter, updateParameter, deleteParameter, initParameters,
    getGeneralConfig, saveGeneralConfig, CONFIG_KEYS,
    type Parameter, type ParameterType
} from '../services/parameterService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import InputNumber from 'primevue/inputnumber'

const toast = useToast()

// Users State
const users = ref<User[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const isEditing = ref(false)

// Parameters State
const parameters = ref<Parameter[]>([])
const paramDialogVisible = ref(false)
const deleteParamDialogVisible = ref(false)
const isEditingParam = ref(false)
const currentParam = ref<Partial<Parameter>>({
    type: 'caution_type',
    label: '',
    value: '',
    parentValue: ''
})
const selectedParam = ref<Parameter | null>(null)
const activeParamTab = ref(0) // For sub-tabs in parameters

// General Config State
const generalConfig = ref({
    currency: 'TND',
    decimals: 3,
    vatRate: 19,
    stampDuty: 1.000
})
const configLoading = ref(false)

// Navigation state
const activeTab = ref('users')
const isSidebarExpanded = ref(true)

const menuItems = [
    { id: 'users', label: 'Utilisateurs', icon: 'pi pi-users' },
    { id: 'locations', label: 'Locations', icon: 'pi pi-calendar' },
    { id: 'payments', label: 'Règlements', icon: 'pi pi-wallet' },
    { id: 'expenses', label: 'Dépenses', icon: 'pi pi-money-bill' },
    { id: 'general', label: 'Général', icon: 'pi pi-cog' }
]

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
    await Promise.all([
        loadUsers(),
        loadParameters(),
        loadGeneralSettings()
    ])
})

const loadGeneralSettings = async () => {
    try {
        const config = await getGeneralConfig()
        const currency = config[CONFIG_KEYS.CURRENCY]
        const decimals = config[CONFIG_KEYS.DECIMALS]
        const vatRate = config[CONFIG_KEYS.VAT_RATE]
        const stampDuty = config[CONFIG_KEYS.STAMP_DUTY]

        if (currency) generalConfig.value.currency = currency
        if (decimals) generalConfig.value.decimals = parseInt(decimals)
        if (vatRate) generalConfig.value.vatRate = parseFloat(vatRate)
        if (stampDuty) generalConfig.value.stampDuty = parseFloat(stampDuty)
    } catch (error) {
        console.error('Error loading general settings:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la configuration générale', life: 3000 })
    }
}

const saveGeneralSettings = async () => {
    configLoading.value = true
    try {
        await saveGeneralConfig({
            [CONFIG_KEYS.CURRENCY]: generalConfig.value.currency,
            [CONFIG_KEYS.DECIMALS]: String(generalConfig.value.decimals),
            [CONFIG_KEYS.VAT_RATE]: String(generalConfig.value.vatRate),
            [CONFIG_KEYS.STAMP_DUTY]: String(generalConfig.value.stampDuty)
        })
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Configuration enregistrée', life: 3000 })
    } catch (error) {
        console.error('Error saving general settings:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'enregistrer la configuration', life: 3000 })
    } finally {
        configLoading.value = false
    }
}

// --- Users Logic ---

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

// --- Parameters Logic ---

const loadParameters = async () => {
    loading.value = true
    try {
        // Initialize default parameters if empty
        await initParameters()
        parameters.value = await getAllParameters()
    } catch (error) {
        console.error('Error loading parameters:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les paramètres', life: 3000 })
    } finally {
        loading.value = false
    }
}

const getParametersByType = (type: ParameterType) => {
    return parameters.value.filter(p => p.type === type)
}

const openAddParamDialog = (type: ParameterType) => {
    isEditingParam.value = false
    currentParam.value = {
        type,
        label: '',
        value: '',
        parentValue: ''
    }
    paramDialogVisible.value = true
}

const openEditParamDialog = (param: Parameter) => {
    isEditingParam.value = true
    currentParam.value = { ...param }
    paramDialogVisible.value = true
}

const openDeleteParamDialog = (param: Parameter) => {
    selectedParam.value = param
    deleteParamDialogVisible.value = true
}

const closeParamDialog = () => {
    paramDialogVisible.value = false
    currentParam.value = {
        type: 'caution_type',
        label: '',
        value: '',
        parentValue: ''
    }
}

const saveParameter = async () => {
    if (!currentParam.value.label) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Le libellé est requis', life: 3000 })
        return
    }

    // Auto-generate value from label if empty
    if (!currentParam.value.value) {
        currentParam.value.value = currentParam.value.label
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
            .replace(/[^a-z0-9]/g, '_') // replace non-alphanumeric with underscore
    }

    loading.value = true
    try {
        if (isEditingParam.value && currentParam.value.id) {
            await updateParameter(currentParam.value.id, {
                label: currentParam.value.label,
                value: currentParam.value.value,
                parentValue: currentParam.value.parentValue
            })
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Paramètre modifié', life: 3000 })
        } else {
            await addParameter(currentParam.value as Omit<Parameter, 'id'>)
            toast.add({ severity: 'success', summary: 'Succès', detail: 'Paramètre ajouté', life: 3000 })
        }
        await loadParameters()
        closeParamDialog()
    } catch (error) {
        console.error('Error saving parameter:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la sauvegarde', life: 3000 })
    } finally {
        loading.value = false
    }
}

const confirmDeleteParam = async () => {
    if (!selectedParam.value) return

    loading.value = true
    try {
        await deleteParameter(selectedParam.value.id!)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Paramètre supprimé', life: 3000 })
        await loadParameters()
        deleteParamDialogVisible.value = false
    } catch (error) {
        console.error('Error deleting parameter:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer', life: 3000 })
    } finally {
        loading.value = false
    }
}

// Helper to get parent label for display
const getParentLabel = (parentValue: string, parentType: ParameterType) => {
    const parent = parameters.value.find(p => p.type === parentType && p.value === parentValue)
    return parent ? parent.label : parentValue
}

</script>

<template>
    <MainLayout>
        <div class="settings-layout">
            <!-- Sidebar -->
            <div class="settings-sidebar" :class="{ 'collapsed': !isSidebarExpanded }">
                <div class="sidebar-header">
                    <div class="sidebar-title" v-if="isSidebarExpanded">
                        <i class="pi pi-cog"></i>
                        <span>Paramètres</span>
                    </div>
                    <Button :icon="isSidebarExpanded ? 'pi pi-angle-left' : 'pi pi-angle-right'" text rounded
                        @click="isSidebarExpanded = !isSidebarExpanded" class="toggle-btn" />
                </div>
                <div class="sidebar-menu">
                    <div v-for="item in menuItems" :key="item.id" class="menu-item"
                        :class="{ 'active': activeTab === item.id }" @click="activeTab = item.id"
                        :title="!isSidebarExpanded ? item.label : ''">
                        <i :class="item.icon"></i>
                        <span v-if="isSidebarExpanded">{{ item.label }}</span>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="settings-content">
                <div class="content-header">
                    <h1>{{ menuItems.find(i => i.id === activeTab)?.label }}</h1>
                </div>

                <div class="content-body">
                    <!-- Users Tab -->
                    <div v-if="activeTab === 'users'" class="tab-content">
                        <Card>
                            <template #content>
                                <div class="users-content">
                                    <div class="table-header">
                                        <Button label="Ajouter un utilisateur" icon="pi pi-plus"
                                            @click="openAddDialog" />
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
                                                        @click="openDeleteDialog(slotProps.data)"
                                                        v-tooltip="'Supprimer'" />
                                                </div>
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </template>
                        </Card>
                    </div>

                    <!-- Locations Parameters -->
                    <div v-if="activeTab === 'locations'" class="tab-content">
                        <Card>
                            <template #content>
                                <TabView>
                                    <TabPanel header="Types de Caution" value="caution">
                                        <div class="table-header">
                                            <Button label="Ajouter" icon="pi pi-plus" size="small"
                                                @click="openAddParamDialog('caution_type')" />
                                        </div>
                                        <DataTable :value="getParametersByType('caution_type')" stripedRows size="small">
                                            <Column field="label" header="Libellé" sortable></Column>
                                            <Column field="value" header="Valeur (Code)" sortable></Column>
                                            <Column header="Actions" style="width: 8rem">
                                                <template #body="slotProps">
                                                    <div class="action-buttons">
                                                        <Button icon="pi pi-pencil" severity="secondary" text rounded
                                                            size="small" @click="openEditParamDialog(slotProps.data)" />
                                                        <Button icon="pi pi-trash" severity="danger" text rounded
                                                            size="small" @click="openDeleteParamDialog(slotProps.data)" />
                                                    </div>
                                                </template>
                                            </Column>
                                        </DataTable>
                                    </TabPanel>
                                    <TabPanel header="Types d'Anomalie" value="anomaly">
                                        <div class="table-header">
                                            <Button label="Ajouter" icon="pi pi-plus" size="small"
                                                @click="openAddParamDialog('anomaly_type')" />
                                        </div>
                                        <DataTable :value="getParametersByType('anomaly_type')" stripedRows size="small">
                                            <Column field="label" header="Libellé" sortable></Column>
                                            <Column field="value" header="Valeur (Code)" sortable></Column>
                                            <Column header="Actions" style="width: 8rem">
                                                <template #body="slotProps">
                                                    <div class="action-buttons">
                                                        <Button icon="pi pi-pencil" severity="secondary" text rounded
                                                            size="small" @click="openEditParamDialog(slotProps.data)" />
                                                        <Button icon="pi pi-trash" severity="danger" text rounded
                                                            size="small" @click="openDeleteParamDialog(slotProps.data)" />
                                                    </div>
                                                </template>
                                            </Column>
                                        </DataTable>
                                    </TabPanel>
                                </TabView>
                            </template>
                        </Card>
                    </div>

                    <!-- Payments Parameters -->
                    <div v-if="activeTab === 'payments'" class="tab-content">
                        <Card>
                            <template #content>
                                <div class="table-header">
                                    <h3>Modes de Règlement</h3>
                                    <Button label="Ajouter" icon="pi pi-plus" size="small"
                                        @click="openAddParamDialog('payment_method')" />
                                </div>
                                <DataTable :value="getParametersByType('payment_method')" stripedRows size="small">
                                    <Column field="label" header="Libellé" sortable></Column>
                                    <Column field="value" header="Valeur (Code)" sortable></Column>
                                    <Column header="Actions" style="width: 8rem">
                                        <template #body="slotProps">
                                            <div class="action-buttons">
                                                <Button icon="pi pi-pencil" severity="secondary" text rounded size="small"
                                                    @click="openEditParamDialog(slotProps.data)" />
                                                <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                                    @click="openDeleteParamDialog(slotProps.data)" />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>
                            </template>
                        </Card>
                    </div>

                    <!-- Expenses Parameters -->
                    <div v-if="activeTab === 'expenses'" class="tab-content">
                        <Card>
                            <template #content>
                                <TabView>
                                    <TabPanel header="Catégories" value="categories">
                                        <div class="table-header">
                                            <Button label="Ajouter" icon="pi pi-plus" size="small"
                                                @click="openAddParamDialog('expense_category')" />
                                        </div>
                                        <DataTable :value="getParametersByType('expense_category')" stripedRows
                                            size="small">
                                            <Column field="label" header="Libellé" sortable></Column>
                                            <Column field="value" header="Valeur (Code)" sortable></Column>
                                            <Column header="Actions" style="width: 8rem">
                                                <template #body="slotProps">
                                                    <div class="action-buttons">
                                                        <Button icon="pi pi-pencil" severity="secondary" text rounded
                                                            size="small" @click="openEditParamDialog(slotProps.data)" />
                                                        <Button icon="pi pi-trash" severity="danger" text rounded
                                                            size="small" @click="openDeleteParamDialog(slotProps.data)" />
                                                    </div>
                                                </template>
                                            </Column>
                                        </DataTable>
                                    </TabPanel>
                                    <TabPanel header="Types de Dépense" value="types">
                                        <div class="table-header">
                                            <Button label="Ajouter" icon="pi pi-plus" size="small"
                                                @click="openAddParamDialog('expense_type')" />
                                        </div>
                                        <DataTable :value="getParametersByType('expense_type')" stripedRows size="small">
                                            <Column field="label" header="Libellé" sortable></Column>
                                            <Column field="parentValue" header="Catégorie Parente" sortable>
                                                <template #body="slotProps">
                                                    <Tag
                                                        :value="getParentLabel(slotProps.data.parentValue, 'expense_category')" />
                                                </template>
                                            </Column>
                                            <Column field="value" header="Valeur (Code)" sortable></Column>
                                            <Column header="Actions" style="width: 8rem">
                                                <template #body="slotProps">
                                                    <div class="action-buttons">
                                                        <Button icon="pi pi-pencil" severity="secondary" text rounded
                                                            size="small" @click="openEditParamDialog(slotProps.data)" />
                                                        <Button icon="pi pi-trash" severity="danger" text rounded
                                                            size="small" @click="openDeleteParamDialog(slotProps.data)" />
                                                    </div>
                                                </template>
                                            </Column>
                                        </DataTable>
                                    </TabPanel>
                                </TabView>
                            </template>
                        </Card>
                    </div>

                    <!-- General Tab -->
                    <div v-if="activeTab === 'general'" class="tab-content">
                        <Card>
                            <template #title>Configuration Générale</template>
                            <template #content>
                                <div class="general-content">
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <label for="currency">Devise</label>
                                            <InputText id="currency" v-model="generalConfig.currency"
                                                placeholder="Ex: TND, EUR" />
                                            <small class="text-gray-500">Symbole monétaire utilisé dans
                                                l'application</small>
                                        </div>

                                        <div class="form-group">
                                            <label for="decimals">Décimales</label>
                                            <InputNumber id="decimals" v-model="generalConfig.decimals" :min="0"
                                                :max="4" showButtons />
                                            <small class="text-gray-500">Nombre de chiffres après la virgule (0-4)</small>
                                        </div>

                                        <div class="form-group">
                                            <label for="vatRate">Taux TVA (%)</label>
                                            <InputNumber id="vatRate" v-model="generalConfig.vatRate" :min="0"
                                                :max="100" suffix="%" :minFractionDigits="0" :maxFractionDigits="2" />
                                            <small class="text-gray-500">Taux de TVA par défaut</small>
                                        </div>

                                        <div class="form-group">
                                            <label for="stampDuty">Timbre Fiscal</label>
                                            <InputNumber id="stampDuty" v-model="generalConfig.stampDuty" :min="0"
                                                mode="currency" :currency="generalConfig.currency" locale="fr-TN"
                                                :minFractionDigits="generalConfig.decimals" />
                                            <small class="text-gray-500">Montant du timbre fiscal par défaut</small>
                                        </div>
                                    </div>

                                    <div class="flex justify-end mt-4">
                                        <Button label="Enregistrer" icon="pi pi-save" @click="saveGeneralSettings"
                                            :loading="configLoading" />
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </div>
                </div>
            </div>

            <!-- Dialog Ajout/Modification Utilisateur -->
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

            <!-- Dialog Suppression Utilisateur -->
            <Dialog v-model:visible="deleteDialogVisible" header="Confirmer la suppression" :modal="true"
                :style="{ width: '450px' }">
                <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ selectedUser?.displayName }}</strong> ?
                </p>
                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="deleteDialogVisible = false" text />
                    <Button label="Supprimer" severity="danger" @click="confirmDelete" :loading="loading" />
                </template>
            </Dialog>

            <!-- Dialog Ajout/Modification Paramètre -->
            <Dialog v-model:visible="paramDialogVisible"
                :header="isEditingParam ? 'Modifier le paramètre' : 'Ajouter un paramètre'" :modal="true"
                :closable="true" :style="{ width: '500px' }">
                <div class="dialog-content">
                    <div class="form-group">
                        <label for="paramLabel">Libellé *</label>
                        <InputText id="paramLabel" v-model="currentParam.label" class="w-full"
                            placeholder="Ex: Espèces" />
                    </div>

                    <div class="form-group">
                        <label for="paramValue">Valeur (Code)</label>
                        <InputText id="paramValue" v-model="currentParam.value" class="w-full"
                            placeholder="Généré automatiquement si vide" />
                        <small class="text-gray-500">Identifiant unique (ex: especes)</small>
                    </div>

                    <!-- Parent Category Selection for Expense Types -->
                    <div class="form-group" v-if="currentParam.type === 'expense_type'">
                        <label for="parentCategory">Catégorie Parente *</label>
                        <Dropdown id="parentCategory" v-model="currentParam.parentValue"
                            :options="getParametersByType('expense_category')" optionLabel="label" optionValue="value"
                            placeholder="Sélectionner une catégorie" class="w-full" />
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="closeParamDialog" text />
                    <Button :label="isEditingParam ? 'Modifier' : 'Ajouter'" @click="saveParameter"
                        :loading="loading" />
                </template>
            </Dialog>

            <!-- Dialog Suppression Paramètre -->
            <Dialog v-model:visible="deleteParamDialogVisible" header="Confirmer la suppression" :modal="true"
                :style="{ width: '450px' }">
                <p>Êtes-vous sûr de vouloir supprimer le paramètre <strong>{{ selectedParam?.label }}</strong> ?</p>
                <p class="text-red-500 text-sm">Attention : Cela peut affecter les enregistrements existants utilisant
                    ce paramètre.</p>
                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="deleteParamDialogVisible = false" text />
                    <Button label="Supprimer" severity="danger" @click="confirmDeleteParam" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.settings-layout {
    display: flex;
    min-height: calc(100vh - 64px);
    /* Adjust based on header height */
    background: #f8fafc;
}

/* Sidebar Styles */
.settings-sidebar {
    width: 250px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    transition: width 0.3s ease;
    flex-shrink: 0;
}

.settings-sidebar.collapsed {
    width: 64px;
}

.sidebar-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f1f5f9;
    height: 64px;
}

.settings-sidebar.collapsed .sidebar-header {
    justify-content: center;
    padding: 0.5rem;
}

.sidebar-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
    color: #1e293b;
    font-size: 1.125rem;
    white-space: nowrap;
}

.sidebar-title i {
    font-size: 1.25rem;
    color: #2563eb;
}

.sidebar-menu {
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    overflow: hidden;
}

.settings-sidebar.collapsed .menu-item {
    padding: 0.75rem;
    justify-content: center;
}

.menu-item:hover {
    background: #f1f5f9;
    color: #1e293b;
}

.menu-item.active {
    background: #eff6ff;
    color: #2563eb;
    border-right: 3px solid #2563eb;
}

.menu-item i {
    font-size: 1.25rem;
}

/* Content Styles */
.settings-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
}

.content-header {
    margin-bottom: 2rem;
}

.content-header h1 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
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
</style>
