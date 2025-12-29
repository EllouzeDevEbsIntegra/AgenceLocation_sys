<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import {
    getAllInvoices, getInvoiceLines, cancelInvoice, generateInvoiceNumber,
    createInvoice, calculateInvoiceTotals,
    type InvoiceHeader, type InvoiceLine
} from '../services/invoiceService'
import { getAllClients, type Client } from '../services/clientService'
import {
    getLocationsByClientAndStatus, updateLocationsBillingStatus,
    type Location
} from '../services/locationService'
import { getAllVehicles, type Vehicle } from '../services/vehicleService'
import { getAllModels, type Model } from '../services/modelService'
import { getAllBrands, type Brand } from '../services/brandService'
import MainLayout from '../layouts/MainLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

import { useAppConfig } from '../composables/useAppConfig'
const { config, loadConfig, formatCurrency } = useAppConfig()

const invoices = ref<InvoiceHeader[]>([])
const clients = ref<Client[]>([])
const vehicles = ref<Vehicle[]>([])
const models = ref<Model[]>([])
const brands = ref<Brand[]>([])
const loading = ref(false)
const detailsDialogVisible = ref(false)
const selectedInvoice = ref<InvoiceHeader | null>(null)
const selectedInvoiceLines = ref<InvoiceLine[]>([])

// Invoice creation dialog
const createDialogVisible = ref(false)
const selectedClientId = ref<string>('')
const availableLocations = ref<Location[]>([])
const selectedLocations = ref<Location[]>([])
const discounts = ref<Record<string, number>>({})

onMounted(async () => {
    await Promise.all([
        loadInvoices(),
        loadClients(),
        loadVehicles(),
        loadModels(),
        loadBrands(),
        loadConfig()
    ])
})

const loadInvoices = async () => {
    loading.value = true
    try {
        invoices.value = await getAllInvoices()
    } catch (error) {
        console.error('Error loading invoices:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les factures', life: 3000 })
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

const openInvoiceDetails = async (invoice: InvoiceHeader) => {
    selectedInvoice.value = invoice
    loading.value = true

    try {
        selectedInvoiceLines.value = await getInvoiceLines(invoice.id!)
        detailsDialogVisible.value = true
    } catch (error) {
        console.error('Error loading invoice lines:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les détails', life: 3000 })
    } finally {
        loading.value = false
    }
}

const printInvoice = () => {
    if (!selectedInvoice.value) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = generateInvoiceHTML()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
}

const printInvoiceDirectly = async (invoice: InvoiceHeader) => {
    selectedInvoice.value = invoice
    loading.value = true

    try {
        selectedInvoiceLines.value = await getInvoiceLines(invoice.id!)

        // Small delay to ensure data is loaded
        setTimeout(() => {
            const printWindow = window.open('', '_blank')
            if (!printWindow) return

            const htmlContent = generateInvoiceHTML()
            printWindow.document.write(htmlContent)
            printWindow.document.close()
            printWindow.print()
        }, 100)
    } catch (error) {
        console.error('Error loading invoice for print:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'imprimer la facture', life: 3000 })
    } finally {
        loading.value = false
    }
}

const generateInvoiceHTML = (): string => {
    if (!selectedInvoice.value) return ''

    const inv = selectedInvoice.value
    const lines = selectedInvoiceLines.value

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Facture ${inv.invoiceNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html {
                    height: 100%;
                }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    padding: 15mm;
                    font-size: 11pt;
                    line-height: 1.4;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .content-wrapper {
                    flex: 1;
                }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #1e3a8a;
                }
                .company-info h1 { 
                    color: #1e3a8a; 
                    font-size: 24pt;
                    font-weight: 700;
                    margin-bottom: 5px;
                }
                .company-info p { 
                    color: #64748b; 
                    font-size: 9pt;
                    margin: 2px 0;
                }
                .invoice-info { text-align: right; }
                .invoice-info .invoice-number {
                    background: #1e3a8a;
                    color: white;
                    padding: 8px 15px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 12pt;
                    margin-bottom: 8px;
                }
                .invoice-info .invoice-date {
                    color: #64748b;
                    font-size: 10pt;
                }
                
                .client-section {
                    background: #f8fafc;
                    padding: 12px 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    border-left: 4px solid #1e3a8a;
                }
                .client-section h3 {
                    color: #1e3a8a;
                    font-size: 10pt;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .client-section p {
                    color: #1e293b;
                    font-size: 11pt;
                    margin: 3px 0;
                }
                
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0;
                    font-size: 10pt;
                }
                thead {
                    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
                    color: white;
                }
                th { 
                    padding: 10px 8px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 9pt;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                td { 
                    padding: 8px;
                    border-bottom: 1px solid #e2e8f0;
                }
                tbody tr:hover {
                    background: #f8fafc;
                }
                tbody tr:last-child td {
                    border-bottom: 2px solid #1e3a8a;
                }
                td.align-right { text-align: right; }
                td.align-center { text-align: center; }
                
                .totals-section {
                    margin-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    gap: 15px;
                    align-items: flex-start;
                }
                .amount-in-words-box {
                    flex: 1;
                    max-width: 45%;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    background: #f8fafc;
                    padding: 15px;
                }
                .words-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .words-content em {
                    color: #64748b;
                    font-size: 9pt;
                    font-style: italic;
                }
                .words-text {
                    color: #1e293b;
                    font-size: 10pt;
                    font-weight: 500;
                    line-height: 1.5;
                }
                .totals-box {
                    flex: 1;
                    max-width: 50%;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .total-row { 
                    display: flex; 
                    justify-content: space-between; 
                    padding: 6px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 9.5pt;
                }
                .total-row:last-child {
                    border-bottom: none;
                }
                .total-row.subtotal {
                    background: #f8fafc;
                }
                .total-row .label { 
                    color: #64748b;
                }
                .total-row .value { 
                    font-weight: 600; 
                    color: #1e293b;
                    text-align: right;
                }
                .total-row.grand-total { 
                    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
                    color: white;
                    font-size: 12pt;
                    font-weight: 700;
                    padding: 10px 12px;
                }
                .total-row.grand-total .label,
                .total-row.grand-total .value {
                    color: white;
                }
                
                .footer {
                    margin-top: auto;
                    padding-top: 15px;
                    border-top: 2px solid #e2e8f0;
                    text-align: center;
                    color: #64748b;
                    font-size: 9pt;
                }
                
                @media print {
                    html, body { 
                        height: auto;
                        margin: 0;
                    }
                    body { 
                        padding: 10mm;
                        min-height: auto;
                    }
                    .footer { 
                        page-break-inside: avoid;
                        margin-top: 20mm;
                    }
                }
            </style>
        </head>
        <body>
            <div class="content-wrapper">
            <div class="header">
                <div class="company-info">
                    <h1>KEYS & GO</h1>
                    <p>Location de véhicules</p>
                    <p>Tunisie</p>
                </div>
                <div class="invoice-info">
                    <div class="invoice-number">FACTURE N° ${inv.invoiceNumber}</div>
                    <div class="invoice-date">Date: ${formatDate(inv.invoiceDate)}</div>
                </div>
            </div>
            
            <div class="client-section">
                <h3>Facturé à</h3>
                <p><strong>${inv.clientName}</strong></p>
                <p>CIN/Matricule Fiscal: ${inv.clientTaxId}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 50%;">Location</th>
                        <th style="text-align: center; width: 10%;">Qté</th>
                        <th style="text-align: right; width: 15%;">PU HT</th>
                        <th style="text-align: center; width: 10%;">Remise</th>
                        <th style="text-align: right; width: 15%;">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(line => `
                        <tr>
                            <td>
                                <div style="line-height: 1.5;">
                                    <div style="font-weight: 600; color: #1e293b;">${line.description} - ${line.vehicleRegistration}</div>
                                    <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">${line.vehicleBrandModel} - ${line.period}</div>
                                </div>
                            </td>
                            <td class="align-center">${line.quantity}</td>
                            <td class="align-right">${formatCurrency(line.unitPrice)}</td>
                            <td class="align-center">${line.discountPercent > 0 ? line.discountPercent + '%' : '-'}</td>
                            <td class="align-right"><strong>${formatCurrency(line.totalHT)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="amount-in-words-box">
                    <div class="words-content">
                        <em>Arrêtée la présente facture à la somme de:</em>
                        <div class="words-text">${numberToWords(inv.totalTTC)}</div>
                    </div>
                </div>
                
                <div class="totals-box">
                    ${inv.discountAmount > 0 ? `
                    <div class="total-row">
                        <span class="label">Sous-total HT:</span>
                        <span class="value">${formatCurrency(inv.subtotalHT)}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Remise:</span>
                        <span class="value">-${formatCurrency(inv.discountAmount)}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Base taxable:</span>
                        <span class="value">${formatCurrency(inv.taxableAmount)}</span>
                    </div>
                    ` : `
                    <div class="total-row">
                        <span class="label">Total HT:</span>
                        <span class="value">${formatCurrency(inv.subtotalHT)}</span>
                    </div>
                    `}
                    <div class="total-row">
                        <span class="label">TVA (${inv.tvaRate}%):</span>
                        <span class="value">${formatCurrency(inv.tvaAmount)}</span>
                    </div>
                    <div class="total-row">
                        <span class="label">Timbre fiscal:</span>
                        <span class="value">${formatCurrency(inv.timbreFiscal)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span class="label">NET À PAYER</span>
                        <span class="value">${formatCurrency(inv.totalTTC)}</span>
                    </div>
                </div>
            </div>
            </div>
            
            <div class="footer">
                <p>Merci pour votre confiance</p>
                <p>KEYS & GO - Location de véhicules en Tunisie</p>
            </div>
        </body>
        </html>
    `
}

const confirmCancelInvoice = (invoice: InvoiceHeader) => {
    confirm.require({
        message: `Voulez-vous vraiment annuler la facture ${invoice.invoiceNumber} ?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Oui',
        rejectLabel: 'Non',
        accept: () => handleCancelInvoice(invoice)
    })
}

const handleCancelInvoice = async (invoice: InvoiceHeader) => {
    if (!invoice.id) return

    loading.value = true
    try {
        await cancelInvoice(invoice.id)
        toast.add({ severity: 'success', summary: 'Succès', detail: 'Facture annulée', life: 3000 })
        await loadInvoices()
    } catch (error) {
        console.error('Error cancelling invoice:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'annuler la facture', life: 3000 })
    } finally {
        loading.value = false
    }
}

// Invoice creation functions
const openCreateDialog = () => {
    selectedClientId.value = ''
    availableLocations.value = []
    selectedLocations.value = []
    discounts.value = {}
    createDialogVisible.value = true
}

watch(selectedClientId, async (newClientId) => {
    if (!newClientId) {
        availableLocations.value = []
        selectedLocations.value = []
        return
    }

    loading.value = true
    try {
        availableLocations.value = await getLocationsByClientAndStatus(newClientId, 'Ouvert')
    } catch (error) {
        console.error('Error loading non-invoiced locations:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les locations', life: 3000 })
    } finally {
        loading.value = false
    }
})

const getVehicleInfo = (vehicleId: string): string => {
    const vehicle = vehicles.value.find(v => v.id === vehicleId)
    if (!vehicle) return 'N/A'
    const model = models.value.find(m => m.id === vehicle.modelId)
    const brand = brands.value.find(b => b.id === model?.brandId)
    return `${brand?.nom || ''} ${model?.nom || ''} - ${vehicle.immatriculation}`
}

const invoiceLines = computed(() => {
    return selectedLocations.value.map(location => {
        const vehicle = vehicles.value.find(v => v.id === location.vehicleId)
        const model = vehicle ? models.value.find(m => m.id === vehicle.modelId) : null
        const brand = model ? brands.value.find(b => b.id === model.brandId) : null

        const discountPercent = discounts.value[location.id || ''] || 0
        const subtotal = location.totalHT
        const discountAmount = subtotal * (discountPercent / 100)
        const totalHT = subtotal - discountAmount

        return {
            locationId: location.id || '',
            description: 'Location véhicule',
            period: `${formatDate(location.dateDebut)} - ${formatDate(location.dateFin)}`,
            vehicleRegistration: vehicle?.immatriculation || 'N/A',
            vehicleBrandModel: `${brand?.nom || ''} ${model?.nom || ''}`.trim(),
            quantity: location.nombreJours,
            unitPrice: location.prixUnitaireHT,
            discountPercent,
            discountAmount,
            totalHT
        }
    })
})

const totals = computed(() => {
    const subtotalHT = selectedLocations.value.reduce((sum, loc) => sum + loc.totalHT, 0)
    const discountAmount = invoiceLines.value.reduce((sum, line) => sum + line.discountAmount, 0)
    const taxableAmount = subtotalHT - discountAmount
    const tvaRate = config.value.vatRate
    const tvaAmount = taxableAmount * (tvaRate / 100)
    const totalTTC = taxableAmount + tvaAmount
    const timbreFiscal = config.value.stampDuty
    const netAPayer = totalTTC + timbreFiscal

    return {
        subtotalHT,
        discountAmount,
        taxableAmount,
        tvaRate,
        tvaAmount,
        totalTTC,
        timbreFiscal,
        netAPayer
    }
})

const validateInvoiceCreation = async () => {
    if (!selectedClientId.value) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner un client', life: 3000 })
        return
    }

    if (selectedLocations.value.length === 0) {
        toast.add({ severity: 'warn', summary: 'Attention', detail: 'Veuillez sélectionner au moins une location', life: 3000 })
        return
    }

    loading.value = true
    try {
        const client = clients.value.find(c => c.id === selectedClientId.value)
        if (!client) {
            toast.add({ severity: 'error', summary: 'Erreur', detail: 'Client introuvable', life: 3000 })
            return
        }

        const invoiceNumber = await generateInvoiceNumber()
        const clientName = client.typeClient === 'morale'
            ? (client.raisonSociale || client.nom)
            : `${client.nom} ${client.prenom}`
        const clientTaxId = client.typeClient === 'morale'
            ? (client.matriculeFiscale || 'N/A')
            : (client.numeroCIN || 'N/A')

        const lines: Omit<InvoiceLine, 'id' | 'invoiceId'>[] = invoiceLines.value

        const invoiceHeader: Omit<InvoiceHeader, 'id'> = {
            invoiceNumber,
            invoiceDate: new Date(),
            locationIds: selectedLocations.value.map(loc => loc.id || ''),
            clientId: selectedClientId.value,
            clientName,
            clientTaxId,
            subtotalHT: totals.value.subtotalHT,
            discountAmount: totals.value.discountAmount,
            taxableAmount: totals.value.taxableAmount,
            tvaRate: totals.value.tvaRate,
            tvaAmount: totals.value.tvaAmount,
            timbreFiscal: totals.value.timbreFiscal,
            totalTTC: totals.value.netAPayer,
            status: 'validated',
            paymentStatus: 'non_regle',
            paidAmount: 0,
            remainingAmount: totals.value.netAPayer,
            createdAt: new Date()
        }

        const invoiceId = await createInvoice(invoiceHeader, lines)

        // Update location statuses to "Facturé"
        await updateLocationsBillingStatus(
            selectedLocations.value.map(loc => loc.id || ''),
            'Facturé'
        )

        toast.add({
            severity: 'success',
            summary: 'Facture créée',
            detail: `Facture N° ${invoiceNumber} créée avec succès`,
            life: 5000
        })

        createDialogVisible.value = false
        await loadInvoices()

        // Load the newly created invoice and show print dialog
        const newInvoice = invoices.value.find(inv => inv.id === invoiceId)
        if (newInvoice) {
            await openInvoiceDetails(newInvoice)
            // Auto-trigger print
            setTimeout(() => printInvoice(), 500)
        }
    } catch (error) {
        console.error('Error creating invoice:', error)
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer la facture', life: 3000 })
    } finally {
        loading.value = false
    }
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR')
}



const numberToWords = (num: number): string => {
    if (num === 0) return 'zéro'

    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']

    const convert = (n: number): string => {
        if (n < 10) return ones[n]!
        if (n < 20) return teens[n - 10]!
        if (n < 100) {
            const ten = Math.floor(n / 10)
            const one = n % 10
            if (ten === 7 || ten === 9) {
                return tens[ten - 1] + '-' + teens[one]
            }
            return tens[ten] + (one ? '-' + ones[one] : '')
        }
        if (n < 1000) {
            const hundred = Math.floor(n / 100)
            const rest = n % 100
            return (hundred > 1 ? ones[hundred] + ' ' : '') + 'cent' + (rest ? ' ' + convert(rest) : '')
        }
        if (n < 1000000) {
            const thousand = Math.floor(n / 1000)
            const rest = n % 1000
            return (thousand > 1 ? convert(thousand) + ' ' : '') + 'mille' + (rest ? ' ' + convert(rest) : '')
        }
        const million = Math.floor(n / 1000000)
        const rest = n % 1000000
        return convert(million) + ' million' + (million > 1 ? 's' : '') + (rest ? ' ' + convert(rest) : '')
    }

    const integerPart = Math.floor(num)
    const decimalPart = Math.round((num - integerPart) * 1000)

    let result = convert(integerPart) + ' dinar' + (integerPart > 1 ? 's' : '')
    if (decimalPart > 0) {
        result += ' et ' + convert(decimalPart) + ' millime' + (decimalPart > 1 ? 's' : '')
    }
    return result
}

const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        'draft': 'Brouillon',
        'validated': 'Validée',
        'paid': 'Payée',
        'cancelled': 'Annulée'
    }
    return labels[status] || status
}

const getStatusSeverity = (status: string): 'secondary' | 'info' | 'success' | 'danger' => {
    const severities: Record<string, 'secondary' | 'info' | 'success' | 'danger'> = {
        'draft': 'secondary',
        'validated': 'info',
        'paid': 'success',
        'cancelled': 'danger'
    }
    return severities[status] || 'secondary'
}

const getPaymentStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
        'non_regle': 'Non réglé',
        'partiellement_regle': 'Partiel',
        'regle': 'Réglé'
    }
    return labels[status] || status
}

const getPaymentStatusSeverity = (status: string): 'danger' | 'warning' | 'success' => {
    const severities: Record<string, 'danger' | 'warning' | 'success'> = {
        'non_regle': 'danger',
        'partiellement_regle': 'warning',
        'regle': 'success'
    }
    return severities[status] || 'danger'
}
</script>

<template>
    <MainLayout>
        <div class="invoices-container">
            <div class="invoices-header page-header">
                <h1>Gestion des Factures</h1>
                <Button label="Ajouter une facture" icon="pi pi-plus" @click="openCreateDialog" />
            </div>

            <div class="invoices-content">
                <DataTable :value="invoices" :loading="loading" stripedRows paginator :rows="10"
                    :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 60rem">
                    <Column field="invoiceNumber" header="N° Facture" sortable style="min-width: 10rem"></Column>
                    <Column field="invoiceDate" header="Date" sortable>
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.invoiceDate) }}
                        </template>
                    </Column>
                    <Column field="clientName" header="Client" sortable style="min-width: 15rem"></Column>
                    <Column field="totalTTC" header="Montant TTC" sortable>
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.totalTTC) }}
                        </template>
                    </Column>
                    <Column field="paymentStatus" header="Règlement" sortable>
                        <template #body="slotProps">
                            <Tag :value="getPaymentStatusLabel(slotProps.data.paymentStatus || 'non_regle')"
                                :severity="getPaymentStatusSeverity(slotProps.data.paymentStatus || 'non_regle')" />
                        </template>
                    </Column>
                    <Column field="status" header="Statut" sortable>
                        <template #body="slotProps">
                            <Tag :value="getStatusLabel(slotProps.data.status)"
                                :severity="getStatusSeverity(slotProps.data.status)" />
                        </template>
                    </Column>
                    <Column header="Actions" style="width: 15rem">
                        <template #body="slotProps">
                            <div class="action-buttons">
                                <Button icon="pi pi-eye" severity="info" text rounded
                                    @click="openInvoiceDetails(slotProps.data)" title="Voir détails" />
                                <Button icon="pi pi-print" severity="success" text rounded
                                    @click="printInvoiceDirectly(slotProps.data)" title="Imprimer" />
                                <Button icon="pi pi-times" severity="danger" text rounded
                                    v-if="slotProps.data.status !== 'cancelled'"
                                    @click="confirmCancelInvoice(slotProps.data)" title="Annuler" />
                            </div>
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Dialog Détails Facture -->
            <Dialog v-model:visible="detailsDialogVisible" header="Détails de la facture" :modal="true"
                :style="{ width: '900px', maxHeight: '90vh' }" :contentStyle="{ overflow: 'auto' }">
                <div v-if="selectedInvoice" class="invoice-details">
                    <!-- Header -->
                    <div class="invoice-header-section">
                        <h2>Facture N° {{ selectedInvoice.invoiceNumber }}</h2>
                        <div class="invoice-info-grid">
                            <div class="info-item">
                                <label>Date:</label>
                                <span>{{ formatDate(selectedInvoice.invoiceDate) }}</span>
                            </div>
                            <div class="info-item">
                                <label>Client:</label>
                                <span>{{ selectedInvoice.clientName }}</span>
                            </div>
                            <div class="info-item">
                                <label>CIN/MF:</label>
                                <span>{{ selectedInvoice.clientTaxId }}</span>
                            </div>
                            <div class="info-item">
                                <label>Statut:</label>
                                <Tag :value="getStatusLabel(selectedInvoice.status)"
                                    :severity="getStatusSeverity(selectedInvoice.status)" />
                            </div>
                        </div>
                    </div>

                    <Divider />

                    <!-- Lignes de facture -->
                    <div class="invoice-lines-section">
                        <h3>Détails</h3>
                        <DataTable :value="selectedInvoiceLines" responsiveLayout="scroll">
                            <Column field="description" header="Description"></Column>
                            <Column field="period" header="Période" style="min-width: 12rem"></Column>
                            <Column header="Véhicule" style="min-width: 15rem">
                                <template #body="slotProps">
                                    {{ slotProps.data.vehicleRegistration }} - {{ slotProps.data.vehicleBrandModel }}
                                </template>
                            </Column>
                            <Column field="quantity" header="Qté"></Column>
                            <Column field="unitPrice" header="PU HT">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.unitPrice) }}
                                </template>
                            </Column>
                            <Column field="discountPercent" header="Remise">
                                <template #body="slotProps">
                                    {{ slotProps.data.discountPercent }}%
                                </template>
                            </Column>
                            <Column field="totalHT" header="Total HT">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.totalHT) }}
                                </template>
                            </Column>
                        </DataTable>
                    </div>

                    <Divider />

                    <!-- Totaux -->
                    <div class="invoice-totals-section">
                        <div class="totals-grid">
                            <div class="total-row">
                                <span class="label">Total HT:</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.subtotalHT) }}</span>
                            </div>
                            <div class="total-row">
                                <span class="label">Remise:</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.discountAmount) }}</span>
                            </div>
                            <div class="total-row">
                                <span class="label">Base taxable:</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.taxableAmount) }}</span>
                            </div>
                            <div class="total-row">
                                <span class="label">TVA ({{ selectedInvoice.tvaRate }}%):</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.tvaAmount) }}</span>
                            </div>
                            <div class="total-row">
                                <span class="label">Timbre fiscal:</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.timbreFiscal) }}</span>
                            </div>
                            <div class="total-row grand-total">
                                <span class="label">Total TTC:</span>
                                <span class="value">{{ formatCurrency(selectedInvoice.totalTTC) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Fermer" severity="secondary" @click="detailsDialogVisible = false" text />
                    <Button label="Imprimer" icon="pi pi-print" @click="printInvoice" />
                </template>
            </Dialog>

            <!-- Dialog Création Facture -->
            <Dialog v-model:visible="createDialogVisible" header="Créer une facture" :modal="true"
                :style="{ width: '1100px', maxHeight: '90vh' }" :contentStyle="{ overflow: 'auto' }">
                <div class="create-invoice-content">
                    <!-- Client Selection -->
                    <div class="form-group">
                        <label for="clientSelect">Client *</label>
                        <Dropdown id="clientSelect" v-model="selectedClientId" :options="clients"
                            :optionLabel="(client) => client.typeClient === 'morale' ? client.raisonSociale : `${client.nom} ${client.prenom}`"
                            optionValue="id" placeholder="Sélectionnez un client" class="w-full" filter />
                    </div>

                    <Divider />

                    <!-- Locations Selection -->
                    <div v-if="selectedClientId" class="locations-section">
                        <h3>Locations non facturées</h3>
                        <DataTable v-model:selection="selectedLocations" :value="availableLocations"
                            selectionMode="multiple" :metaKeySelection="false" dataKey="id" responsiveLayout="scroll"
                            :loading="loading">
                            <Column selectionMode="multiple" style="width: 3rem"></Column>
                            <Column field="dateDebut" header="Date début" sortable>
                                <template #body="slotProps">
                                    {{ formatDate(slotProps.data.dateDebut) }}
                                </template>
                            </Column>
                            <Column field="dateFin" header="Date fin" sortable>
                                <template #body="slotProps">
                                    {{ formatDate(slotProps.data.dateFin) }}
                                </template>
                            </Column>
                            <Column field="vehicleId" header="Véhicule" sortable>
                                <template #body="slotProps">
                                    {{ getVehicleInfo(slotProps.data.vehicleId) }}
                                </template>
                            </Column>
                            <Column field="nombreJours" header="Jours" sortable></Column>
                            <Column field="prixUnitaireHT" header="Prix Unit. HT" sortable>
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.prixUnitaireHT) }}
                                </template>
                            </Column>
                            <Column field="totalHT" header="Total HT" sortable>
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.totalHT) }}
                                </template>
                            </Column>
                        </DataTable>

                        <p v-if="availableLocations.length === 0" class="no-locations">
                            Aucune location non facturée pour ce client.
                        </p>
                    </div>

                    <Divider v-if="selectedLocations.length > 0" />

                    <!-- Selected Locations with Discounts -->
                    <div v-if="selectedLocations.length > 0" class="selected-locations-section">
                        <h3>Lignes de facturation ({{ selectedLocations.length }})</h3>
                        <DataTable :value="selectedLocations" responsiveLayout="scroll">
                            <Column field="vehicleId" header="Véhicule" style="min-width: 15rem">
                                <template #body="slotProps">
                                    {{ getVehicleInfo(slotProps.data.vehicleId) }}
                                </template>
                            </Column>
                            <Column header="Période" style="min-width: 12rem">
                                <template #body="slotProps">
                                    {{ formatDate(slotProps.data.dateDebut) }} - {{ formatDate(slotProps.data.dateFin)
                                    }}
                                </template>
                            </Column>
                            <Column field="nombreJours" header="Jours"></Column>
                            <Column field="prixUnitaireHT" header="PU HT">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.prixUnitaireHT) }}
                                </template>
                            </Column>
                            <Column field="totalHT" header="Total HT">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.totalHT) }}
                                </template>
                            </Column>
                            <Column header="Remise (%)" style="width: 120px">
                                <template #body="slotProps">
                                    <InputNumber v-model="discounts[slotProps.data.id]" :min="0" :max="100" suffix="%"
                                        class="w-full" size="small" />
                                </template>
                            </Column>
                            <Column header="Total Ligne">
                                <template #body="slotProps">
                                    {{
                                        formatCurrency(
                                            invoiceLines.find(l => l.locationId === slotProps.data.id)?.totalHT || 0
                                        )
                                    }}
                                </template>
                            </Column>
                        </DataTable>

                        <!-- Totals Footer -->
                        <div class="invoice-totals-footer">
                            <div class="totals-grid">
                                <div class="total-row">
                                    <span class="label">Somme des lignes HT:</span>
                                    <span class="value">{{ formatCurrency(totals.subtotalHT) }}</span>
                                </div>
                                <div class="total-row">
                                    <span class="label">Remise:</span>
                                    <span class="value">{{ formatCurrency(totals.discountAmount) }}</span>
                                </div>
                                <div class="total-row">
                                    <span class="label">Base taxable (HT):</span>
                                    <span class="value">{{ formatCurrency(totals.taxableAmount) }}</span>
                                </div>
                                <div class="total-row">
                                    <span class="label">TVA ({{ totals.tvaRate }}%):</span>
                                    <span class="value">{{ formatCurrency(totals.tvaAmount) }}</span>
                                </div>
                                <div class="total-row">
                                    <span class="label">TTC:</span>
                                    <span class="value">{{ formatCurrency(totals.totalTTC) }}</span>
                                </div>
                                <div class="total-row">
                                    <span class="label">Timbre fiscal:</span>
                                    <span class="value">{{ formatCurrency(totals.timbreFiscal) }}</span>
                                </div>
                                <div class="total-row grand-total">
                                    <span class="label">Net à payer:</span>
                                    <span class="value">{{ formatCurrency(totals.netAPayer) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Annuler" severity="secondary" @click="createDialogVisible = false" text />
                    <Button label="Créer la facture" icon="pi pi-check" @click="validateInvoiceCreation"
                        :disabled="selectedLocations.length === 0" :loading="loading" />
                </template>
            </Dialog>
        </div>
    </MainLayout>
</template>

<style scoped>
.invoices-container {
    background: #f8fafc;
    padding: 2rem;
    min-height: calc(100vh - 80px);
}

.invoices-header h1 {
    margin: 0;
}

.invoices-content {
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

.invoice-details {
    padding: 1rem 0;
}

.invoice-header-section {
    margin-bottom: 1.5rem;
}

.invoice-header-section h2 {
    color: #1e3a8a;
    margin: 0 0 1rem 0;
}

.invoice-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.info-item label {
    font-weight: 600;
    color: #64748b;
    font-size: 0.875rem;
}

.info-item span {
    font-size: 1rem;
    color: #1e293b;
}

.invoice-lines-section h3 {
    color: #1e293b;
    margin: 0 0 1rem 0;
}

.invoice-totals-section {
    display: flex;
    justify-content: flex-end;
}

.totals-grid {
    width: 350px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    background: #f8fafc;
}

.total-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
}

.total-row:last-child {
    border-bottom: none;
}

.total-row.grand-total {
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 2px solid #1e3a8a;
    font-weight: 700;
    font-size: 1.1rem;
    color: #1e3a8a;
}

.total-row .label {
    color: #64748b;
}

.total-row .value {
    font-weight: 600;
    color: #1e293b;
}

:deep(.p-datatable) {
    font-size: 0.95rem;
}

/* Invoice Creation Dialog */
.create-invoice-content {
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

.locations-section h3,
.selected-locations-section h3 {
    color: #1e293b;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
}

.no-locations {
    text-align: center;
    color: #64748b;
    padding: 2rem;
    font-style: italic;
}

.invoice-totals-footer {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
}

.invoices-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.invoices-header h1 {
    margin: 0;
}
</style>
