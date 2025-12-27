import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import BrandsView from '../views/BrandsView.vue'
import ModelsView from '../views/ModelsView.vue'
import VehiclesView from '../views/VehiclesView.vue'
import ClientsView from '../views/ClientsView.vue'
import LocationsView from '../views/LocationsView.vue'
import CalendarView from '../views/CalendarView.vue'
import SettingsView from '../views/SettingsView.vue'
import InvoicesView from '../views/InvoicesView.vue'
import { auth } from '../firebase'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginView,
        },
        {
            path: '/',
            name: 'dashboard',
            component: DashboardView,
            meta: { requiresAuth: true },
        },
        {
            path: '/brands',
            name: 'brands',
            component: BrandsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/models',
            name: 'models',
            component: ModelsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/vehicles',
            name: 'vehicles',
            component: VehiclesView,
            meta: { requiresAuth: true },
        },
        {
            path: '/clients',
            name: 'clients',
            component: ClientsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/locations',
            name: 'locations',
            component: LocationsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/locations/calendar',
            name: 'locations-calendar',
            component: CalendarView,
            meta: { requiresAuth: true },
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            meta: { requiresAuth: true },
        },
        {
            path: '/invoices',
            name: 'invoices',
            component: InvoicesView,
            meta: { requiresAuth: true },
        },
        {
            path: '/payments',
            name: 'payments',
            component: () => import('../views/PaymentsView.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/treasury',
            name: 'treasury',
            component: () => import('../views/TreasuryScheduleView.vue'),
            meta: { requiresAuth: true },
        },
    ],
})

// Auth guard
router.beforeEach(async (to, from, next) => {
    const currentUser = auth.currentUser

    if (to.meta.requiresAuth && !currentUser) {
        // Si la route nécessite l'authentification et l'utilisateur n'est pas connecté
        next('/login')
    } else if (to.path === '/login' && currentUser) {
        // Si l'utilisateur est déjà connecté et essaie d'accéder au login
        next('/')
    } else if (to.path === '/settings') {
        // Protection spéciale pour /settings - vérifier le rôle admin
        if (!currentUser) {
            next('/login')
            return
        }

        // Charger le rôle de l'utilisateur
        const { loadCurrentUserRole, isAdmin } = await import('../services/userRoleService').then(m => m.useUserRole())
        await loadCurrentUserRole()

        if (!isAdmin.value) {
            // Si l'utilisateur n'est pas admin, rediriger vers dashboard
            next('/')
        } else {
            next()
        }
    } else {
        next()
    }
})

export default router
