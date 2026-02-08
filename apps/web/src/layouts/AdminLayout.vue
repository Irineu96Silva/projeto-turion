<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-dark text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />
        <q-toolbar-title>Turion Admin</q-toolbar-title>
        <q-btn flat label="Voltar ao App" to="/" />
        <q-btn flat label="Sair" @click="logout" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Administração</q-item-label>

        <q-item clickable to="/admin/plans" exact>
          <q-item-section avatar>
            <q-icon name="payments" />
          </q-item-section>
          <q-item-section>Planos</q-item-section>
        </q-item>

        <q-item clickable to="/admin/tenants" exact>
          <q-item-section avatar>
            <q-icon name="business" />
          </q-item-section>
          <q-item-section>Tenants</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useRouter } from 'vue-router';

const leftDrawerOpen = ref(false);
const authStore = useAuthStore();
const router = useRouter();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>
