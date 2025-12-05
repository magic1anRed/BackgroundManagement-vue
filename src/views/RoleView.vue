<script setup>
import {ref, reactive, onMounted} from "vue"
import {ElMessage, ElMessageBox} from "element-plus";
import {useMenuStore} from "@/stores/menus.js"; // 假设您已将权限封装进此 Store

// 注意：这里需要确保您在项目中全局引入了 axios 或类似的 HTTP 客户端
// ------------------ 响应式数据 ------------------
const roleList = ref([]) // 角色数据（当前页数据）
const searchName = ref("") // 搜索关键字：角色名称
const searchRemarks = ref("") // 新增搜索关键字：权限备注

// 分页
const page = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

// 添加角色模态框
const addModalVisible = ref(false)
// newRole 用于新增角色
const newRole = ref({
  name: "",
  remarks: "" // 新增 remarks 字段
})

// ------------------ 获取列表方法 ------------------
const getRoleList = () => {
  const params = {
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    name: searchName.value,     // 角色名称模糊查询
    remarks: searchRemarks.value // 权限备注模糊查询
  };
  // 接口路径修改为 /system/role/getRoleList
  axios.get('/role/getRoleList', {params: params}).then(res => {
    // 假设后端返回的数据结构与部门接口类似
    roleList.value = res.data.data
    page.total = res.data.total
  })
}

// ------------------ 搜索和重置 ------------------
const onSearch = () => {
  page.currentPage = 1 // 搜索时重置回第一页
  getRoleList()
}

const onReset = () => {
  searchName.value = ""
  searchRemarks.value = ""
  page.currentPage = 1
  getRoleList()
}

// ------------------ 页码和页大小变化 ------------------
const handlePageChange = (newPage) => {
  page.currentPage = newPage
  getRoleList()
}

const handleSizeChange = (newSize) => {
  page.pageSize = newSize
  page.currentPage = 1
  getRoleList()
}

// ------------------ 模态框事件处理 (新增) ------------------
const closeModal = () => {
  // 清空新增表单逻辑
  newRole.value = {name: "", remarks: ""}
  addModalVisible.value = false
}


// ------------------ 操作方法（新增角色） ------------------
const onAddRole = () => {
  // 接口路径修改为 /role/addRole
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

// ------------------ 操作方法（删除角色） ------------------
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
      console.log("-------------", res);
      if (res.code === 200) {
        ElMessage.success(`角色【${row.name}】删除成功！`);
        getRoleList(); // 刷新列表
      } else {
        ElMessage.error(res.msg || '删除角色失败！');
      }
    })
  }).catch(() => {
    ElMessage.info('已取消删除操作。');
  });
}

// ------------------ 【新增/修改】编辑角色相关数据和方法 ------------------

// 1. 响应式数据
const editModalVisible = ref(false) // 控制编辑模态框显示
const editRole = ref({}) // 存储当前正在编辑的角色对象

// 2. 方法：弹出编辑模态框 (先查询后渲染)
const onEditRole = (row) => {
  // 接口路径修改为 /role/getRoleById
  axios.get('/role/getRoleById', {
    params: {
      id: row.id // 传入要查询的角色 ID
    }
  }).then(res => {
    editRole.value = res.data;
    editModalVisible.value = true;
    console.log("正在通过 ID 渲染角色数据:", editRole.value)
  })
}

// 3. 方法：关闭编辑模态框
const closeEditModal = () => {
  editRole.value = {} // 清空编辑表单数据
  editModalVisible.value = false
}

// 4. 方法：提交编辑角色信息
const onUpdateRole = () => {
  // 接口路径修改为 /role/updateRole
  axios.put("/role/updateRole", editRole.value).then(res => {
    console.log(res)
    ElMessage.success(`修改角色成功ID:  ${editRole.value.id},角色: ${res.data.message || '操作成功'}`);
    closeEditModal();
    getRoleList(); // 刷新列表
  })
}

// ------------------ 按钮权限校验方法 ------------------
const menuStore = useMenuStore();
function hasPerm(perm) {
  // 直接调用 Store 中封装好的 hasPerm 方法
  return menuStore.hasPerm(perm);
}
// ------------------ 生命周期 ------------------
// 页面加载完成后调用一次接口
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

    <el-table :data="roleList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="name" label="角色名称"/>
      <el-table-column prop="remarks" label="权限备注"/> <el-table-column prop="deleted" label="状态" width="100">
      <template #default="{ row }">
        <el-tag :type="row.deleted === 0 ? 'success' : 'info'">
          {{ row.deleted === 0 ? '可用' : '已删除' }}
        </el-tag>
      </template>
    </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="onEditRole(row)" v-if="hasPerm('system:role:edit')">修改</el-button>

          <el-button
              type="danger"
              size="small"
              @click="onDeleteRole(row)"
              v-if="hasPerm('system:role:remove')"
              :disabled="row.id === 1"
          >删除</el-button>

          <el-button type="warning" size="small" :disabled="true">授权</el-button>
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