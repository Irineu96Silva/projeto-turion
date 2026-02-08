import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../boot/axios';
import type { PlanResponse, CreatePlanDto, UpdatePlanDto } from '@turion/shared';

export const usePlansStore = defineStore('plans', () => {
  const plans = ref<PlanResponse[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const { data } = await api.get<PlanResponse[]>('/core/plans');
      plans.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function create(dto: CreatePlanDto) {
    const { data } = await api.post<PlanResponse>('/core/plans', dto);
    plans.value.push(data);
    return data;
  }

  async function update(id: string, dto: UpdatePlanDto) {
    const { data } = await api.patch<PlanResponse>(`/core/plans/${id}`, dto);
    const index = plans.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      plans.value[index] = data;
    }
    return data;
  }

  return { plans, loading, fetchAll, create, update };
});
