<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import { useUserRole } from '../services/userRoleService'

const router = useRouter()
const userEmail = ref('')
const { isAdmin, loadCurrentUserRole } = useUserRole()

const menuItems = ref([
    {
        label: 'Dashboard',
        icon: 'pi pi-home',
        command: () => router.push('/')
    },
    {
        label: 'Clients',
        icon: 'pi pi-users',
        command: () => router.push('/clients')
    },
    {
        label: 'Locations',
        icon: 'pi pi-calendar',
        items: [
            {
                label: 'Liste des locations',
                icon: 'pi pi-list',
                command: () => router.push('/locations')
            },
            {
                label: 'Calendrier',
                icon: 'pi pi-calendar-plus',
                command: () => router.push('/locations/calendar')
            }
        ]
    },
    {
        label: 'Factures',
        icon: 'pi pi-receipt',
        command: () => router.push('/invoices')
    },
    {
        label: 'Règlements',
        icon: 'pi pi-wallet',
        items: [
            {
                label: 'Tous les règlements',
                icon: 'pi pi-list',
                command: () => router.push('/payments')
            },
            {
                label: 'Échéancier',
                icon: 'pi pi-calendar-clock',
                command: () => router.push('/treasury')
            }
        ]
    },
    {
        label: 'Dépenses',
        icon: 'pi pi-money-bill',
        command: () => router.push('/expenses')
    },
    {
        label: 'Véhicules',
        icon: 'pi pi-car',
        items: [
            {
                label: 'Marques',
                icon: 'pi pi-tag',
                command: () => router.push('/brands')
            },
            {
                label: 'Modèles',
                icon: 'pi pi-list',
                command: () => router.push('/models')
            },
            {
                label: 'Parc',
                icon: 'pi pi-building',
                command: () => router.push('/vehicles')
            }
        ]
    }
])

onMounted(async () => {
    if (auth.currentUser) {
        userEmail.value = auth.currentUser.email || 'Utilisateur'
        await loadCurrentUserRole()
    }
})

const handleLogout = async () => {
    try {
        await signOut(auth)
        router.push('/login')
    } catch (err) {
        console.error('Logout error:', err)
    }
}
</script>

<template>
    <div class="app-layout">
        <!-- Navbar -->
        <header class="app-header">
            <div class="header-content">
                <div class="brand-section">
                    <i class="pi pi-car brand-icon"></i>
                    <h1 class="brand-name">KEYS & GO</h1>
                </div>

                <div class="menu-section">
                    <Menubar :model="menuItems" class="custom-menubar">
                        <template #item="{ item, props, hasSubmenu, root }">
                            <a v-bind="props.action" class="flex align-items-center p-menuitem-link"
                                :class="root ? 'root-menu-item' : 'sub-menu-item'">
                                <span :class="[item.icon, 'p-menuitem-icon']" />
                                <span class="ml-2">{{ item.label }}</span>
                                <i v-if="hasSubmenu" class="pi pi-angle-down ml-2 p-submenu-icon"></i>
                            </a>
                        </template>
                        <template #end>
                            <div class="header-actions">
                                <div class="user-info">
                                    <i class="pi pi-user"></i>
                                    <span>{{ userEmail }}</span>
                                </div>
                                <Button v-if="isAdmin" icon="pi pi-cog" @click="$router.push('/settings')"
                                    class="settings-button" text rounded title="Paramètres" />
                                <Button label="Déconnexion" icon="pi pi-sign-out" severity="danger" size="small"
                                    @click="handleLogout" />
                            </div>
                        </template>
                    </Menubar>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="app-main">
            <slot />
        </main>
    </div>
</template>

<style scoped>
.app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
}

.app-header {
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    display: flex;
    align-items: center;
    padding: 0.5rem 2rem;
    gap: 2rem;
}

.brand-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    white-space: nowrap;
}

.brand-icon {
    font-size: 2rem;
    color: white;
}

.brand-name {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0;
    color: white;
}

.menu-section {
    flex: 1;
}

:deep(.custom-menubar) {
    background: transparent;
    border: none;
    padding: 0;
}

:deep(.custom-menubar .p-menubar-root-list) {
    gap: 0.5rem;
}

:deep(.custom-menubar .p-menuitem-link) {
    color: white !important;
    border-radius: 8px;
    padding: 0.75rem 1rem;
}

:deep(.custom-menubar .p-menuitem-link:hover) {
    background: rgba(255, 255, 255, 0.1);
}

:deep(.custom-menubar .p-menuitem-icon) {
    color: white !important;
}

:deep(.custom-menubar .p-submenu-icon) {
    color: white !important;
}

:deep(.custom-menubar .p-menuitem-text) {
    color: white !important;
}

:deep(.custom-menubar .p-menuitem-link .p-menuitem-text) {
    color: white !important;
}

/* Submenu items */
:deep(.custom-menubar .p-submenu-list .p-menuitem-link) {
    color: #1e293b !important;
}

:deep(.custom-menubar .p-submenu-list .p-menuitem-text) {
    color: #1e293b !important;
}

:deep(.custom-menubar .p-submenu-list .p-menuitem-icon) {
    color: #64748b !important;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-weight: 500;
    color: white;
}

.settings-button {
    color: white !important;
}

.settings-button:hover {
    background: rgba(255, 255, 255, 0.1) !important;
}

.user-info i {
    font-size: 1.125rem;
}

.app-main {
    flex: 1;
}

/* Responsive */
@media (max-width: 968px) {
    .header-content {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
    }

    .brand-section {
        width: 100%;
        justify-content: center;
    }

    .menu-section {
        width: 100%;
    }

    .user-info span {
        display: none;
    }
}

/* Custom Menu Styles */
.root-menu-item {
    color: white !important;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    transition: background-color 0.2s;
    text-decoration: none;
    cursor: pointer;
}

.root-menu-item:hover {
    background-color: white;
    color: #1e40af !important;
}

/* Keep root item active when hovering submenu (parent li hover) */
/* Using descendant selector (space) instead of child (>) for maximum robustness */
:deep(.p-menubar-root-list > .p-menuitem:hover) .root-menu-item,
:deep(.p-menubar-root-list > .p-menuitem.p-menuitem-active) .root-menu-item,
:deep(.p-menubar-root-list > .p-menuitem.p-highlight) .root-menu-item {
    background-color: white !important;
    color: #1e40af !important;
}

/* Force ALL children to be blue when parent LI is hovered/active */
:deep(.p-menubar-root-list > .p-menuitem:hover) .root-menu-item *,
:deep(.p-menubar-root-list > .p-menuitem.p-menuitem-active) .root-menu-item *,
:deep(.p-menubar-root-list > .p-menuitem.p-highlight) .root-menu-item * {
    color: #1e40af !important;
}

.sub-menu-item {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    cursor: pointer;
}

.sub-menu-item,
.sub-menu-item span,
.sub-menu-item .p-menuitem-text {
    color: #64748b !important;
}

.sub-menu-item:hover {
    background-color: #f1f5f9;
}

.sub-menu-item:hover,
.sub-menu-item:hover span,
.sub-menu-item:hover .p-menuitem-text {
    color: #1e40af !important;
}

.sub-menu-item .p-menuitem-icon,
.sub-menu-item .p-submenu-icon {
    color: #64748b !important;
}

.sub-menu-item:hover .p-menuitem-icon,
.sub-menu-item:hover .p-submenu-icon {
    color: #1e40af !important;
}

/* Ensure submenu panel has correct background */
:deep(.custom-menubar .p-submenu-list) {
    background: white !important;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 0.5rem;
    border-radius: 8px;
}
</style>
