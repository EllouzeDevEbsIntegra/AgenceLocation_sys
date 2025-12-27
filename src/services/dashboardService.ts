import { getAllInvoices, type InvoiceHeader } from './invoiceService'
import { getAllLocations, type Location } from './locationService'
import { getAllVehicles, type Vehicle } from './vehicleService'
import { getAllClients, type Client } from './clientService'
import { getAllModels, type Model } from './modelService'
import { getAllBrands, type Brand } from './brandService'

export interface DashboardFilter {
    startDate?: Date
    endDate?: Date
    vehicleId?: string
    clientId?: string
    brandId?: string
}

export interface DashboardStats {
    // Financials
    totalRevenue: number // TTC of paid/validated invoices
    pendingRevenue: number // Estimated revenue of completed but not invoiced rentals
    unpaidAmount: number // Remaining amount on validated invoices
    cashIn: number // Actual paid amount

    // Operations
    activeRentals: number
    occupancyRate: number
    avgDailyRate: number
    avgRentalDuration: number

    // Fleet
    totalVehicles: number
    availableVehicles: number
    maintenanceVehicles: number
}

export interface ChartData {
    labels: string[]
    datasets: {
        label: string
        data: number[]
        backgroundColor?: string | string[]
        borderColor?: string | string[]
        borderWidth?: number
        fill?: boolean
        tension?: number
        type?: string
    }[]
}

export interface TopPerformer {
    id: string
    name: string
    revenue: number
    count: number
    secondaryText?: string
}

// Helper to determine rental status
const getRentalStatus = (loc: Location): 'planifiee' | 'en_cours' | 'terminee' => {
    const now = new Date()
    const start = new Date(loc.dateDebut)
    const end = new Date(loc.dateFin)

    if (now < start) return 'planifiee'
    if (now >= start && now <= end) return 'en_cours'
    return 'terminee'
}

export const getDashboardStats = async (filter: DashboardFilter): Promise<DashboardStats> => {
    const [invoices, locations, vehicles] = await Promise.all([
        getAllInvoices(),
        getAllLocations(),
        getAllVehicles()
    ])

    // Filter Data
    const filteredLocations = filterLocations(locations, filter)
    const filteredInvoices = filterInvoices(invoices, filter)

    // 1. Financials
    const totalRevenue = filteredInvoices
        .filter(inv => inv.status === 'paid' || inv.status === 'validated')
        .reduce((sum, inv) => sum + inv.totalTTC, 0)

    const unpaidAmount = filteredInvoices
        .filter(inv => inv.status === 'validated')
        .reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0)

    const cashIn = filteredInvoices
        .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0)

    // Pending Revenue (Completed rentals not yet invoiced)
    const pendingRevenue = filteredLocations
        .filter(loc => getRentalStatus(loc) === 'terminee' && loc.statutFacturation !== 'Facturé')
        .reduce((sum, loc) => sum + loc.totalTTC, 0)

    // 2. Operations
    const activeRentals = locations.filter(loc => getRentalStatus(loc) === 'en_cours').length

    // Occupancy Rate
    const totalVehicles = vehicles.length
    // Calculate vehicle status dynamically
    const rentedVehicleIds = new Set(locations.filter(loc => getRentalStatus(loc) === 'en_cours').map(l => l.vehicleId))
    const availableVehicles = vehicles.filter(v => v.actif && !rentedVehicleIds.has(v.id || '')).length
    const maintenanceVehicles = vehicles.filter(v => !v.actif).length // Assuming inactive = maintenance/unavailable

    const occupancyRate = totalVehicles > 0
        ? ((totalVehicles - availableVehicles - maintenanceVehicles) / totalVehicles) * 100
        : 0

    // Averages
    const avgDailyRate = filteredLocations.length > 0
        ? filteredLocations.reduce((sum, loc) => sum + loc.prixUnitaireHT, 0) / filteredLocations.length
        : 0

    const avgRentalDuration = filteredLocations.length > 0
        ? filteredLocations.reduce((sum, loc) => sum + loc.nombreJours, 0) / filteredLocations.length
        : 0

    return {
        totalRevenue,
        pendingRevenue,
        unpaidAmount,
        cashIn,
        activeRentals,
        occupancyRate: Math.round(occupancyRate),
        avgDailyRate: Math.round(avgDailyRate),
        avgRentalDuration: Math.round(avgRentalDuration),
        totalVehicles,
        availableVehicles,
        maintenanceVehicles
    }
}

export const getRevenueChartData = async (filter: DashboardFilter): Promise<ChartData> => {
    const invoices = await getAllInvoices()
    const filteredInvoices = filterInvoices(invoices, filter)

    // Group by month (or day if range is small)
    // Default to last 6 months if no date filter
    const months: string[] = []
    const revenue: number[] = []
    const count: number[] = []

    const endDate = filter.endDate || new Date()
    const startDate = filter.startDate || new Date(new Date().setMonth(endDate.getMonth() - 5))

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // If range < 32 days, show daily. Else show monthly.
    const isDaily = diffDays < 32

    if (isDaily) {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            months.push(label)

            const daysInvoices = filteredInvoices.filter(inv => {
                const invDate = new Date(inv.invoiceDate)
                return invDate.getDate() === d.getDate() &&
                    invDate.getMonth() === d.getMonth() &&
                    invDate.getFullYear() === d.getFullYear()
            })

            revenue.push(daysInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0))
            count.push(daysInvoices.length)
        }
    } else {
        // Monthly
        let d = new Date(startDate)
        d.setDate(1) // Start at beginning of month

        while (d <= endDate) {
            const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
            months.push(label)

            const monthInvoices = filteredInvoices.filter(inv => {
                const invDate = new Date(inv.invoiceDate)
                return invDate.getMonth() === d.getMonth() &&
                    invDate.getFullYear() === d.getFullYear()
            })

            revenue.push(monthInvoices.reduce((sum, inv) => sum + inv.totalTTC, 0))
            count.push(monthInvoices.length)

            d.setMonth(d.getMonth() + 1)
        }
    }

    return {
        labels: months,
        datasets: [
            {
                label: 'Chiffre d\'affaires (TND)',
                data: revenue,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                type: 'line'
            },
            {
                label: 'Nombre de factures',
                data: count,
                backgroundColor: '#94a3b8',
                type: 'bar'
            }
        ]
    }
}

export const getVehicleStatusData = async (): Promise<ChartData> => {
    const [vehicles, locations] = await Promise.all([
        getAllVehicles(),
        getAllLocations()
    ])

    const rentedVehicleIds = new Set(locations.filter(loc => getRentalStatus(loc) === 'en_cours').map(l => l.vehicleId))

    const available = vehicles.filter(v => v.actif && !rentedVehicleIds.has(v.id || '')).length
    const rented = vehicles.filter(v => rentedVehicleIds.has(v.id || '')).length
    const maintenance = vehicles.filter(v => !v.actif).length

    return {
        labels: ['Disponible', 'Loué', 'Maintenance'],
        datasets: [
            {
                label: 'État du parc',
                data: [available, rented, maintenance],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                borderColor: ['#ffffff', '#ffffff', '#ffffff'],
                borderWidth: 2
            }
        ]
    }
}

export const getBillingStatusData = async (filter: DashboardFilter): Promise<ChartData> => {
    const locations = await getAllLocations()
    const filtered = filterLocations(locations, filter)

    const billed = filtered.filter(l => l.statutFacturation === 'Facturé').length
    const notBilled = filtered.filter(l => l.statutFacturation === 'Ouvert').length

    return {
        labels: ['Facturé', 'Non Facturé'],
        datasets: [
            {
                label: 'État Facturation',
                data: [billed, notBilled],
                backgroundColor: ['#10b981', '#ef4444'],
                borderColor: ['#ffffff', '#ffffff'],
                borderWidth: 2
            }
        ]
    }
}

export const getTopPerformers = async (filter: DashboardFilter): Promise<{ vehicles: TopPerformer[], clients: TopPerformer[] }> => {
    const [locations, vehicles, clients, models, brands] = await Promise.all([
        getAllLocations(),
        getAllVehicles(),
        getAllClients(),
        getAllModels(),
        getAllBrands()
    ])

    const filteredLocs = filterLocations(locations, filter)

    // Top Vehicles
    const vehicleMap = new Map<string, { revenue: number, count: number }>()
    filteredLocs.forEach(loc => {
        if (!loc.vehicleId) return
        const current = vehicleMap.get(loc.vehicleId) || { revenue: 0, count: 0 }
        vehicleMap.set(loc.vehicleId, {
            revenue: current.revenue + loc.totalTTC,
            count: current.count + 1
        })
    })

    const topVehicles = Array.from(vehicleMap.entries())
        .map(([id, stats]) => {
            const v = vehicles.find(v => v.id === id)
            let name = 'Inconnu'
            if (v) {
                const model = models.find(m => m.id === v.modelId)
                const brand = model ? brands.find(b => b.id === model.brandId) : null
                name = `${brand?.nom || ''} ${model?.nom || ''} (${v.immatriculation})`
            }
            return {
                id,
                name,
                revenue: stats.revenue,
                count: stats.count,
                secondaryText: `${stats.count} locations`
            }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    // Top Clients
    const clientMap = new Map<string, { revenue: number, count: number }>()
    filteredLocs.forEach(loc => {
        if (!loc.clientId) return
        const current = clientMap.get(loc.clientId) || { revenue: 0, count: 0 }
        clientMap.set(loc.clientId, {
            revenue: current.revenue + loc.totalTTC,
            count: current.count + 1
        })
    })

    const topClients = Array.from(clientMap.entries())
        .map(([id, stats]) => {
            const c = clients.find(c => c.id === id)
            const name = c ? (c.typeClient === 'morale' ? c.raisonSociale : `${c.nom} ${c.prenom}`) : 'Inconnu'
            return {
                id,
                name: name || 'Client Inconnu',
                revenue: stats.revenue,
                count: stats.count,
                secondaryText: `${stats.count} locations`
            }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    return { vehicles: topVehicles, clients: topClients }
}

// Helper Functions
const filterLocations = (locations: Location[], filter: DashboardFilter): Location[] => {
    return locations.filter(loc => {
        const dateMatch = (!filter.startDate || new Date(loc.dateDebut) >= filter.startDate) &&
            (!filter.endDate || new Date(loc.dateDebut) <= filter.endDate)
        const vehicleMatch = !filter.vehicleId || loc.vehicleId === filter.vehicleId
        const clientMatch = !filter.clientId || loc.clientId === filter.clientId

        return dateMatch && vehicleMatch && clientMatch
    })
}

const filterInvoices = (invoices: InvoiceHeader[], filter: DashboardFilter): InvoiceHeader[] => {
    return invoices.filter(inv => {
        const dateMatch = (!filter.startDate || new Date(inv.invoiceDate) >= filter.startDate) &&
            (!filter.endDate || new Date(inv.invoiceDate) <= filter.endDate)
        const clientMatch = !filter.clientId || inv.clientId === filter.clientId

        return dateMatch && clientMatch
    })
}
