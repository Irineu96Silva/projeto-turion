import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../boot/axios';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('turion_token'));
  const user = ref<{
    id: string;
    email: string;
    isSuperAdmin: boolean;
    memberships: Array<{
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      role: string;
    }>;
  } | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isSuperAdmin = computed(() => !!user.value?.isSuperAdmin);

  async function fetchMe() {
    if (!token.value) return;
    try {
      const { data } = await api.get('/auth/me');
      user.value = data;
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout();
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    token.value = data.access_token;
    localStorage.setItem('turion_token', data.access_token);
    await fetchMe();
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('turion_token');
  }

  return { token, user, isAuthenticated, isSuperAdmin, login, logout, fetchMe };
});
