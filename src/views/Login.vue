<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
// 确保 VCode 导入正确
import VCode from 'vue3-puzzle-vcode';
import router from "@/router/index.js";
import qs from 'qs';


// --- 表单数据与状态 ---
const loginFormRef = ref(null);
const loginForm = reactive({
  username: 'magic1', // 方便测试，可设置默认值
  password: '', // 方便测试，可设置默认值
});

// 登录按钮的加载状态
const loading = ref(false);

// --- 滑块验证码状态 ---
const isShowVCode = ref(false);
const vCodeSuccess = ref(false);

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
    isShowVCode.value = true;
    ElMessage.warning('请先完成滑块验证再尝试登录');
    return;
  }

  // 3. 执行登录逻辑
  loading.value = true;
  axios.post('/login', qs.stringify(loginForm)).then(res => {
    localStorage.setItem('token', res.data);
    ElMessage.success(`欢迎您，${loginForm.username}！登录成功。`);
    // 成功后跳转
    router.push('/admin/index');
  })
};

/**
 * @function resetForm
 * @description 重置表单处理函数
 */
const resetForm = (formEl) => {
  if (!formEl) return;
  formEl.resetFields();
  vCodeSuccess.value = false;
  ElMessage.info('表单已清空');
};

/**
 * @function vCodeSuccessCallback
 * @description 滑块验证成功后的回调
 */
const vCodeSuccessCallback = () => {
  isShowVCode.value = false;
  vCodeSuccess.value = true;

  ElMessage.success('滑块验证通过，可以点击登录了！');
};
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <el-icon><Lock /></el-icon>&nbsp;
          <span>欢迎登录系统</span>
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
/* ================================================================= */
/* 整体布局和美化 */
/* ================================================================= */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  /* 统一背景色，使其更干净 */
  background-color: #f0f2f5;
}

.login-card {
  width: 380px;
  /* 调整阴影，使其看起来更轻盈、现代 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px; /* 稍微增加圆角 */
  padding: 10px 0; /* 增加上下内边距 */
}

/* 头部居中和样式优化 */
.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px; /* 字体加大 */
  font-weight: 600;
  color: var(--el-color-primary); /* 标题使用主色调 */
}

/* ================================================================= */
/* 核心修正：去除输入框的蓝色/黄色背景底色 */
/* ================================================================= */

/* 针对 Element Plus 输入框内部的 input 元素 */
:deep(.el-input__inner) {
  /* 解决浏览器自动填充时的黄色/蓝色背景 */
  /* 使用 box-shadow 替代 background-color，并设置一个很长的扩散值 */
  box-shadow: 0 0 0 1000px white inset !important;
  -webkit-box-shadow: 0 0 0 1000px white inset !important;
}

/* 解决浏览器聚焦时的默认边框或阴影 */
/* 保持 Element Plus 的默认聚焦效果，但确保背景是白色 */
:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1000px white inset !important;
  -webkit-box-shadow: 0 0 0 1000px white inset !important;
}

/* ================================================================= */
/* 元素细节样式 */
/* ================================================================= */

/* 表单整体布局紧凑 */
.login-form {
  padding: 0 10px;
}

/* 验证状态标签的样式 */
.vcode-tag-status {
  cursor: pointer;
  width: 100%;
  text-align: center;
  height: 40px; /* 匹配输入框高度 */
  line-height: 38px;
  font-size: 14px;
  transition: all 0.3s;
}

.vcode-tag-status:hover {
  opacity: 0.9;
  /* 增加悬停时的阴影效果，使其更像一个可点击的按钮 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 按钮组居中显示，并控制按钮宽度 */
.login-actions .el-form-item__content {
  justify-content: space-between;
  display: flex;
}

.login-actions .el-button {
  flex: 1;
  margin: 0 5px;
}

/* 消除重置按钮左侧多余的 margin */
.login-actions .el-button:first-child {
  margin-left: 0 !important;
}
.login-actions .el-button:last-child {
  margin-right: 0 !important;
}
</style>