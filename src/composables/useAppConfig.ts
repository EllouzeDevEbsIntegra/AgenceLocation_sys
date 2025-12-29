import { ref, computed } from 'vue'
import { getGeneralConfig, CONFIG_KEYS } from '../services/parameterService'

// Global state
const config = ref({
    currency: 'TND',
    decimals: 3,
    vatRate: 19,
    stampDuty: 1.000
})

const loaded = ref(false)
const loading = ref(false)

export function useAppConfig() {

    const loadConfig = async (force = false) => {
        if (loaded.value && !force) return

        loading.value = true
        try {
            const data = await getGeneralConfig()

            if (data[CONFIG_KEYS.CURRENCY]) config.value.currency = data[CONFIG_KEYS.CURRENCY] as string
            if (data[CONFIG_KEYS.DECIMALS]) config.value.decimals = parseInt(data[CONFIG_KEYS.DECIMALS] as string)
            if (data[CONFIG_KEYS.VAT_RATE]) config.value.vatRate = parseFloat(data[CONFIG_KEYS.VAT_RATE] as string)
            if (data[CONFIG_KEYS.STAMP_DUTY]) config.value.stampDuty = parseFloat(data[CONFIG_KEYS.STAMP_DUTY] as string)

            loaded.value = true
        } catch (error) {
            console.error('Error loading app config:', error)
        } finally {
            loading.value = false
        }
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) {
            return new Intl.NumberFormat('fr-TN', {
                style: 'currency',
                currency: config.value.currency,
                minimumFractionDigits: config.value.decimals,
                maximumFractionDigits: config.value.decimals
            }).format(0)
        }
        return new Intl.NumberFormat('fr-TN', {
            style: 'currency',
            currency: config.value.currency,
            minimumFractionDigits: config.value.decimals,
            maximumFractionDigits: config.value.decimals
        }).format(value)
    }

    return {
        config: computed(() => config.value),
        loading: computed(() => loading.value),
        loadConfig,
        formatCurrency
    }
}
