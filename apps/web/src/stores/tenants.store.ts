import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../boot/axios';
import type { CoreTenantResponse, ProvisionTenantDto, UpdateTenantStatusDto } from '@turion/shared';

export const useTenantsStore = defineStore('tenants', () => {
  const tenants = ref<CoreTenantResponse[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const { data } = await api.get<CoreTenantResponse[]>('/core/tenants');
      tenants.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function provision(dto: ProvisionTenantDto) {
    const { data } = await api.post<CoreTenantResponse>('/core/tenants', dto);
    tenants.value.push(data);
    return data;
  }

  async function updateStatus(id: string, dto: UpdateTenantStatusDto) {
    const { data } = await api.patch<CoreTenantResponse>(`/core/tenants/${id}/status`, dto);
    const index = tenants.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      tenants.value[index] = data;
    }
    return data;
  }

  return { tenants, loading, fetchAll, provision, updateStatus };
});
