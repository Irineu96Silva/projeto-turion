import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'), // We'll create a simple layout or reuse MainLayout
      meta: { requiresAuth: true, requiresSuperAdmin: true },
      children: [
        {
          path: 'plans',
          name: 'admin-plans',
          component: () => import('../pages/admin/PlansPage.vue'),
        },
        {
          path: 'tenants',
          name: 'admin-tenants',
          component: () => import('../pages/admin/TenantsPage.vue'),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return { name: 'login' };
    }
    
    // Ensure user profile is loaded to check roles
    if (!authStore.user) {
      await authStore.fetchMe();
    }

    if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
      return { name: 'dashboard' }; // or 403 page
    }
  }
});

export default router;
