import { addBrand } from '../services/brandService'

// Import des logos locaux
import mercedesLogo from '../assets/logos/mercedes.svg'
import bmwLogo from '../assets/logos/bmw.svg'
import volkswagenLogo from '../assets/logos/volkswagen.svg'
import audiLogo from '../assets/logos/audi.svg'
import kiaLogo from '../assets/logos/kia.svg'
import hyundaiLogo from '../assets/logos/hyundai.svg'
import seatLogo from '../assets/logos/seat.svg'
import skodaLogo from '../assets/logos/skoda.svg'
import peugeotLogo from '../assets/logos/peugeot.svg'
import citroenLogo from '../assets/logos/citroen.svg'
import fiatLogo from '../assets/logos/fiat.svg'
import renaultLogo from '../assets/logos/renault.svg'
import mgLogo from '../assets/logos/mg.svg'
import cheryLogo from '../assets/logos/chery.svg'
import toyotaLogo from '../assets/logos/toyota.svg'
import bydLogo from '../assets/logos/byd.svg'

const initialBrands = [
    { nom: 'Mercedes-Benz', logo: mercedesLogo },
    { nom: 'BMW', logo: bmwLogo },
    { nom: 'VW', logo: volkswagenLogo },
    { nom: 'Audi', logo: audiLogo },
    { nom: 'KIA', logo: kiaLogo },
    { nom: 'Hyundai', logo: hyundaiLogo },
    { nom: 'Seat', logo: seatLogo },
    { nom: 'Skoda', logo: skodaLogo },
    { nom: 'Peugeot', logo: peugeotLogo },
    { nom: 'Citroen', logo: citroenLogo },
    { nom: 'Fiat', logo: fiatLogo },
    { nom: 'Renault', logo: renaultLogo },
    { nom: 'MG', logo: mgLogo },
    { nom: 'Chery', logo: cheryLogo },
    { nom: 'Toyota', logo: toyotaLogo },
    { nom: 'BYD', logo: bydLogo },
]

export const initializeBrands = async () => {
    console.log('Initialisation des marques...')

    for (const brand of initialBrands) {
        try {
            await addBrand(brand)
            console.log(`✅ ${brand.nom} ajoutée`)
        } catch (error) {
            console.error(`❌ Erreur lors de l'ajout de ${brand.nom}:`, error)
        }
    }

    console.log('✅ Initialisation terminée!')
}
