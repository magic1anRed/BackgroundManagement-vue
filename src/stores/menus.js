import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ==========================================================
// 权限提取助手函数：递归遍历菜单树，提取所有 identifier
// ==========================================================
function extractIdentifiers(menus) {
    if (!menus || menus.length === 0) {
        return [];
    }

    let perms = [];

    for (const menu of menus) {
        // 1. 收集当前节点的 identifier
        // 假设所有有效的权限码都存储在 identifier 字段中
        if (menu.identifier) {
            perms.push(menu.identifier);
        }

        // 2. 递归处理子节点
        if (menu.children && menu.children.length > 0) {
            // 使用 concat 累加递归结果
            perms = perms.concat(extractIdentifiers(menu.children));
        }
    }
    return perms;
}
// ==========================================================

export const useMenuStore = defineStore('menus', () => {
    // 1. 菜单数据 (用于侧边栏渲染)
    const menus = ref([])

    // 2. 扁平化权限码数组 (用于权限校验)
    const perms = ref([])

    /**
     * @description 设置菜单列表，并同时提取权限码
     * @param {Array} list - 后端返回的菜单树结构
     */
    function setMenus(list) {
        menus.value = list
        // 🌟 关键：调用提取函数，将扁平化权限码存储起来
        perms.value = extractIdentifiers(list)
    }

    /**
     * @description 检查是否拥有指定权限
     * @param {string} permCode - 要检查的权限码，例如 'system:dept:query'
     * @returns {boolean}
     */
    function hasPerm(permCode) {
        // 在扁平化数组中进行快速查找
        return perms.value.includes(permCode)
    }

    // 可以在组件中直接使用 hasPerm
    return {
        menus,
        perms, // 暴露 perms 数组，方便调试
        setMenus,
        hasPerm // 暴露权限校验方法
    }
},{
    // 权限和菜单数据都需要持久化
    persist: true
})