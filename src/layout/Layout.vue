<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useCurrentUserStore } from '@/stores/currentUser.js'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {useMenuStore} from "@/stores/menus.js";
const domain = import.meta.env.VITE_QINIU_DOMAIN
// ⚡ 注意：这里只保留清除动态路由的导入
import {clearDynamicRoutes} from "@/router";

// --- 响应式状态 ---
const collapse = ref(false) // 侧边栏折叠状态
const router = useRouter() // 路由实例
const route = useRoute() // 当前路由信息

// --- Pinia Store 和 Computed 属性 ---
const userStore = useCurrentUserStore() // 用户信息 Store
const currentUser = computed(() => userStore.currentUser || {}) // 当前登录用户信息
const menuStore = useMenuStore(); // 菜单 Store 实例

// 当前激活菜单的 path
const activeMenu = computed(() => route.path)
// ⚡ 菜单列表直接从 Pinia Store 中获取，不再需要异步加载
const menuList = computed(() => menuStore.menus)


// 1. 图标映射
const ICON_MAP = {
  '首页': 'HomeFilled',
  '系统管理': 'Setting',
  '用户管理': 'User',
  '角色管理': 'ChromeFilled',
  '菜单权限管理': 'Document',
  '部门管理': 'OfficeBuilding',
  '日志管理': 'Document',
  '操作日志': 'EditPen',
  '登录日志': 'Key',
  '/dashboard': 'HomeFilled',
  default: 'Menu'
};

/**
 * 2. 菜单数据转换：(此函数不再被使用，但保留定义无害)
 */
function buildMenuTree(list, parentId = 0) {
  // ... (保持不变)
}

// ⚡ 移除了 getUserMenu 和 loadMenus 函数，因为逻辑已迁移到 router/index.js 守卫中

// 计算属性：获取当前路由标题
const currentTitle = computed(() => {
  if (route.meta.title) {
    return route.meta.title;
  }
  const findTitle = (list) => {
    if (!list) return '控制台';
    for (const item of list) {
      // 路由路径可能是 '/admin/user'
      if (item.path === route.path) {
        return item.name;
      }
      if (item.children) {
        const childTitle = findTitle(item.children);
        if (childTitle) return childTitle;
      }
    }
    return '控制台';
  };
  // 从动态加载的 menuList 中查找标题
  return findTitle(menuList.value);
});

// 函数：根据路由路径查找对应图标，用于顶栏显示
const getIconForRoute = (path) => {
  const findIcon = (list) => {
    if (!list) return 'Menu';
    for (const item of list) {
      if (item.path === path) {
        return item.icon;
      }
      if (item.children) {
        const childIcon = findIcon(item.children);
        if (childIcon) return childIcon;
      }
    }
    return 'Menu'; // 默认图标
  };
  return findIcon(menuList.value);
};


// --- 交互及控制函数 ---

/**
 * 菜单折叠/展开控制函数。
 */
const handleCollapse = () => {
  collapse.value = !collapse.value;
  nextTick(() => {
    // 强制更新菜单和滚动条布局
  });
};

// 下拉菜单命令处理
function handleCommand(command) {
  if (command === 'logout') {
    logout();
  } else {
    goTo(command);
  }
}

// 路由跳转
function goTo(path) {
  router.push(`/admin/${path}`)
}

// 注销登录
function logout() {
  clearDynamicRoutes(); // 清除动态路由
  userStore.logout(); // 清除用户信息和 token (Pinia Persist 会自动清除)
  ElMessage.success("已安全退出");
  router.push('/');
}

// ⚡ 生命周期钩子中不再进行异步请求和路由加载
onMounted(() => {
  // 保持为空，所有初始化逻辑都在路由守卫中完成
});
</script>

<template>
  <el-container class="layout-container">
    <el-aside :width="collapse ? '64px' : '200px'" class="aside-menu">
      <div class="logo">造物主后台管理</div>

      <el-scrollbar class="aside-scrollbar">
        <el-menu
            :default-active="activeMenu"
            class="el-menu-vertical-demo"
            background-color="#2c3e50"
            text-color="#ffffffb3"
            active-text-color="#409eff"
            :collapse="collapse"
            router
            unique-opened
        >
          <template v-for="item in menuList" :key="item.id">
            <el-sub-menu
                v-if="item.children && item.children.length && item.type !== 2"
                :index="String(item.id)"
            >
              <template #title>
                <el-icon><component :is="item.icon || 'Menu'" /></el-icon>
                <span>{{ item.name }}</span>
              </template>

              <template v-for="child in item.children" :key="child.id">
                <el-menu-item
                    v-if="child && child.type === 1"
                    :index="child.path"
                >
                  <el-icon><component :is="child.icon || 'Document'" /></el-icon>
                  <span>{{ child.name }}</span>
                </el-menu-item>
              </template>
            </el-sub-menu>

            <el-menu-item v-else-if="item.type === 1 || item.type === 0" :index="item.path">
              <el-icon><component :is="item.icon || 'Menu'" /></el-icon>
              <span>{{ item.name }}</span>
            </el-menu-item>

          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button
              :icon="collapse ? 'Expand' : 'Fold'"
              @click="handleCollapse"
              circle
              size="small"
              class="collapse-btn"
          ></el-button>

          <div class="current-menu-display">
            <el-icon class="current-icon"><component :is="getIconForRoute(route.path) || 'Menu'" /></el-icon>
            <span class="current-title">{{ currentTitle }}</span>
          </div>
        </div>

        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="el-dropdown-link user-info-link">
              <span class="welcome-text">欢迎您，{{ currentUser.realname || '游客' }}</span>
              <el-avatar :size="30" icon="UserFilled" class="user-avatar" :src="domain+'/'+currentUser.avatar" />
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="info">修改信息</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="loginlog">登录日志</el-dropdown-item>
                <el-dropdown-item command="actionlog">操作日志</el-dropdown-item>
                <el-dropdown-item command="logout" divided>注销</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view></router-view>
      </el-main>

      <el-footer class="footer">
        © 2025 造物主后台管理系统
      </el-footer>
    </el-container>
  </el-container>
</template>


<style scoped>
/* ========================================= */
/* CSS 样式：包含所有对齐、配色和边界的优化 */
/* ========================================= */

/* 核心修正：强化全局清除，确保贴边 */
:global(html), :global(body), #app {
  margin: 0 !important;
  padding: 0 !important;
  height: 100%;
}

/* 容器全高 */
.layout-container {
  height: 100vh;
  margin: 0;
  padding: 0;
  width: 100%;
}

/* 移除光标 */
.logo,
.current-menu-display,
.welcome-text,
.el-menu-vertical-demo,
.el-dropdown-link {
  user-select: none;
  cursor: default;
}

/* 左侧菜单容器 */
.aside-menu {
  height: 100vh;
  padding: 0 !important;
  margin: 0 !important;
  box-sizing: border-box;
  transition: width 0.3s;
  background-color: #2c3e50;
  overflow: hidden;
}

/* logo */
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  color: #fff;
  background-color: #2c3e50;
  font-weight: bold;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 菜单滚动条容器 */
.aside-scrollbar {
  height: calc(100% - 60px);
}

/* 菜单样式 */
.el-menu-vertical-demo {
  border-right: none;
  min-height: 100%;
}

/* ❗ 折叠图标修正 */

/* 隐藏折叠时的文字 */
:global(.el-menu--collapse .el-menu-item span),
:global(.el-menu--collapse .el-sub-menu__title span) {
  height: 0;
  width: 0;
  overflow: hidden;
  visibility: hidden;
  display: inline-block;
}

/* 确保折叠时菜单项和图标居中 */
:global(.el-menu--collapse .el-sub-menu__title),
:global(.el-menu--collapse .el-menu-item) {
  padding: 0 !important;
  text-align: center;
  justify-content: center;
}

/* 移除折叠时图标的右边距 */
:global(.el-menu--collapse .el-menu-item .el-icon),
:global(.el-menu--collapse .el-sub-menu__title .el-icon) {
  margin-right: 0 !important;
  transform: translateX(0);
}

/* 展开状态下的菜单对齐 */
:global(.el-sub-menu__title) {
  padding-left: 20px !important;
  display: flex;
  align-items: center;
}
:global(.el-menu-item) {
  padding-left: 48px !important; /* 二级菜单缩进 */
}
:global(.el-menu-item .el-icon),
:global(.el-sub-menu__title .el-icon) {
  margin-right: 5px;
  transition: margin 0.3s;
}

/* 顶部导航 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.header-left {
  display: flex;
  align-items: center;
}
.current-menu-display {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  padding-left: 20px;
}
.current-icon {
  font-size: 18px;
  color: #409eff;
  margin-right: 8px;
}
.collapse-btn {
  margin-right: 16px;
  color: #606266;
  border: none;
}
.header-right {
  display: flex;
  align-items: center;
}
.user-info-link {
  cursor: default;
  display: flex;
  align-items: center;
  padding: 0 10px;
}
.welcome-text {
  margin-right: 10px;
  color: #303133;
  font-size: 14px;
}
.user-avatar {
  margin-right: 5px;
}
.main-content {
  padding: 20px;
  min-height: calc(100vh - 120px);
  background-color: #f0f2f5;
}
.footer {
  text-align: center;
  padding: 10px 0;
  height: 40px;
  line-height: 20px;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #ebeef5;
  background-color: #fff;
}
</style>