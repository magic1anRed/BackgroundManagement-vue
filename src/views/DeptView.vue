<script setup>
import {ref, computed, reactive, onMounted} from "vue"
import {ElMessage, ElMessageBox} from "element-plus";
import {useCurrentUserStore} from "@/stores/currentUser.js";
import {useMenuStore} from "@/stores/menus.js";

// 注意：这里需要确保您在项目中全局引入了 axios 或类似的 HTTP 客户端
// 否则需要在这里 import axios from 'axios';

// ------------------ 响应式数据 ------------------
const deptList = ref([]) // 部门数据（当前页数据）
const searchName = ref("") // 搜索关键字

// 分页
const page = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0 // 新增 total 字段，用于接收后端返回的总条数
})

// 添加部门模态框
const addModalVisible = ref(false)
// newDept 使用 reactive 更符合 Vue 3 习惯，但这里保持 ref 也可以
const newDept = ref({name: ""})

// ------------------ 获取列表方法 ------------------
const getDeptList = () => {
  const params = {
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    name: searchName.value // 将搜索关键字加入到请求参数
  };
  axios.get('/dept/getDeptList', {params: params}).then(res => {
    deptList.value = res.data.data.data
    page.total = res.data.data.total
  })
}

// ------------------ 搜索和重置 ------------------
const onSearch = () => {
  page.currentPage = 1 // 搜索时重置回第一页
  getDeptList() // 重新请求数据，此时 searchName 会作为参数传递
}

const onReset = () => {
  searchName.value = ""
  page.currentPage = 1
  getDeptList() // 重新请求数据
}

// ------------------ 页码和页大小变化 ------------------
const handlePageChange = (newPage) => {
  page.currentPage = newPage // 更新页码
  getDeptList() // 重新请求后端数据
}

const handleSizeChange = (newSize) => {
  page.pageSize = newSize
  page.currentPage = 1 // 切换每页大小后，回到第一页
  getDeptList() // 重新请求后端数据
}

// ------------------ 模态框事件处理 (新增) ------------------
const closeModal = () => {
  // 统一处理清空逻辑
  newDept.value = {name: ""}
  addModalVisible.value = false
}


// ------------------ 操作方法（占位） ------------------
const onAddDept = () => {
  // 实际逻辑：调用添加接口，成功后刷新列表
  console.log("添加部门接口占位", newDept.value)
  axios.post("/dept/addDept",newDept.value).then(res => {
    console.log(res)
    // 假设后端返回的数据结构中包含 message
    ElMessage.success(`添加部门成功：${res.message || '操作成功'}`)

    // 成功后：
    closeModal(); // 关闭模态框并清空表单
    page.currentPage = 1;
    getDeptList();
  }).catch(error => {
    console.error("添加部门失败:", error);
    ElMessage.error('添加部门失败，请检查网络或权限！');
  })
}

// ------------------ 操作方法（删除） ------------------
const onDeleteDept = (row) => {
  // 1. 弹出确认框
  ElMessageBox.confirm(
      `确定要删除部门【${row.name}】吗？删除后可恢复，但将不可用。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    // 2. 用户点击“确定”后，调用删除接口
    // 注意：后端是 @Delete，所以使用 axios.delete
    axios.delete('/dept/deleteDept',  {
      params: {
        id: row.id // 从 row 中获取部门 ID
      }
    }).then(res => {
      console.log(res)
      if (res.data.code !== 200){
        ElMessage.error(res.data.msg || '删除部门失败！');
      }else {
        // 3. 成功处理
        ElMessage.success(`部门【${row.name}】删除成功！`);
      }
      getDeptList(); // 刷新列表
    }).catch(error => {
      console.error("删除失败:", error);
      ElMessage.error('删除部门失败！');
    });
  }).catch(() => {
    // 用户点击“取消”
    ElMessage.info('已取消删除操作。');
  });
}

// ------------------ 【新增/修改】编辑部门相关数据和方法 ------------------

// 1. 响应式数据
const editModalVisible = ref(false) // 控制编辑模态框显示
const editDept = ref({}) // 存储当前正在编辑的部门对象

// 2. 方法：弹出编辑模态框
const onEditDept = (row) => {
  console.log("正在通过 ID 查询部门数据:", row.id);

  // 关键修改：先调用接口查询最新的部门数据
  axios.get('/dept/getDeptById', {
    params: {
      id: row.id // 传入要查询的部门 ID
    }
  }).then(res => {
      editDept.value = res.data
      editModalVisible.value = true; // 显示模态框
  })
}

// 3. 方法：关闭编辑模态框
const closeEditModal = () => {
  editDept.value = {} // 清空编辑表单数据
  editModalVisible.value = false
}

// 4. 方法：提交编辑部门信息
const onUpdateDept = () => {
  // **实际逻辑：** 调用修改接口
  axios.put("/dept/updateDept", editDept.value).then(res => {
    console.log(res)
    ElMessage.success(`修改部门成功ID:  ${editDept.value.id},部门: ${res.data.message || '操作成功'}`);
    closeEditModal();
    getDeptList(); // 刷新列表
  }).catch(error => {
    console.error("修改部门失败:", error);
    ElMessage.error('修改部门失败，请检查网络或权限！');
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
  getDeptList()
})
</script>

<template>
  <div class="department-page" style="padding: 20px">

    <el-row :gutter="10" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-input v-model="searchName" placeholder="请输入部门名称" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="18">
        <el-button type="primary" @click="onSearch" v-if="hasPerm('system:dept:query')">搜索</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="success" @click="addModalVisible = true" v-if="hasPerm('system:dept:add')">添加部门</el-button>
      </el-col>
    </el-row>

    <el-dialog
        title="添加部门"
        v-model="addModalVisible"
        width="400px"
        :close-on-click-modal="false"
        @close="closeModal"
    >
      <el-form :model="newDept">
        <el-form-item label="部门名称" label-width="80px">
          <el-input v-model="newDept.name"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeModal">取消</el-button>
        <el-button type="primary" @click="onAddDept">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
        title="修改部门"
        v-model="editModalVisible"
        width="400px"
        :close-on-click-modal="false"
        @close="closeEditModal"
    >
      <el-form v-if="editDept.id" :model="editDept">
        <el-form-item label="ID" label-width="80px">
          <el-input v-model="editDept.id" disabled/>
        </el-form-item>
        <el-form-item label="部门名称" label-width="80px">
          <el-input v-model="editDept.name"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeEditModal">取消</el-button>
        <el-button type="primary" @click="onUpdateDept">确定修改</el-button>
      </template>
    </el-dialog>

    <el-table :data="deptList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="name" label="部门名称"/>
      <el-table-column prop="deleted" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.deleted === 0 ? 'success' : 'info'">
            {{ row.deleted === 0 ? '可用' : '已删除' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="onEditDept(row)" v-if="hasPerm('system:dept:edit')">修改</el-button>
          <el-button type="danger" size="small" @click="onDeleteDept(row)"  v-if="hasPerm('system:dept:remove')">删除</el-button>
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