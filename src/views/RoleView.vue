<script setup>
import {ref, reactive, onMounted, nextTick} from "vue"
import {ElMessage, ElMessageBox} from "element-plus";
// 引入您的 Pinia Store
import {useMenuStore} from "@/stores/menus.js";

// 实例化 Store
const menuStore = useMenuStore();

// ------------------ 响应式数据 ------------------
const roleList = ref([])
const searchName = ref("")
const searchRemarks = ref("")

// 分页
const page = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 添加/编辑模态框数据
const addModalVisible = ref(false)
const newRole = ref({ name: "", remarks: "" })
const editModalVisible = ref(false)
const editRole = ref({})

// ------------------ 权限授权相关数据 ------------------
const assignPermsModalVisible = ref(false);
const currentAuthRole = ref({});
const rolePermsIds = ref([]);
const treeRef = ref(null);

// **【修改点 1：新增】** 存储从后端获取的所有权限菜单（树形结构）
const allPermsMenus = ref([]);

// 权限树控制按钮状态
const isExpandAll = ref(false);
const isCheckAll = ref(false);
const isLinkage = ref(true); // 默认开启父子联动 (true: 联动, false: 独立勾选)

// ------------------ 权限树配置 ------------------
const treeProps = {
  children: 'children',
  label: 'name',
};

// ------------------ 辅助函数 (扁平转树形，为保持完整性保留) ------------------
function handleTree(data, idName = 'id', parentIdName = 'parentId', rootId = 0) {
  if (!Array.isArray(data)) { return []; }
  const map = {};
  data.forEach(item => {
    if (item[idName] === undefined) return;
    // 确保每个 item 都有 children 数组，用于树形组件
    if (!item.children) {
      item.children = [];
    }
    map[item[idName]] = item;
  });

  data.forEach(item => {
    const parent = map[item[parentIdName]];
    if (parent && item[idName] !== rootId) {
      parent.children.push(item);
    }
  });

  return data.filter(item => {
    return item[parentIdName] === rootId || !map[item[parentIdName]];
  });
}

// ------------------ 授权功能方法 ------------------

/**
 * 1. 弹出授权模态框，并加载角色已有权限 ID & 全部菜单权限
 * @param {object} row 当前角色数据
 */
const onAuthRole = (row) => {
  // 1. 设置当前角色信息
  currentAuthRole.value = {
    id: row.id,
    name: row.name,
    remarks: row.remarks
  };

  // ⚠️ 重置权限树控制状态
  isExpandAll.value = false;
  isCheckAll.value = false;
  isLinkage.value = true; // 默认开启联动

  // **【修改点 2：并发请求加载所有权限菜单和角色已有权限】**
  Promise.all([
    // A. 加载所有权限菜单（假设接口返回扁平列表）
    axios.get('/perms/list'),
    // B. 加载角色已拥有的权限 ID
    axios.get(`/role/getRoleById`, { params: { id: row.id } })
  ]).then(([allPermsRes, roleDataRes]) => {

    // --- 处理 A: 所有权限菜单 ---
    const allPermsData = allPermsRes.data.data || allPermsRes.data;

    // 转换为树形结构并存储
    allPermsMenus.value = handleTree(allPermsData);

    // --- 处理 B: 角色已有权限 ID ---
    const roleData = roleDataRes.data.data || roleDataRes.data;
    const permsString = roleData.perms;

    if (typeof permsString === 'string' && permsString) {
      try {
        rolePermsIds.value = JSON.parse(permsString);
      } catch (e) {
        console.error("解析权限ID字符串失败:", permsString, e);
        ElMessage.error('后端返回的权限数据格式错误！');
        rolePermsIds.value = [];
      }
    } else if (Array.isArray(permsString)) {
      rolePermsIds.value = permsString;
    } else {
      rolePermsIds.value = [];
    }

    // 3. 打开模态框
    assignPermsModalVisible.value = true;

    // 4. 等待 DOM 渲染后，设置默认勾选状态和初始化展开/勾选状态
    nextTick(() => {
      if (treeRef.value) {
        // 设置默认勾选状态
        treeRef.value.setCheckedKeys(rolePermsIds.value, false);

        // 默认不展开
        const nodes = treeRef.value.store.nodesMap;
        for (const key in nodes) {
          nodes[key].expanded = false;
        }
      }
    });

  }).catch(error => {
    console.error("加载权限数据失败:", error);
    ElMessage.error('加载权限数据失败，请检查网络和接口！');
    assignPermsModalVisible.value = false;
  });
};


// ------------------ 权限树控制方法 ------------------

/**
 * 切换权限树的展开/折叠状态
 */
const handleExpandAll = (value) => {
  if (!treeRef.value) return;

  // 遍历所有节点，设置其展开状态
  const nodes = treeRef.value.store.nodesMap;
  for (const key in nodes) {
    nodes[key].expanded = value;
  }
};

/**
 * 切换权限树的全选/全不选状态
 * @param {boolean} value 勾选状态
 */
const handleCheckAll = (value) => {
  if (!treeRef.value) return;

  // 获取所有节点的 key
  const allKeys = [];
  const getKeys = (menus) => {
    menus.forEach(menu => {
      allKeys.push(menu.id);
      if (menu.children) {
        getKeys(menu.children);
      }
    });
  };
  // 遍历的是加载进来的所有权限菜单
  getKeys(allPermsMenus.value);

  if (value) {
    // 全选: 设置所有 key 为选中状态
    treeRef.value.setCheckedKeys(allKeys, false);
  } else {
    // 全不选: 清空选中状态
    treeRef.value.setCheckedKeys([]);
  }
};


/**
 * 切换父子联动状态 (check-strictly) 【已优化，解决父节点被清除问题】
 * @param {boolean} value 联动状态 (true: 联动, false: 独立勾选)
 */
const toggleLinkage = (value) => {
  if (!treeRef.value) return;

  // 1. 获取当前所有【完整选中】的节点 ID
  const fullyCheckedKeys = treeRef.value.getCheckedKeys(false, false);

  // 2. 获取当前所有【半选中】的节点 ID
  const halfCheckedKeys = treeRef.value.getHalfCheckedKeys();

  // 3. 将全选和半选的 keys 合并
  const allCurrentKeys = [...fullyCheckedKeys, ...halfCheckedKeys];

  nextTick(() => {
    if (treeRef.value) {
      // 4. 清除所有选中状态
      treeRef.value.setCheckedKeys([]);

      if (value) {
        // 切换到【父子联动】(check-strictly=false) 模式：
        // 只设置叶子节点，让 Tree 组件根据联动规则向上推导父节点状态。
        const leafKeysToSet = [];
        const findLeafKeys = (menus) => {
          menus.forEach(menu => {
            // 如果节点在切换前是【完整选中】状态
            if (fullyCheckedKeys.includes(menu.id)) {
              // 策略：只设置叶子节点
              if (!menu.children || menu.children.length === 0) {
                leafKeysToSet.push(menu.id);
              }
            }
            if (menu.children) {
              findLeafKeys(menu.children);
            }
          });
        };
        // 遍历的是加载进来的所有权限菜单
        findLeafKeys(allPermsMenus.value);

        // 重新设置叶子节点
        treeRef.value.setCheckedKeys(leafKeysToSet, false);
      } else {
        // 切换到【独立勾选】(check-strictly=true) 模式：
        // 直接设置所有当前关注的 keys。在独立模式下，这些 keys 都会被设置为 fullyChecked，从而保留父节点的勾选。
        treeRef.value.setCheckedKeys(allCurrentKeys, false);
      }

      ElMessage.info(`父子联动已${value ? '开启' : '关闭'}`);
    }
  });
};


/**
 * 3. 提交授权结果
 */
const onSavePerms = () => {
  // 1. 获取所有选中和半选中的节点 ID
  // 第二个参数为 true，获取所有全选和半选的节点，以确保所有上级菜单的 ID 都能提交
  const checkedKeys = treeRef.value.getCheckedKeys(false, true);

  if (checkedKeys.length === 0) {
    ElMessage.warning('请至少选择一个权限。');
    return;
  }

  const submitData = {
    id: currentAuthRole.value.id, // 角色 ID
    perms: checkedKeys,         // 权限 IDs
    // 允许修改角色名和备注
    name: currentAuthRole.value.name,
    remarks: currentAuthRole.value.remarks
  };

  // 2. 提交到后端 (使用 PUT /role/updateRole 接口)
  axios.put('/role/updateRole', submitData).then(res => {
    if (res.data.success || res.code === 200) {
      ElMessage.success(res.data.message || '权限分配成功！');
      getRoleList(); // 刷新列表
    } else {
      ElMessage.error(res.data.message || '权限分配失败！');
    }
    assignPermsModalVisible.value = false;
  }).catch(error => {
    console.error("权限分配失败:", error);
    ElMessage.error('权限分配失败，请检查网络和接口！');
  });
};


// ------------------ CRUD & 列表方法 (保持不变) ------------------
const getRoleList = () => {
  const params = {
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    name: searchName.value,
    remarks: searchRemarks.value
  };
  axios.get('/role/getRoleList', {params: params}).then(res => {
    roleList.value = res.data.data
    page.total = res.data.total
  })
}
const onSearch = () => {
  page.currentPage = 1
  getRoleList()
}
const onReset = () => {
  searchName.value = ""
  searchRemarks.value = ""
  page.currentPage = 1
  getRoleList()
}
const handlePageChange = (newPage) => {
  page.currentPage = newPage
  getRoleList()
}
const handleSizeChange = (newSize) => {
  page.pageSize = newSize
  page.currentPage = 1
  getRoleList()
}
const closeModal = () => {
  newRole.value = {name: "", remarks: ""}
  addModalVisible.value = false
}
const onAddRole = () => {
  axios.post("/role/addRole", newRole.value).then(res => {
    ElMessage.success(`添加角色成功：${res.data.message || '操作成功'}`)
    closeModal();
    page.currentPage = 1;
    getRoleList();
  }).catch(error => {
    console.error("添加角色失败:", error);
    ElMessage.error('添加角色失败，请检查网络或权限！');
  })
}
const onDeleteRole = (row) => {
  ElMessageBox.confirm(
      `确定要删除角色【${row.name}】吗？删除后将不可用。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    axios.delete('/role/deleteRole',  {
      params: {
        id: row.id
      }
    }).then(res => {
      if (res.code === 200) {
        ElMessage.success(`角色【${row.name}】删除成功！`);
        getRoleList();
      } else {
        ElMessage.error(res.msg || '删除角色失败！');
      }
    }).catch(() => {
      ElMessage.error('删除请求失败！');
    })
  }).catch(() => {
    ElMessage.info('已取消删除操作。');
  });
}
const onEditRole = (row) => {
  axios.get('/role/getRoleById', {
    params: {
      id: row.id
    }
  }).then(res => {
    editRole.value = res.data.data;
    editModalVisible.value = true;
  })
}
const closeEditModal = () => {
  editRole.value = {}
  editModalVisible.value = false
}
const onUpdateRole = () => {
  axios.put("/role/updateRole", editRole.value).then(res => {
    ElMessage.success(`修改角色成功ID:  ${editRole.value.id},角色: ${res.data.message || '操作成功'}`);
    closeEditModal();
    getRoleList();
  }).catch(() => {
    ElMessage.error('修改角色失败！');
  })
}

// ------------------ 权限校验方法 ------------------
function hasPerm(perm) {
  return menuStore.hasPerm(perm);
}

// ------------------ 生命周期 ------------------
onMounted(() => {
  getRoleList()
})
</script>

<template>
  <div class="role-page" style="padding: 20px">

    <el-row :gutter="10" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-input v-model="searchName" placeholder="请输入角色名称" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="6">
        <el-input v-model="searchRemarks" placeholder="请输入权限备注" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="12">
        <el-button type="primary" @click="onSearch" v-if="hasPerm('system:role:query')">搜索</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="success" @click="addModalVisible = true" v-if="hasPerm('system:role:add')">添加角色</el-button>
      </el-col>
    </el-row>

    <el-dialog
        title="添加角色"
        v-model="addModalVisible"
        width="400px"
        :close-on-click-modal="false"
        @close="closeModal"
    >
      <el-form :model="newRole">
        <el-form-item label="角色名称" label-width="80px">
          <el-input v-model="newRole.name"/>
        </el-form-item>
        <el-form-item label="权限备注" label-width="80px">
          <el-input v-model="newRole.remarks"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeModal">取消</el-button>
        <el-button type="primary" @click="onAddRole">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
        title="修改角色"
        v-model="editModalVisible"
        width="400px"
        :close-on-click-modal="false"
        @close="closeEditModal"
    >
      <el-form v-if="editRole.id" :model="editRole">
        <el-form-item label="ID" label-width="80px">
          <el-input v-model="editRole.id" disabled/>
        </el-form-item>
        <el-form-item label="角色名称" label-width="80px">
          <el-input v-model="editRole.name"/>
        </el-form-item>
        <el-form-item label="权限备注" label-width="80px">
          <el-input v-model="editRole.remarks"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeEditModal">取消</el-button>
        <el-button type="primary" @click="onUpdateRole">确定修改</el-button>
      </template>
    </el-dialog>

    <el-dialog
        :title="`分配权限 - ${currentAuthRole.name}`"
        v-model="assignPermsModalVisible"
        width="500px"
        :close-on-click-modal="false"
    >
      <el-form label-width="80px" style="margin-bottom: 15px;">
        <el-row :gutter="10">
          <el-col :span="24"> <el-form-item label="角色名称" prop="name">
            <el-input v-model="currentAuthRole.name" />
          </el-form-item>
          </el-col>
          <el-col :span="24"> <el-form-item label="权限备注" prop="remarks">
            <el-input v-model="currentAuthRole.remarks" />
          </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="tree-controls" style="margin-bottom: 15px;">
        <span style="margin-right: 15px; font-weight: bold;">菜单权限：</span>
        <el-checkbox v-model="isExpandAll" @change="handleExpandAll" label="展开/折叠" border size="small" />
        <el-checkbox v-model="isCheckAll" @change="handleCheckAll" label="全选/全不选" border size="small" />
        <el-checkbox v-model="isLinkage" @change="toggleLinkage" label="父子联动" border size="small" />
      </div>
      <el-scrollbar max-height="400px">
        <el-tree
            ref="treeRef"
            :data="allPermsMenus" :props="treeProps"
            node-key="id"
            show-checkbox
            :check-strictly="!isLinkage"
            :default-expand-all="false"
            :default-checked-keys="rolePermsIds"
        />
      </el-scrollbar>

      <template #footer>
        <el-button @click="assignPermsModalVisible = false">取 消</el-button>
        <el-button type="primary" @click="onSavePerms">提 交</el-button>
      </template>
    </el-dialog>


    <el-table :data="roleList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="name" label="角色名称"/>
      <el-table-column prop="remarks" label="权限备注"/>
      <el-table-column prop="deleted" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.deleted === 0 ? 'success' : 'info'">
            {{ row.deleted === 0 ? '可用' : '已删除' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="onEditRole(row)" v-if="hasPerm('system:role:edit')">修改</el-button>

          <el-button
              type="danger"
              size="small"
              @click="onDeleteRole(row)"
              v-if="hasPerm('system:role:remove')"
              :disabled="row.id === 1"
          >删除</el-button>

          <el-button
              type="warning"
              size="small"
              @click="onAuthRole(row)"
              v-if="hasPerm('system:role:auth')"
          >授权</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
        style="margin-top: 20px; text-align: right;"
        background
        layout="total, sizes, prev, pager, next"
        :total="page.total"
        :page-size="page.pageSize"
        :current-page="page.currentPage"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
    />
  </div>
</template>


<style scoped>
/* 样式可以根据需要自行添加 */
.tree-controls .el-checkbox {
  margin-right: 10px;
}
</style>