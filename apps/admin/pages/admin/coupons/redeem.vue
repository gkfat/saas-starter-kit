<template>
  <div>
    <LayoutPageHeader :title="$t('couponsRedeem.title')" />

    <CardsAppCard class="pa-4" style="max-width: 480px">
      <v-text-field
        v-model="code"
        :label="$t('couponsRedeem.codeLabel')"
        :placeholder="$t('couponsRedeem.codePlaceholder')"
        autofocus
        hide-details="auto"
        class="mb-3"
        @keyup.enter="submit"
      />
      <ButtonsAppButton kind="primary" :loading="submitting" :disabled="!code" @click="submit">
        {{ $t('couponsRedeem.submit') }}
      </ButtonsAppButton>

      <v-alert v-if="result" :type="result.type" variant="tonal" class="mt-4">
        {{ result.message }}
      </v-alert>
    </CardsAppCard>
  </div>
</template>

<script setup lang="ts">
import type { CouponInstanceWithState } from '@saas-starter-kit/shared';

const { t } = useI18n();
const { apiFetch } = useApi();

const code = ref('');
const submitting = ref(false);
const result = ref<{ type: 'success' | 'error'; message: string } | null>(null);

async function submit() {
  if (!code.value) return;
  submitting.value = true;
  result.value = null;

  try {
    const instance = await apiFetch<CouponInstanceWithState>('/api/admin/coupons/redeem', {
      method: 'POST',
      body: { code: code.value },
      silent: true,
    });
    if (instance) {
      result.value = { type: 'success', message: t('couponsRedeem.success') };
      code.value = '';
    }
  } catch (e: unknown) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      result.value = { type: 'error', message: t('couponsRedeem.errorNotFound') };
    } else if (statusCode === 409) {
      const message = (e as { data?: { message?: string } }).data?.message ?? '';
      result.value = {
        type: 'error',
        message: message.includes('expired')
          ? t('couponsRedeem.errorExpired')
          : t('couponsRedeem.errorAlreadyRedeemed'),
      };
    } else {
      result.value = { type: 'error', message: t('couponsRedeem.errorNotFound') };
    }
  }

  submitting.value = false;
}
</script>
