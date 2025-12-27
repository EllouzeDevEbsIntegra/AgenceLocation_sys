<script setup lang="ts">
import MainLayout from '../layouts/MainLayout.vue'
</script>

<template>
    <MainLayout>
        <div class="dashboard-content">
            <div class="welcome-section">
                <div class="welcome-card">
                    <i class="pi pi-check-circle success-icon"></i>
                    <h2>Connexion réussie !</h2>
                    <p>Vous êtes connecté avec succès à Firebase.</p>
                </div>
            </div>

            <div class="content-section">
                <div class="placeholder-grid">
                    <div class="placeholder-card clickable" @click="$router.push('/brands')">
                        <i class="pi pi-car"></i>
                        <h3>Marques</h3>
                        <p>Gérez les marques de véhicules</p>
                    </div>
                    <div class="placeholder-card">
                        <i class="pi pi-users"></i>
                        <h3>Clients</h3>
                        <p>Gérez vos clients</p>
                    </div>
                    <div class="placeholder-card">
                        <i class="pi pi-calendar"></i>
                        <h3>Locations</h3>
                        <p>Suivez vos locations</p>
                    </div>
                    <div class="placeholder-card">
                        <i class="pi pi-chart-line"></i>
                        <h3>Statistiques</h3>
                        <p>Analysez vos performances</p>
                    </div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>

<style scoped>
.dashboard-content {
    width: 100%;
}

.welcome-section {
    margin-bottom: 0;
    padding: 0;
}

.welcome-card {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 2rem;
    border-radius: 0;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    box-shadow: none;
}

.success-icon {
    font-size: 3rem;
    flex-shrink: 0;
}

.welcome-card h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 700;
}

.welcome-card p {
    margin: 0;
    font-size: 1rem;
    opacity: 0.95;
}

.content-section {
    margin-top: 0;
    padding: 0;
}

.placeholder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
}

.placeholder-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
    text-align: center;
}

.placeholder-card.clickable {
    cursor: pointer;
}

.placeholder-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
}

.placeholder-card i {
    font-size: 3rem;
    color: #3b82f6;
    margin-bottom: 1rem;
}

.placeholder-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
}

.placeholder-card p {
    margin: 0;
    color: #64748b;
    font-size: 0.95rem;
}

@media (max-width: 768px) {
    .welcome-card {
        flex-direction: column;
        text-align: center;
    }

    .placeholder-grid {
        grid-template-columns: 1fr;
        padding: 1rem;
    }
}
</style>
