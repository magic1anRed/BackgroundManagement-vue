<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import VCode from 'vue3-puzzle-vcode';
import router from "@/router/index.js"; // 引入滑块验证码组件
import qs from 'qs';

// --- 表单数据与状态 ---
const loginFormRef = ref(null);
const loginForm = reactive({
  username: '',
  password: '',
});

// 登录按钮的加载状态
const loading = ref(false);

// --- 滑块验证码状态 ---
const isShowVCode = ref(false); // 控制滑块验证码弹窗的显示
const vCodeSuccess = ref(false); // 记录滑块验证是否成功

// --- 表单验证规则 ---
const rules = reactive({
  username: [
    { required: true, message: '请输入账户账号', trigger: 'blur' },
    { min: 6, max: 18, message: '长度应为 6 到 18 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入账户密码', trigger: 'blur' },
    { min: 6, max: 18, message: '长度应为 6 到 18 个字符', trigger: 'blur' },
  ],
});

/**
 * @function submitForm
 * @description 提交表单处理函数。
 */
const submitForm = async (formEl) => {
  if (!formEl) return;

  // 1. 触发 Element Plus 表单项的验证 (账号和密码)
  const formValid = await formEl.validate((valid) => valid).catch(() => false);

  if (!formValid) {
    ElMessage.error('请检查账号和密码是否符合要求');
    return;
  }

  // 2. 验证滑块是否通过
  if (!vCodeSuccess.value) {
    // 验证未通过，弹出滑块验证码
    isShowVCode.value = true;
    ElMessage.warning('请先完成滑块验证再尝试登录');
    return;
  }

  // 3. 执行登录逻辑 (模拟异步操作)
  loading.value = true;
  console.log('开始登录:', loginForm);

  try {
    axios.post('/login', qs.stringify(loginForm)).then((res) => {
      if (res.code === 200){
        localStorage.setItem('token', res.data);
        router.push('/admin/index');
      }
    })

    ElMessage.success(`欢迎您，${loginForm.username}！登录成功。`);
    // 实际项目中应跳转页面

  } catch (error) {
    ElMessage.error('登录失败，请稍后再试。');
  } finally {
    loading.value = false;
    // 无论成功失败，重置滑块状态，确保下次登录仍需验证
    vCodeSuccess.value = false;
  }
};

/**
 * @function resetForm
 * @description 重置表单处理函数
 */
const resetForm = (formEl) => {
  if (!formEl) return;
  formEl.resetFields(); // 重置所有字段
  vCodeSuccess.value = false; // 重置滑块状态
  ElMessage.info('表单已清空');
};

/**
 * @function vCodeSuccessCallback
 * @description 滑块验证成功后的回调
 */
const vCodeSuccessCallback = () => {
  isShowVCode.value = false; // 关闭滑块验证弹窗
  vCodeSuccess.value = true; // 设置滑块验证成功状态

  ElMessage.success('滑块验证通过，可以点击登录了！');
};
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>🔐 欢迎登录系统</span>
        </div>
      </template>

      <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="rules"
          label-position="top"
          class="login-form"
          @keyup.enter.native="submitForm(loginFormRef)"
      >
        <el-form-item label="账户账号" prop="username">
          <el-input
              v-model="loginForm.username"
              placeholder="请输入6-18位账号"
              clearable
              :prefix-icon="'User'"
          />
        </el-form-item>

        <el-form-item label="账户密码" prop="password">
          <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入6-18位密码"
              show-password
              clearable
              :prefix-icon="'Lock'"
          />
        </el-form-item>

        <el-form-item label="安全验证" prop="vcode_status">
          <el-tag
              :type="vCodeSuccess ? 'success' : 'warning'"
              effect="light"
              class="vcode-tag-status"
              @click="!vCodeSuccess ? isShowVCode = true : null"
          >
            <el-icon v-if="vCodeSuccess"><Check /></el-icon>
            <el-icon v-else><Warning /></el-icon>
            {{ vCodeSuccess ? '已通过安全验证' : '点击进行安全验证' }}
          </el-tag>
        </el-form-item>

        <el-form-item class="login-actions">
          <el-button
              type="primary"
              :loading="loading"
              @click="submitForm(loginFormRef)"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
          <el-button @click="resetForm(loginFormRef)" :disabled="loading">
            重 置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <VCode
        :show="isShowVCode"
        @success="vCodeSuccessCallback"
        @close="isShowVCode = false"
        :slider-text="'拖动滑块完成验证'"
    />

  </div>
</template>

<style scoped>
/* 严格遵循ElementPlus布局，这里仅添加基本的居中和容器样式，没有多余修饰 */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  /* 确保占据全部视口高度 */
  height: 100vh;
  background-color: var(--el-bg-color-page);
}

.login-card {
  width: 380px; /* 稍微调整宽度，使其看起来更专业 */
  /* 使用 Element Plus 的默认圆角和阴影 */
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-dark);
}

/* 头部居中和样式优化 */
.card-header {
  display: flex;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

/* 表单整体布局紧凑 */
.login-form {
  padding: 0 10px;
}

/* 验证状态标签的样式 */
.vcode-tag-status {
  cursor: pointer;
  width: 100%;
  text-align: center;
  /* 使标签高度与输入框更接近 */
  height: 32px;
  line-height: 30px;
}

/* 按钮组居中显示，并控制按钮宽度 */
.login-actions .el-form-item__content {
  justify-content: space-between;
  display: flex;
}

.login-actions .el-button {
  flex: 1; /* 使按钮均匀分布 */
  margin: 0 5px; /* 添加间距 */
}

/* 消除重置按钮左侧多余的 margin */
.login-actions .el-button:first-child {
  margin-left: 0;
}
.login-actions .el-button:last-child {
  margin-right: 0;
}
</style>