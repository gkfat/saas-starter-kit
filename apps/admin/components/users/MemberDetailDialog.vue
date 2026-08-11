<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="close">
    <CardsDialogCard>
      <v-card-title class="pa-4">{{ $t('users.detailTitle') }}</v-card-title>
      <v-card-text>
        <template v-if="detail">
          <div class="text-subtitle-2 mb-2">{{ $t('users.groupBasic') }}</div>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.uid') }}</div>
              <div class="text-caption font-mono">{{ detail.userId }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.memberNo') }}</div>
              <div class="text-caption font-mono">{{ detail.memberNo }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('auth.username') }}</div>
              <div>{{ detail.username }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.displayName') }}</div>
              <div>{{ detail.displayName }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.role') }}</div>
              <div>{{ detail.role ? $t(`role.${detail.role}`) : '-' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.email') }}</div>
              <div>{{ detail.email ?? '-' }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.phone') }}</div>
              <div>{{ detail.phone ?? '-' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />
          <div class="text-subtitle-2 mb-2">{{ $t('users.groupActivity') }}</div>
          <v-row>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.status.label') }}</div>
              <div>
                {{ detail.disabled ? $t('users.status.disabled') : $t('users.status.enabled') }}
              </div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.createdAt') }}</div>
              <div>{{ formatDateTime(detail.createdAt) }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-medium-emphasis">{{ $t('users.lastLoginAt') }}</div>
              <div>{{ formatDateTime(detail.lastLoginAt) }}</div>
            </v-col>
          </v-row>

          <template v-if="isLevelEnabled">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">{{ $t('users.groupLevel') }}</div>
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-medium-emphasis">{{ $t('level.levelNumber') }}</div>
                <div v-if="detail.level">
                  {{ detail.level.levelName }}（Lv.{{ detail.level.levelNumber }}）
                </div>
                <span v-else class="text-medium-emphasis">{{ $t('level.notInitialized') }}</span>
              </v-col>
              <template v-if="detail.level">
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('level.currentPeriodTotal') }}
                  </div>
                  <div>{{ detail.level.currentPeriodTotal }}</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('level.periodStart') }}
                  </div>
                  <div>{{ formatDateTime(detail.level.startDate) }}</div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">{{ $t('level.periodEnd') }}</div>
                  <div>{{ formatDateTime(detail.level.endDate) }}</div>
                </v-col>
              </template>
            </v-row>
          </template>

          <template v-if="isPointsEnabled && canReadPoints">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">{{ $t('users.groupPoints') }}</div>
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-medium-emphasis">
                  {{ $t('pointsMembers.currentBalance') }}
                </div>
                <div v-if="pointsDetail">{{ pointsDetail.balance }}</div>
                <v-progress-circular v-else indeterminate size="16" color="primary" />
              </v-col>
            </v-row>
          </template>
        </template>
        <v-row v-else>
          <v-col class="d-flex justify-center py-6">
            <v-progress-circular indeterminate color="primary" />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer />
        <ButtonsAppButton kind="secondary" @click="close">{{
          $t('common.cancel')
        }}</ButtonsAppButton>
      </v-card-actions>
    </CardsDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { PointsMemberDetail, UserRow } from '@saas-starter-kit/shared';

const props = defineProps<{
  modelValue: boolean;
  user: UserRow | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { isFeatureEnabled } = useFeatureFlags();
const { hasPermission } = usePermission();
const isLevelEnabled = isFeatureEnabled(FeatureFlag.Level);
const isPointsEnabled = isFeatureEnabled(FeatureFlag.Points);
const canReadPoints = computed(() => hasPermission(Permission.Points.Read));
const { apiFetch } = useApi();

const detail = ref<UserRow | null>(null);
const pointsDetail = ref<PointsMemberDetail | null>(null);

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.user) {
      detail.value = null;
      pointsDetail.value = null;
      return;
    }
    const userId = props.user.userId;
    detail.value = await apiFetch<UserRow>(`/api/admin/users/${userId}`, {
      silent: true,
    });
    if (isPointsEnabled && canReadPoints.value) {
      pointsDetail.value = await apiFetch<PointsMemberDetail>(
        `/api/admin/points/members/${userId}`,
        { silent: true },
      );
    }
  },
);

function close() {
  emit('update:modelValue', false);
}
</script>
