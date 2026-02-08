import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../boot/axios';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('turion_token'));

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const { data } = await api.post<{ access_token: string }>('/auth/login', {
      email,
      password,
    });
    token.value = data.access_token;
    localStorage.setItem('turion_token', data.access_token);
  }

  function logout() {
    token.value = null;
    localStorage.removeItem('turion_token');
  }

  return { token, isAuthenticated, login, logout };
});
