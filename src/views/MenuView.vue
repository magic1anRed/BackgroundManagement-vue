<script setup>
import { ref, onMounted, reactive, watch } from 'vue';
import { Search, Refresh, Plus, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 引入 Element Plus 所有图标
import * as ElIcons from '@element-plus/icons-vue';

// 提取所有图标的名称数组
const iconNames = Object.keys(ElIcons);

// --- 扁平数据转树形结构工具函数 (保持不变) ---
function handleTree(data, idName = 'id', parentIdName = 'parentId', rootId = 0) {
  if (!Array.isArray(data)) { return []; }
  const map = {};
  data.forEach(item => {
    item.children = [];
    map[item[idName]] = item;
  });

  data.forEach(item => {
    const parent = map[item[parentIdName]];
    if (parent) {
      parent.children.push(item);
    }
  });

  return data.filter(item => {
    return item[parentIdName] === rootId || !map[item[parentIdName]];
  });
}

// --- 数据模型 ---
const queryParams = ref({
  name: undefined,
  status: undefined,
});
const loading = ref(true);
const menuList = ref([]);
const queryFormRef = ref(null);
const menuFormRef = ref(null); // 表单引用

// --- 模态框及表单数据 ---
const dialog = reactive({
  visible: false,
  title: '',
});

// 图标选择对话框状态
const iconDialog = reactive({
  visible: false,
});

const defaultForm = {
  id: undefined,
  parentId: 0, // 默认顶级菜单
  name: '',
  sortId: 0,
  icon: '', // **新增字段**
  identifier: '',
  path: '',
  type: 2, // 默认菜单
  status: 1, // 默认正常
};

const form = ref({ ...defaultForm });

const rules = reactive({
  name: [{ required: true, message: '菜单名称不能为空', trigger: 'blur' }],
  sortId: [{ required: true, message: '排序不能为空', trigger: 'blur' }],
  // 校验规则根据菜单类型动态调整
  identifier: [
    {
      required: true,
      message: '权限标识不能为空',
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.value.type !== 1 && !value) { // 菜单和按钮必填
          callback(new Error('权限标识不能为空'));
        } else {
          callback();
        }
      },
    }
  ],
  path: [
    {
      required: true,
      message: '路由地址不能为空',
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.value.type !== 3 && !value) { // 目录和菜单必填
          callback(new Error('路由地址不能为空'));
        } else {
          callback();
        }
      },
    }
  ],
});

// 监听菜单类型变化，调整必填校验 (虽然已在 rules 中动态实现，但这里可以进一步增强体验)
watch(() => form.value.type, (newType) => {
  // 确保在 type 变化时清除旧的校验状态，以便新规则生效
  // 这种动态校验最好是在 submitForm 中手动处理，或使用自定义校验
});


// --- 查询后端接口 (保持不变) ---
const getMenuList = () => {
  loading.value = true;
  const params = {
    name: queryParams.value.name,
    status: queryParams.value.status,
  };
  const url = '/perms/getPerms';

  // 模拟数据结构，实际应从后端获取
  // 假设后端返回的数据包含 id, parentId, name, icon 等字段
  // 为了测试图标功能，假设后端返回的数据中包含 icon 字段，例如 'HomeFilled', 'Setting', 'User' 等
  axios.get(url, { params })
      .then(res => {
        const flatList = res.data;
        menuList.value = handleTree(flatList, 'id', 'parentId', 0);
      })
      .catch(error => {
        console.error('获取菜单列表失败:', error);
        ElMessage.error('获取菜单列表失败，请检查网络或后端接口。');
        // 如果后端接口失败，可以使用一些模拟数据进行调试
        menuList.value = handleTree([
          { id: 1, parentId: 0, name: '系统管理', icon: 'Setting', sortId: 0, identifier: '', path: '/system', type: 1, status: 1 },
          { id: 2, parentId: 1, name: '用户管理', icon: 'User', sortId: 1, identifier: 'system:user:list', path: '/system/user', type: 2, status: 1 },
          { id: 3, parentId: 1, name: '角色管理', icon: 'Key', sortId: 2, identifier: 'system:role:list', path: '/system/role', type: 2, status: 1 },
          { id: 4, parentId: 2, name: '新增用户', icon: '', sortId: 0, identifier: 'system:user:add', path: '', type: 3, status: 1 },
          { id: 5, parentId: 0, name: '首页', icon: 'HomeFilled', sortId: 1, identifier: '', path: '/home', type: 2, status: 1 },
        ], 'id', 'parentId', 0);
      })
      .finally(() => {
        loading.value = false;
      });
};

// --- 图标选择操作 (新增) ---

/** 打开图标选择对话框 */
const openIconSelect = () => {
  iconDialog.visible = true;
};

/** 选择图标 */
const selectIcon = (iconName) => {
  form.value.icon = iconName;
  iconDialog.visible = false;
};

// --- 表单操作 (保持不变) ---
const handleQuery = () => {
  getMenuList();
};

const resetQuery = () => {
  queryFormRef.value.resetFields();
  getMenuList();
};

// --- CRUD 操作 (修改和新增) ---

/** 重置表单和关闭模态框 */
const resetForm = () => {
  // 注意：在 Element Plus 2.x 中，ref 的 resetFields() 应该在 dialog 关闭前调用
  // 并在 nextTick 或 dialog visible 状态变化后调用，以确保 dom 存在
  // 这里我们先重置数据，然后在关闭对话框后自动清除校验状态（如果需要）
  form.value = { ...defaultForm }; // 重置数据
  menuFormRef.value?.resetFields(); // 确保重置校验状态
  dialog.visible = false;
};

const cancel = () => {
  resetForm();
};

/** 新增按钮操作 */
const handleAdd = (row) => {
  resetForm(); // 重置数据和校验
  if (row) {
    // 新增子菜单，继承父ID
    form.value.parentId = row.id;
  }
  // 目录默认 type=1, 菜单默认 type=2
  form.value.type = row?.type === 1 ? 2 : 1; // 默认给子级菜单 type=2
  dialog.title = '新增菜单';
  dialog.visible = true;
};

/** 修改按钮操作 */
const handleUpdate = (row) => {
  resetForm();
  // 复制当前行数据到表单
  form.value = { ...row };

  dialog.title = '修改菜单';
  dialog.visible = true;
};

/** 提交按钮 */
const submitForm = () => {
  menuFormRef.value?.validate(valid => {
    if (valid) {
      // 提交前进行一些数据处理，例如按钮类型不需要 path 和 icon
      const submitData = { ...form.value };
      if (submitData.type === 3) { // 按钮类型
        submitData.path = '';
        submitData.icon = '';
      }

      if (submitData.id !== undefined) {
        // --- 执行修改操作 (PUT) ---
        console.log('[修改操作预留] 提交数据:', submitData);
        // axios.put('/perms/updatePerms', submitData).then(...).catch(...)
        ElMessage.success(`[修改操作预留] 菜单"${submitData.name}"修改成功 (模拟)`);

      } else {
        // --- 执行新增操作 (POST) ---
        console.log('[新增操作预留] 提交数据:', submitData);
        // axios.post('/perms/addPerms', submitData).then(...).catch(...)
        ElMessage.success(`[新增操作预留] 菜单"${submitData.name}"新增成功 (模拟)`);
      }
      resetForm();
      getMenuList(); // 刷新列表
    } else {
      ElMessage.error('表单校验失败，请检查输入项。');
      return false;
    }
  });
};

/** 删除按钮操作 (保持不变) */
const handleDelete = (row) => {
  ElMessageBox.confirm(
      `是否确认删除菜单名称为"${row.name}"的数据项?`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    // 实际删除请求预留位置
    console.log(`[删除操作预留] 准备删除菜单ID: ${row.id}`);
    // axios.delete(`/perms/deletePerms/${row.id}`).then(...).catch(...)
    ElMessage.success(`[删除操作预留] 菜单"${row.name}"删除成功 (模拟)`);
    getMenuList(); // 刷新列表
  }).catch(() => {});
};

// --- 生命周期 ---
onMounted(() => {
  getMenuList();
});
</script>


<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-4">
      <el-form :inline="true" :model="queryParams" ref="queryFormRef" @submit.prevent>
        <el-form-item label="菜单名称" prop="name">
          <el-input
              v-model="queryParams.name"
              placeholder="请输入菜单名称"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select
              v-model="queryParams.status"
              placeholder="菜单状态"
              clearable
              style="width: 100px"
          >
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">搜索</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">菜单列表</span>
          <el-button type="primary" :icon="Plus" @click="handleAdd(null)">新增</el-button>
        </div>
      </template>
      <el-table
          :data="menuList"
          v-loading="loading"
          row-key="id"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          style="width: 100%"
          border
      >
        <el-table-column prop="name" label="菜单名称" width="200" :show-overflow-tooltip="true" />
        <el-table-column label="图标" align="center" width="80">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="20">
              <component :is="row.icon" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="sortId" label="排序" align="center" width="80" />
        <el-table-column prop="identifier" label="权限标识" :show-overflow-tooltip="true" />
        <el-table-column prop="path" label="组件路径" :show-overflow-tooltip="true" />
        <el-table-column prop="status" label="状态" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Plus" @click="handleAdd(row)">新增</el-button>
            <el-button link type="primary" :icon="Edit" @click="handleUpdate(row)">修改</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <hr/>

    <el-dialog :title="dialog.title" v-model="dialog.visible" width="600px" @close="cancel">
      <el-form ref="menuFormRef" :model="form" :rules="rules" label-width="100px">

        <el-form-item v-if="form.parentId !== 0" label="上级菜单">
          <el-tree-select
              v-model="form.parentId"
              :data="menuList"
              :props="{ value: 'id', label: 'name', children: 'children' }"
              value-key="id"
              placeholder="选择上级菜单"
              check-strictly
              filterable
              clearable
              style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="菜单类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :label="1">目录</el-radio>
            <el-radio :label="2">菜单</el-radio>
            <el-radio :label="3">按钮</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-row>
          <el-col :span="12">
            <el-form-item label="菜单名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入菜单名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序" prop="sortId">
              <el-input-number v-model="form.sortId" controls-position="right" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="form.type !== 3" label="菜单图标">
          <el-input
              v-model="form.icon"
              placeholder="点击选择图标"
              readonly
              @click="openIconSelect"
          >
            <template #prefix>
              <el-icon v-if="form.icon" class="el-input__icon"><component :is="form.icon" /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="form.type !== 1" label="权限标识" prop="identifier">
          <el-input v-model="form.identifier" placeholder="例如: system:user:list" />
        </el-form-item>

        <el-form-item v-if="form.type !== 3" label="路由地址" prop="path">
          <el-input v-model="form.path" placeholder="请输入路由地址" />
        </el-form-item>

        <el-form-item label="菜单状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>

      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">提 交</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="选择图标" v-model="iconDialog.visible" width="800px">
      <div class="icon-select-grid">
        <div
            v-for="(iconName, index) in iconNames"
            :key="index"
            class="icon-item"
            @click="selectIcon(iconName)"
            :class="{ 'is-active': form.icon === iconName }"
        >
          <el-icon :size="24"><component :is="iconName" /></el-icon>
          <span class="icon-name">{{ iconName }}</span>
        </div>
      </div>
    </el-dialog>

  </div>
</template>




<style scoped>
/* 样式保持不变 */
.app-container {
  padding: 20px;
}
.mb-4 {
  margin-bottom: 16px;
}
.flex {
  display: flex;
}
.justify-between {
  justify-content: space-between;
}
.items-center {
  align-items: center;
}
hr {
  margin: 20px 0;
  border: 0;
  border-top: 1px solid #ebeef5;
}

/* 图标选择器样式 */
.icon-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); /* 每行显示4-6个图标 */
  gap: 10px;
  max-height: 50vh;
  overflow-y: auto;
  padding: 10px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 5px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  overflow: hidden; /* 确保名称不会溢出 */
  white-space: nowrap;
}

.icon-item:hover {
  border-color: #409eff;
  color: #409eff;
}

.icon-item.is-active {
  border-color: #409eff;
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
}

.icon-name {
  margin-top: 5px;
  font-size: 12px;
  color: #606266;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>