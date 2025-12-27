<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

const router = useRouter()
const toast = useToast()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
    if (!email.value || !password.value) {
        error.value = 'Veuillez remplir tous les champs'
        return
    }

    loading.value = true
    error.value = ''

    try {
        await signInWithEmailAndPassword(auth, email.value, password.value)
        toast.add({ severity: 'success', summary: 'Connexion réussie', detail: 'Bienvenue !', life: 3000 })
        router.push('/')
    } catch (err: any) {
        console.error('Login error:', err)
        error.value = 'Identifiants incorrects'
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Identifiants incorrects', life: 3000 })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="login-container">
        <!-- Left Side - Blue Section -->
        <div class="left-section">
            <div class="brand-logo">
                <i class="pi pi-car"></i>
                <span>KEYS & GO</span>
            </div>

            <div class="illustration">
                <i class="pi pi-user illustration-icon"></i>
            </div>

            <div class="tagline">
                <h2>A few more clicks to<br>sign in to your account.</h2>
                <p>Manage all your e-commerce accounts in one place</p>
            </div>
        </div>

        <!-- Right Side - White Section -->
        <div class="right-section">
            <div class="login-form-container">
                <h1 class="form-title">Sign in</h1>

                <form @submit.prevent="handleLogin" class="login-form">
                    <div class="input-group">
                        <InputText v-model="email" placeholder="Email" class="custom-input"
                            :class="{ 'p-invalid': error }" />
                    </div>

                    <div class="input-group">
                        <Password v-model="password" placeholder="Password" :feedback="false" toggleMask
                            class="custom-input" :class="{ 'p-invalid': error }" />
                    </div>

                    <div class="form-options">
                        <div class="remember-checkbox">
                            <Checkbox v-model="rememberMe" :binary="true" inputId="remember" />
                            <label for="remember">Remember me</label>
                        </div>
                        <a href="#" class="forgot-link">Forgot Password?</a>
                    </div>

                    <div v-if="error" class="error-msg">
                        {{ error }}
                    </div>

                    <div class="button-group">
                        <Button type="submit" label="Login" :loading="loading" class="login-btn" />
                        <Button type="button" label="Register" severity="secondary" outlined class="register-btn" />
                    </div>

                    <p class="terms-text">
                        By signin up, you agree to our <a href="#">Terms and Conditions</a> & <a href="#">Privacy
                            Policy</a>
                    </p>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    min-height: 100vh;
    position: relative;
    background: white;
    overflow: hidden;
}

/* Left Section - Blue Diagonal */
.left-section {
    position: relative;
    width: 45%;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    color: white;
    padding: 3rem;
    display: flex;
    flex-direction: column;
    clip-path: polygon(0 0, 100% 0, 85% 100%, 0 100%);
    z-index: 1;
}

.brand-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 4rem;
}

.brand-logo i {
    font-size: 1.5rem;
}

.illustration {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 2rem 0;
}

.illustration-icon {
    font-size: 10rem;
    opacity: 0.3;
}

.tagline {
    margin-top: auto;
}

.tagline h2 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0 0 1rem 0;
}

.tagline p {
    font-size: 1rem;
    opacity: 0.9;
    margin: 0;
}

/* Right Section - White Form */
.right-section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: #f8fafc;
}

.login-form-container {
    width: 100%;
    max-width: 400px;
    background: white;
    padding: 3rem;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.form-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 2rem 0;
    text-align: center;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.input-group {
    width: 100%;
}

:deep(.custom-input) {
    width: 100%;
}

:deep(.custom-input input) {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9375rem;
}

:deep(.custom-input input:focus) {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
}

.remember-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.remember-checkbox label {
    color: #64748b;
    cursor: pointer;
}

.forgot-link {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
}

.forgot-link:hover {
    text-decoration: underline;
}

.error-msg {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #dc2626;
    font-size: 0.875rem;
    text-align: center;
}

.button-group {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
}

.login-btn,
.register-btn {
    flex: 1;
    padding: 0.875rem 1.5rem;
    font-weight: 600;
    border-radius: 8px;
}

.login-btn {
    background: #2563eb !important;
    border: none !important;
}

.login-btn:hover {
    background: #1e40af !important;
}

.register-btn {
    border: 1px solid #e2e8f0 !important;
    color: #64748b !important;
}

.register-btn:hover {
    background: #f8fafc !important;
}

.terms-text {
    text-align: center;
    font-size: 0.75rem;
    color: #94a3b8;
    margin: 1rem 0 0 0;
    line-height: 1.5;
}

.terms-text a {
    color: #2563eb;
    text-decoration: none;
}

.terms-text a:hover {
    text-decoration: underline;
}

/* Responsive */
@media (max-width: 968px) {
    .login-container {
        flex-direction: column;
    }

    .left-section {
        width: 100%;
        clip-path: none;
        padding: 2rem;
        min-height: 40vh;
    }

    .illustration {
        display: none;
    }

    .tagline h2 {
        font-size: 1.5rem;
    }

    .right-section {
        padding: 2rem 1rem;
    }

    .login-form-container {
        padding: 2rem;
    }
}
</style>
