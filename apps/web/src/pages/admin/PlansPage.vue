<template>
  <q-page padding>
    <div class="row q-mb-md justify-between items-center">
      <div class="text-h5">Planos de Assinatura</div>
      <q-btn color="primary" icon="add" label="Novo Plano" @click="openCreateDialog" />
    </div>

    <q-table :rows="plansStore.plans" :columns="columns" row-key="id" :loading="plansStore.loading">
      <template v-slot:body-cell-isActive="props">
        <q-td :props="props">
          <q-chip :color="props.value ? 'positive' : 'negative'" text-color="white" dense>
            {{ props.value ? 'Ativo' : 'Inativo' }}
          </q-chip>
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat round icon="edit" size="sm" @click="openEditDialog(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialogOpen">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditing ? 'Editar Plano' : 'Novo Plano' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input v-model="form.name" label="Nome" outlined :rules="[(val) => !!val || 'Obrigatório']" />
            <q-input v-model="form.slug" label="Slug" outlined :rules="[(val) => !!val || 'Obrigatório']" />
            <q-input
              v-model.number="form.max_tenants"
              label="Max Tenants"
              type="number"
              outlined
              hint="Deixe em branco para ilimitado"
            />
            <q-input
              v-model.number="form.max_requests_month"
              label="Max Requisições/Mês"
              type="number"
              outlined
              :rules="[(val) => val >= 0 || 'Inválido']"
            />
            <q-toggle v-model="form.isActive" label="Ativo" />

            <div class="row justify-end q-mt-md">
              <q-btn label="Cancelar" color="negative" flat v-close-popup />
              <q-btn
                :label="isEditing ? 'Salvar' : 'Criar'"
                type="submit"
                color="primary"
                :loading="submitting"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { usePlansStore } from '../../stores/plans.store';
import type { QTableColumn } from 'quasar';
import type { CreatePlanDto, PlanResponse } from '@turion/shared';

const plansStore = usePlansStore();
const dialogOpen = ref(false);
const submitting = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

const form = reactive<CreatePlanDto & { isActive: boolean }>({
  name: '',
  slug: '',
  max_tenants: null,
  max_requests_month: 500,
  features: {},
  isActive: true,
});

// Mapping for form compatibility (camelCase vs snake_case in DTO if needed, but shared DTO uses camelCase for schema but interface might differ?
// Let's check shared core.dto.ts again.
// CreatePlanSchema: name, slug, max_tenants, max_requests_month, features.
// PlanResponse: name, slug, maxTenants, maxRequestsMonth, isActive.
// I need to map carefully.

const columns: QTableColumn[] = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left', sortable: true },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left', sortable: true },
  {
    name: 'maxRequestsMonth',
    label: 'Req/Mês',
    field: 'maxRequestsMonth',
    align: 'right',
    sortable: true,
  },
  { name: 'isActive', label: 'Status', field: 'isActive', align: 'center', sortable: true },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'center' },
];

onMounted(() => {
  plansStore.fetchAll();
});

function openCreateDialog() {
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.slug = '';
  form.max_tenants = null;
  form.max_requests_month = 500;
  form.isActive = true;
  dialogOpen.value = true;
}

function openEditDialog(plan: PlanResponse) {
  isEditing.value = true;
  editingId.value = plan.id;
  form.name = plan.name;
  form.slug = plan.slug;
  form.max_tenants = plan.maxTenants;
  form.max_requests_month = plan.maxRequestsMonth;
  form.isActive = plan.isActive; // Wait, PlanResponse has camelCase, CreateDTO has snake_case.
  // I need to adjust form model to match DTO structure for API call
  dialogOpen.value = true;
}

async function onSubmit() {
  submitting.value = true;
  try {
    const payload: any = {
      name: form.name,
      slug: form.slug,
      max_tenants: form.max_tenants,
      max_requests_month: form.max_requests_month,
      features: {},
    };

    if (isEditing.value && editingId.value) {
      // For update we can pass partial
      await plansStore.update(editingId.value, { ...payload, isActive: form.isActive });
    } else {
      await plansStore.create(payload);
    }
    dialogOpen.value = false;
  } catch (error) {
    console.error(error);
  } finally {
    submitting.value = false;
  }
}
</script>
