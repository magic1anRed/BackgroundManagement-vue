<template>
  <div class="index-view">
    <el-card v-loading="!isUserDataLoaded">
      <template v-if="currentUser.realname">
        <h2>欢迎您，{{ currentUser.realname }}</h2>
        <p>这里是后台管理系统首页</p>
      </template>
      <template v-else-if="isUserDataLoaded">
        <h2>欢迎您，后台用户</h2>
        <p>这里是后台管理系统首页</p>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCurrentUserStore } from '@/stores/currentUser.js'

const userStore = useCurrentUserStore()
const currentUser = computed(() => userStore.currentUser || {})

// 计算属性：判断用户数据是否至少有 ID 字段，作为加载完成的标志
const isUserDataLoaded = computed(() => {
  // 检查 ID 字段是否存在，如果 ID 存在，则认为数据已加载
  return !!userStore.currentUser && !!userStore.currentUser.id;
})
</script>

<style scoped>
.index-view {
  padding: 20px;
}
</style>