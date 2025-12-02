<template>
  <div class="index-view">
    <el-card>
      <h2>欢迎您，{{ currentUser.realname }}</h2>
      <p>这里是后台管理系统首页</p>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCurrentUserStore } from '@/stores/currentUser.js'

const userStore = useCurrentUserStore()
const currentUser = computed(() => userStore.currentUser || {})
</script>

<style scoped>
.index-view {
  padding: 20px;
}
</style>
