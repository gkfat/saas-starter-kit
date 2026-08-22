<template>
  <v-main class="bg-background">
    <v-container :max-width="400" class="pt-1 pb-12">
      <AppHeader @toggle-menu="drawerOpen = !drawerOpen" />
      <router-view v-slot="{ Component, route: matchedRoute }">
        <keep-alive>
          <component :is="Component" v-if="matchedRoute.name === 'home'" />
        </keep-alive>
      </router-view>
    </v-container>
  </v-main>

  <v-dialog
    :model-value="level1Name !== null"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
    @update:model-value="(val) => !val && closeToHome()"
  >
    <v-card class="bg-background" rounded="0">
      <v-container :max-width="400" class="pt-4 pb-12">
        <router-view v-slot="{ Component, route: matchedRoute }">
          <component :is="Component" v-if="matchedRoute.name === level1Name" />
        </router-view>
      </v-container>

      <div class="dialog-nav-bar d-flex justify-center">
        <v-btn icon="mdi-close" variant="tonal" @click="closeToHome" />
      </div>
    </v-card>
  </v-dialog>

  <v-dialog
    :model-value="level2Name !== null"
    fullscreen
    scrollable
    transition="page-push-transition"
    @update:model-value="(val) => !val && backFromLevel2()"
  >
    <v-card class="bg-background fill-height" rounded="0">
      <v-container :max-width="400" class="pt-4 pb-12">
        <router-view v-slot="{ Component, route: matchedRoute }">
          <component :is="Component" v-if="matchedRoute.name === level2Name" />
        </router-view>
      </v-container>

      <div class="dialog-nav-bar d-flex justify-center">
        <v-btn
          :icon="route.meta.sheetClose ? 'mdi-close' : 'mdi-arrow-left'"
          variant="tonal"
          @click="route.meta.sheetClose ? closeToHome() : backFromLevel2()"
        />
      </div>
    </v-card>
  </v-dialog>

  <AppDrawer v-model="drawerOpen" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppDrawer from '~/components/AppDrawer.vue';
import AppHeader from '~/components/AppHeader.vue';

const drawerOpen = ref(false);
const route = useRoute();
const router = useRouter();

// 追蹤兩層 dialog：level1 是從 home 直接進入的頁面（bottom-up dialog），
// level2 是在 level1 dialog 內點擊內容後鑽入的頁面（right-slide dialog）。
const level1Name = ref<string | null>(null);
const level2Name = ref<string | null>(null);

watch(
  () => route.name as string | undefined,
  (name, prevName) => {
    if (!name || name === 'home') {
      level1Name.value = null;
      level2Name.value = null;
      return;
    }
    if (!level1Name.value || prevName === 'home' || prevName === undefined) {
      level1Name.value = name;
      level2Name.value = null;
      return;
    }
    if (name === level1Name.value) {
      level2Name.value = null;
      return;
    }
    level2Name.value = name;
  },
  { immediate: true },
);

function closeToHome() {
  level1Name.value = null;
  level2Name.value = null;
  router.push({ name: 'home' });
}

function backFromLevel2() {
  // 用 route.meta.backTo 明確導回指定的前一步，而非依賴瀏覽器 history——重新整理
  // 或深連結進入時並沒有可 back() 的紀錄，history-based 返回會失效或無反應。
  // params/query 原樣帶過去，前一步用不到的欄位會被忽略。
  const backTo = route.meta.backTo as string | undefined;
  if (backTo) {
    router.push({ name: backTo, params: route.params, query: route.query });
    return;
  }
  if (level1Name.value) {
    router.push({ name: level1Name.value });
    return;
  }
  router.back();
}
</script>

<style scoped>
.dialog-nav-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
}

.page-push-transition-enter-active,
.page-push-transition-leave-active {
  transition: transform 0.4s ease;
}

.page-push-transition-enter-from,
.page-push-transition-leave-to {
  transform: translateX(100%);
}

.page-push-transition-enter-to,
.page-push-transition-leave-from {
  transform: translateX(0);
}

@media (prefers-reduced-motion: no-preference) {
  .dialog-bottom-transition-enter-active {
    transition-duration: 0.5s !important;
  }
  .dialog-bottom-transition-leave-active {
    transition-duration: 0.5s !important;
  }
}
</style>
