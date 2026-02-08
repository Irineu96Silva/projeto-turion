<template>
  <q-page class="flex flex-center">
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Login - Turion</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            label="Email"
            type="email"
            filled
            :rules="[(val: string) => !!val || 'Email obrigatório']"
          />
          <q-input
            v-model="password"
            label="Senha"
            :type="showPassword ? 'text' : 'password'"
            filled
            :rules="[(val: string) => !!val || 'Senha obrigatória']"
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-banner v-if="error" class="text-white bg-red" rounded>
            {{ error }}
          </q-banner>

          <q-btn
            type="submit"
            label="Entrar"
            color="primary"
            class="full-width"
            :loading="loading"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const router = useRouter();
const authStore = useAuthStore();

async function onSubmit() {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
    router.push('/');
  } catch (err: unknown) {
    error.value = 'Credenciais inválidas';
  } finally {
    loading.value = false;
  }
}
</script>
