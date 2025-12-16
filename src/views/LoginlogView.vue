<script setup>
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import qs from "qs";
// ⚡ 移除 axios 导入：遵循您的全局挂载配置
import { useMenuStore } from "@/stores/menus.js";

// --- 权限常量 ---
const PERMS = {
  QUERY: 'system:loginlog:query',
  REMOVE: 'system:loginlog:remove',
  CLEAN: 'system:loginlog:clean',
};

// ------------------ 权限和辅助 ------------------
const menuStore = useMenuStore();

function hasPerm(perm) {
  return menuStore.hasPerm(perm);
}

// ------------------ 响应式数据 ------------------
const logList = ref([]) // 日志数据（当前页数据）
const loading = ref(false); // ⚡ 修正：新增明确的加载状态标志

// 搜索条件
const search = reactive({
  address: "",
  dateRange: null,
});

// 计算属性：将搜索条件整理为后端需要的参数
const searchParams = computed(() => {
  const params = {
    currentPage: page.currentPage,
    pageSize: page.pageSize,
    address: search.address,
    startTime: null,
    endTime: null,
  };

  if (search.dateRange && search.dateRange.length === 2) {
    params.startTime = search.dateRange[0];
    params.endTime = search.dateRange[1];
  }

  return params;
});

// 分页
const page = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
});

// ------------------ 辅助函数：设置默认七天日期范围 ------------------

const setDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  // 计算七天前的毫秒数
  start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
  // dateRange 赋值为 [七天前时间戳, 当前时间戳]
  search.dateRange = [start.getTime(), end.getTime()];
}


// ------------------ 核心数据获取/操作方法 ------------------

// 接口: /Loginlog/list (GET 请求)
const getLoginLogList = () => {
  if (!hasPerm(PERMS.QUERY)) {
    logList.value = [];
    page.total = 0;
    return;
  }

  loading.value = true; // ⚡ 修正：开始加载，解决查询开始时没转圈的问题

  const params = searchParams.value;

  // ⚡ 修正点：使用大写 '/Loginlog/list'
  axios.get('/Loginlog/list', {
    params: params,
    paramsSerializer: params => {
      return qs.stringify(params, { allowDots: true, skipNulls: true })
    }
  }).then(res => {
    // ⚡ 核心逻辑：根据您最新的控制台日志，res.data.data 直接返回的是数组
    const dataArray = res.data.data;
    console.log("后端返回的日志数据数组:", dataArray);

    if (Array.isArray(dataArray)) {
      logList.value = dataArray.map(item => ({
        ...item,
        loginTime: item.timestamp, // 映射字段名
      }));

      // ⚡ 修正点：根据实际返回结构，总数 total 应该在 res.data 的顶层（与 code 同级）
      // 如果 res.data 中没有 total 字段，则暂时使用数组长度避免分页组件崩溃
      page.total = res.data.total !== undefined ? res.data.total : dataArray.length;

      // 如果总数 total 在 res.data 的顶层，请确保您的后端返回包含 total 字段：
      // { code: 200, data: [日志数组], total: N, message: "..." }

    } else {
      // 格式仍然不匹配，但这次是期望数组而得到了其他类型
      ElMessage.error('获取日志数据格式不正确，期望得到日志数组，但后端返回结构有误。');
      logList.value = [];
      page.total = 0;
    }
  })
      .catch(error => {
        console.error("获取登录日志失败:", error);
        ElMessage.error('获取登录日志失败！');
      })
      .finally(() => {
        // ⚡ 修正：在请求结束时停止加载，解决空数据转圈问题
        loading.value = false;
      });
}

/**
 * 删除单条登录日志
 * 接口: /loginlog/delete (DELETE 请求，需要 id)
 */
const onDeleteLog = (row) => {
  if (!hasPerm(PERMS.REMOVE)) {
    ElMessage.error("您没有删除登录日志的权限");
    return;
  }

  ElMessageBox.confirm(
      `确定要删除ID为【${row.id}】的登录日志吗？`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    const deleteParams = { id: row.id };

    // ⚡ 修正点：使用大写 '/Loginlog/delete'
    axios.delete('/Loginlog/delete', {
      params: deleteParams,
      paramsSerializer: params => qs.stringify(params)
    }).then((res) => {
      if (res.data.code === 200) {
        ElMessage.success(`登录日志ID【${row.id}】删除成功！`);
        getLoginLogList();
      } else {
        ElMessage.error(res.data.message || '删除失败');
      }
    }).catch(err => {
      ElMessage.error('删除请求失败: ' + err.message);
    });

  }).catch(() => {
    // 用户取消操作
  });
}

/**
 * 清空所有登录日志
 * 接口: /loginlog/clean (DELETE 请求)
 */
const onCleanLog = () => {
  if (!hasPerm(PERMS.CLEAN)) {
    ElMessage.error("您没有清空登录日志的权限");
    return;
  }

  ElMessageBox.confirm(
      '此操作将**清空所有**登录日志记录，是否继续？',
      '极度警告',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'error',
      }
  ).then(() => {
    // ⚡ 修正点：使用大写 '/Loginlog/clean'
    axios.delete('/Loginlog/clean')
        .then((res) => {
          if (res.data.code === 200) {
            ElMessage.success('所有登录日志已成功清空！');
            page.currentPage = 1;
            getLoginLogList();
          } else {
            ElMessage.error(res.data.message || '清空失败');
          }
        }).catch(err => {
      ElMessage.error('清空请求失败: ' + err.message);
    });
  }).catch(() => {
    // 用户取消操作
  });
}


// ------------------ 辅助方法 ------------------

// 搜索
const onSearch = () => {
  page.currentPage = 1;
  getLoginLogList();
}

// 重置
const onReset = () => {
  search.address = "";
  // ⚡ 修正点：重置为七天前到当前时间的范围
  setDefaultDateRange();
  page.currentPage = 1;
  getLoginLogList();
}

// 分页事件
const handlePageChange = (newPage) => {
  page.currentPage = newPage;
  getLoginLogList();
}

const handleSizeChange = (newSize) => {
  page.pageSize = newSize;
  page.currentPage = 1;
  getLoginLogList();
}

/**
 * 日期格式化辅助函数
 */
const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  if (typeof timestamp === 'number') {
    // 使用当前环境的本地时间格式
    return new Date(timestamp).toLocaleString();
  }
  return 'N/A';
}

// ------------------ 生命周期 ------------------
onMounted(() => {
  // 设置默认七天范围
  setDefaultDateRange();
  getLoginLogList();
});
</script>

<template>
  <div class="login-log-page" style="padding: 20px;">

    <el-row :gutter="10" style="margin-bottom: 20px;">
      <el-col :span="4">
        <el-input v-model="search.address" placeholder="登录地址/IP" @keyup.enter="onSearch"/>
      </el-col>

      <el-col :span="8">
        <el-date-picker
            v-model="search.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="x"
            clearable
            style="width: 100%;"
        />
      </el-col>

      <el-col :span="12">
        <el-button
            type="primary"
            @click="onSearch"
            :disabled="!hasPerm(PERMS.QUERY)"
        >查询</el-button>
        <el-button @click="onReset">重置</el-button>
        <el-button
            type="danger"
            @click="onCleanLog"
            :disabled="!hasPerm(PERMS.CLEAN)"
            plain
        >清空日志</el-button>
      </el-col>
    </el-row>

    <el-table
        :data="logList"
        style="width: 100%"
        border
        v-loading="loading" >
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="user.realname" label="用户真实姓名" width="120"/>
      <el-table-column prop="address" label="登录地址" width="150"/>
      <el-table-column prop="ip" label="IP地址" width="150"/>

      <el-table-column prop="loginTime" label="登录时间" min-width="180">
        <template #default="{ row }">
          {{ formatTime(row.loginTime) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
              type="danger"
              size="small"
              @click="onDeleteLog(row)"
              :disabled="!hasPerm(PERMS.REMOVE)"
          >删除</el-button>
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
.login-log-page {
  background-color: #fff;
  border-radius: 4px;
}
</style>