<template>
  <q-page class="q-pa-lg">
    <div class="row q-mb-md justify-between items-center">
      <div class="text-h4">Dashboard</div>
      <div class="text-subtitle1" v-if="currentTenant">
        Tenant: <strong>{{ currentTenant.tenantName }}</strong>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Usage Card -->
      <div class="col-12 col-md-6 col-lg-4">
        <q-card>
          <q-card-section>
            <div class="text-h6">Uso Mensal</div>
            <div class="text-caption text-grey">Plano: {{ usageData.planName }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="text-h3 text-primary text-center q-my-md">
              {{ usageData.usage }} <span class="text-h6 text-grey">/ {{ usageData.limit > 0 ? usageData.limit : '∞' }}</span>
            </div>
            
            <q-linear-progress 
              size="10px" 
              :value="progress" 
              class="q-mt-md"
              rounded
              color="primary"
              track-color="blue-1"
            />
             <div class="text-caption text-right q-mt-sm">
              {{ usageData.remaining }} requisições restantes
             </div>
          </q-card-section>

          <q-card-actions align="right">
             <q-btn flat color="primary" label="Atualizar" @click="fetchUsage" :loading="loading" />
          </q-card-actions>
        </q-card>
      </div>

       <!-- Placeholder for other widgets -->
       <div class="col-12 col-md-6 col-lg-8">
         <q-card class="bg-blue-1">
           <q-card-section>
             Bem-vindo ao Turion. Configure seus stages e simulador em breve.
           </q-card-section>
         </q-card>
       </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { api } from '../boot/axios';

const authStore = useAuthStore();
const loading = ref(false);
const usageData = ref({
  usage: 0,
  limit: 0,
  planName: '',
  remaining: 0,
  allowed: true
});

const currentTenant = computed(() => {
  return authStore.user?.memberships?.[0]; // Default to first tenant for now
});

const progress = computed(() => {
  if (usageData.value.limit <= 0) return 0;
  return Math.min(1, usageData.value.usage / usageData.value.limit);
});

async function fetchUsage() {
  if (!currentTenant.value) return;
  
  loading.value = true;
  try {
    const { data } = await api.get(`/tenants/${currentTenant.value.tenantId}/usage`);
    usageData.value = data;
  } catch (error) {
    console.error('Failed to fetch usage', error);
  } finally {
    loading.value = false;
  }
}

watch(
  () => authStore.user,
  (newUser) => {
    if (newUser) {
      fetchUsage();
    }
  },
  { immediate: true }
);
</script>
