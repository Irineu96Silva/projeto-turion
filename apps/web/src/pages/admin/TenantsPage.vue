<template>
  <q-page padding>
    <div class="row q-mb-md justify-between items-center">
      <div class="text-h5">Tenants</div>
      <q-btn color="primary" icon="add" label="Novo Tenant" @click="openProvisionDialog" />
    </div>

    <q-table :rows="tenantsStore.tenants" :columns="columns" row-key="id" :loading="tenantsStore.loading">
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="getStatusColor(props.value)" text-color="white" dense>
            {{ props.value }}
          </q-chip>
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn-dropdown flat round size="sm" icon="more_vert">
            <q-list>
              <q-item
                clickable
                v-close-popup
                @click="updateStatus(props.row.id, 'active')"
                v-if="props.row.status !== 'active'"
              >
                <q-item-section>Ativar</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="updateStatus(props.row.id, 'suspended')"
                v-if="props.row.status !== 'suspended'"
              >
                <q-item-section>Suspender</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="updateStatus(props.row.id, 'cancelled')"
                v-if="props.row.status !== 'cancelled'"
              >
                <q-item-section class="text-negative">Cancelar</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </q-td>
      </template>
    </q-table>

    <!-- Provision Dialog -->
    <q-dialog v-model="dialogOpen">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Novo Tenant</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input v-model="form.name" label="Nome do Tenant" outlined :rules="[(val) => !!val || 'Obrigatório']" />
            <q-input
              v-model="form.ownerEmail"
              label="Email do Owner"
              type="email"
              outlined
              :rules="[(val) => !!val || 'Obrigatório']"
            />
            <q-input
              v-model="form.ownerPassword"
              label="Senha do Owner"
              type="password"
              outlined
              :rules="[(val) => !!val || 'Obrigatório', (val) => val.length >= 6 || 'Min 6 caracteres']"
            />
            
           <q-select
              v-model="form.planId"
              :options="planOptions"
              label="Plano"
              outlined
              emit-value
              map-options
              :rules="[(val) => !!val || 'Obrigatório']"
            />

            <div class="row justify-end q-mt-md">
              <q-btn label="Cancelar" color="negative" flat v-close-popup />
              <q-btn label="Criar" type="submit" color="primary" :loading="submitting" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useTenantsStore } from '../../stores/tenants.store';
import { usePlansStore } from '../../stores/plans.store';
import type { QTableColumn } from 'quasar';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const tenantsStore = useTenantsStore();
const plansStore = usePlansStore();

const dialogOpen = ref(false);
const submitting = ref(false);

const form = reactive({
  name: '',
  ownerEmail: '',
  ownerPassword: '',
  planId: '',
});

const columns: QTableColumn[] = [
  { name: 'name', label: 'Nome', field: 'name', align: 'left', sortable: true },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Ações', field: 'actions', align: 'center' },
];

const planOptions = computed(() =>
  plansStore.plans.map((p) => ({ label: p.name, value: p.id }))
);

onMounted(() => {
  tenantsStore.fetchAll();
  plansStore.fetchAll();
});

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'positive';
    case 'suspended':
      return 'warning';
    case 'cancelled':
      return 'negative';
    default:
      return 'grey';
  }
}

function openProvisionDialog() {
  form.name = '';
  form.ownerEmail = '';
  form.ownerPassword = '';
  form.planId = '';
  dialogOpen.value = true;
}

async function onSubmit() {
  submitting.value = true;
  try {
    await tenantsStore.provision({
      name: form.name,
      ownerEmail: form.ownerEmail,
      ownerPassword: form.ownerPassword,
      planId: form.planId,
    });
    dialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Tenant criado com sucesso!' });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Erro ao criar tenant' });
  } finally {
    submitting.value = false;
  }
}

async function updateStatus(id: string, status: any) {
  try {
    await tenantsStore.updateStatus(id, { status });
    $q.notify({ type: 'positive', message: `Status atualizado para ${status}` });
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Erro ao atualizar status' });
  }
}
</script>
