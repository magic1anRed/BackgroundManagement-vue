<script setup>
import {ref, reactive, onMounted} from "vue"
import {ElMessage, ElMessageBox} from "element-plus";
import {useMenuStore} from "@/stores/menus.js";
import qs from "qs";

// ------------------ 辅助数据 - 部门和角色数据 ------------------
const deptOptions = ref([]); // 部门下拉框数据
const roleOptions = ref([]); // 角色下拉框数据

/**
 * 获取部门和角色下拉框数据。
 * 接口: /dept/getDeptName, /role/getRoleName
 * 【核心修改】：直接赋值返回的对象数组，不再需要前端转换。
 */
const loadDeptAndRoleOptions = () => {
  // 1. 获取部门名称
  axios.get('/dept/getDeptName').then(res => {
    // 既然控制台显示 res.data 是 [{id: N, name: 'X'}] 数组，直接赋值
    deptOptions.value = res.data;
  })
  // 2. 获取角色名称
  axios.get('/role/getRoleName').then(res => {
    // 直接赋值返回的对象数组
    roleOptions.value = res.data;
  })
}

// ------------------ 响应式数据 (保持不变) ------------------
const userList = ref([]) // 用户数据（当前页数据）
const searchUsername = ref("")
const searchRealname = ref("")
const searchRemarks = ref("")
const searchStatus = ref(null)

// 分页
const page = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 添加用户模态框
const addModalVisible = ref(false)
const newUser = ref({
  username: "",
  realname: "",
  password: "",
  remarks: "",
  status: 1, // 1 代表正常
  roleId: null, // 保持 null，确保用户选择
  deptID: null  // 保持 null，确保用户选择
})

// 编辑用户模态框
const editModalVisible = ref(false)
const editUser = ref({})


// ------------------ 核心 CRUD 方法 (使用 qs 传参) ------------------


const getSearchParams = () => {
  return {
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    username: searchUsername.value,
    realname: searchRealname.value,
    remarks: searchRemarks.value,
    status: searchStatus.value
  };
}


// 接口: /user/userList (GET 请求，使用 qs 序列化 URL 参数)
const getUserList = () => {
  const params = getSearchParams();

  axios.get('/user/userList', {
    params: params,
    paramsSerializer: params => {
      // 保留 null 字段，防止 @status 报错
      return qs.stringify(params, {allowDots: true, skipNulls: false})
    }
  }).then(res => {
    console.log(res)
    userList.value = res.data.data;
    page.total = res.data.total;
  })
      .catch(error => {
        console.error("获取用户列表失败:", error);
        ElMessage.error('获取用户列表失败！');
      });
}

// 接口: /user/updateUser (用于修改状态) (PUT 请求，使用 qs 序列化请求体)
const onStatusChange = (row) => {
  const newStatus = row.status;
  const data = {
    id: row.id,
    status: newStatus
  };
  console.log(data)
  axios.put('/user/updateUserStatus' , qs.stringify(data))
      .then((res) => {
        ElMessage.success(`用户【${row.username}】状态更新成功！`);
      })
}

// 接口: /user/addUser (POST 请求，使用 qs 序列化请求体)
const onAddUser = () => {
  // 现在 newUser.deptID 和 newUser.roleId 绑定的是正确的 ID
  console.log( newUser.value)
  axios.post("/user/addUser", qs.stringify(newUser.value))
      .then(res => {
        ElMessage.success(`添加用户成功：${res.message || '操作成功'}`);
        closeAddModal();
        page.currentPage = 1;
        getUserList();
      })
      .catch(error => {
        console.error("添加用户失败:", error);
        ElMessage.error('添加用户失败！');
      });
}

// 接口: /user/deleteUser (DELETE 请求，使用 qs 序列化 URL 参数)
const onDeleteUser = (row) => {
  ElMessageBox.confirm(
      `确定要删除用户【${row.username}】吗？`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    const deleteParams = {id: row.id};

    axios.delete('/user/deleteUser', {
      params: deleteParams,
      paramsSerializer: params => {
        return qs.stringify(params)
      }
    }).then((res) => {
      console.log(res)
      if (res.code === 200){
        ElMessage.success(`用户【${row.username}】删除成功！`);
        getUserList();
      }
    })

  }).catch((action) => {
    if (action === 'cancel') {
      ElMessage.info('已取消删除操作。');
    }
  });
}

// 接口: /user/getUserById (GET 请求，使用 qs 序列化 URL 参数)
const onEditUser = (row) => {
  const params = {id: row.id};

  axios.get('/user/getUserById', {
    params: params,
    paramsSerializer: params => {
      return qs.stringify(params)
    }
  })
      .then(res => {
        editUser.value = res.data;
        editUser.value.password = ''; // 清空密码
        editModalVisible.value = true;
      })
}

// 接口: /user/updateUser (PUT 请求，使用 qs 序列化请求体)
const onUpdateUser = () => {
  // 确保密码字段处理
  const updateData = {...editUser.value};
  console.log(updateData)
  axios.put("/user/updateUser", qs.stringify(updateData))
      .then(res => {
        console.log(res)
        ElMessage.success(`修改用户成功ID: ${editUser.value.id}, 用户名: ${res.message || '操作成功'}`);
        closeEditModal();
        getUserList();
      })
      .catch(error => {
        console.error("修改用户失败:", error);
        ElMessage.error('修改用户失败！');
      });
}

// ------------------ 其他辅助方法 (保持不变) ------------------

const onSearch = () => {
  page.currentPage = 1;
  getUserList()
}
const onReset = () => {
  searchUsername.value = "";
  searchRealname.value = "";
  searchRemarks.value = "";
  searchStatus.value = null;
  page.currentPage = 1;
  getUserList()
}
const handlePageChange = (newPage) => {
  page.currentPage = newPage;
  getUserList()
}
const handleSizeChange = (newSize) => {
  page.pageSize = newSize;
  page.currentPage = 1;
  getUserList()
}

// 重置 newUser 表单数据
const resetNewUser = () => {
  // 保持 status: 1 (正常)
  newUser.value = {username: "", realname: "", password: "", remarks: "", status: 1, roleId: null, deptID: null};
}

// 打开添加模态框的函数，确保先清空表单
const onOpenAddModal = () => {
  resetNewUser();
  addModalVisible.value = true;
}

const closeAddModal = () => {
  resetNewUser(); // 模态框关闭时也重置，确保下次打开是干净的
  addModalVisible.value = false;
}
const closeEditModal = () => {
  editUser.value = {};
  editModalVisible.value = false;
}
const menuStore = useMenuStore();

function hasPerm(perm) {
  return menuStore.hasPerm(perm);
}

// ------------------ 生命周期 ------------------
onMounted(() => {
  getUserList();
  loadDeptAndRoleOptions();
})
</script>

<template>
  <div class="user-page" style="padding: 20px">

    <el-row :gutter="10" style="margin-bottom: 20px;">
      <el-col :span="4">
        <el-input v-model="searchUsername" placeholder="请输入用户名" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="4">
        <el-input v-model="searchRealname" placeholder="请输入真实姓名" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="4">
        <el-input v-model="searchRemarks" placeholder="请输入备注" @keyup.enter="onSearch"/>
      </el-col>
      <el-col :span="4">
        <el-select v-model="searchStatus" placeholder="请选择状态" clearable>
          <el-option label="正常" :value="1"></el-option>
          <el-option label="禁用" :value="0"></el-option>
        </el-select>
      </el-col>
      <el-col :span="8">
        <el-button type="primary" @click="onSearch" v-if="hasPerm('system:user:query')">搜索</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button type="success" @click="onOpenAddModal" v-if="hasPerm('system:user:add')">添加用户</el-button>
      </el-col>
    </el-row>

    <el-dialog
        title="添加用户"
        v-model="addModalVisible"
        width="500px"
        :close-on-click-modal="false"
        @close="closeAddModal"
    >
      <el-form :model="newUser" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="newUser.username"/>
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="newUser.realname"/>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="newUser.password" type="password" show-password/>
        </el-form-item>

        <el-form-item label="所属部门">
          <el-select v-model="newUser.deptID" placeholder="请选择部门" style="width: 100%;">
            <el-option
                v-for="dept in deptOptions"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所属角色">
          <el-select v-model="newUser.roleId" placeholder="请选择角色" style="width: 100%;">
            <el-option
                v-for="role in roleOptions"
                :key="role.id"
                :label="role.name"
                :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="newUser.remarks" type="textarea"/>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch
              v-model="newUser.status"
              :active-value="1" :inactive-value="0" active-text="正常"
              inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeAddModal">取消</el-button>
        <el-button type="primary" @click="onAddUser">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
        title="修改用户"
        v-model="editModalVisible"
        width="500px"
        :close-on-click-modal="false"
        @close="closeEditModal"
    >
      <el-form v-if="editUser.id" :model="editUser" label-width="100px">
        <el-form-item label="ID">
          <el-input v-model="editUser.id" disabled/>
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="editUser.realname"/>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="editUser.password" type="password" show-password placeholder="留空则不修改密码"/>
        </el-form-item>

        <el-form-item label="所属部门">
          <el-select v-model="editUser.deptId" placeholder="请选择部门" style="width: 100%;">
            <el-option
                v-for="dept in deptOptions"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所属角色">
          <el-select v-model="editUser.roleId" placeholder="请选择角色" style="width: 100%;">
            <el-option
                v-for="role in roleOptions"
                :key="role.id"
                :label="role.name"
                :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="editUser.remarks" type="textarea"/>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch
              v-model="editUser.status"
              :active-value="1" :inactive-value="0" active-text="正常"
              inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeEditModal">取消</el-button>
        <el-button type="primary" @click="onUpdateUser">确定修改</el-button>
      </template>
    </el-dialog>

    <el-table :data="userList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="username" label="用户名" width="120"/>
      <el-table-column prop="realname" label="真实姓名" width="120"/>
      <el-table-column label="部门" width="100">
        <template #default="{ row }">
          {{ row.dept ? row.dept.name : 'N/A' }}
        </template>
      </el-table-column>
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          {{ row.role ? row.role.name : 'N/A' }}
        </template>
      </el-table-column>
      <el-table-column prop="remarks" label="备注" min-width="150"/>

      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-switch
              v-model="row.status"
              :active-value="1" :inactive-value="0" :disabled="!hasPerm('system:user:edit')"
              @change="onStatusChange(row)"
          />
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="onEditUser(row)" v-if="hasPerm('system:user:edit')">修改
          </el-button>
          <el-button type="danger" size="small" @click="onDeleteUser(row)" v-if="hasPerm('system:user:remove')">删除
          </el-button>
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