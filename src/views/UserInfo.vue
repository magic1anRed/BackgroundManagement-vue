<script setup>
import {computed, onMounted, ref} from "vue";
import {useCurrentUserStore} from "@/stores/currentUser.js";
import {watch} from "vue";
import {ElMessage, ElMessageBox} from "element-plus";
import qs from "qs";
import {Loading} from '@element-plus/icons-vue'; // 引入 Loading 图标
const domain = import.meta.env.VITE_QINIU_DOMAIN


const userStore = useCurrentUserStore()

// 左侧展示数据
const userInfo = computed(() => ({
  avatar: userStore.currentUser?.avatar || "",
  role: userStore.currentUser?.role?.name || "",
  roleRemarks: userStore.currentUser?.role?.remarks || "",
  dept: userStore.currentUser?.dept?.name || "",
}));

// Tabs 切换
const activeTab = ref("base");

const baseForm = ref({
  username: "",
  realname: "",
  remarks: ""
});

// 监听currentUser，当它变化时更新表单
watch(
    () => userStore.currentUser,
    (newUser) => {
      if (newUser) {
        baseForm.value.username = newUser.username || "";
        baseForm.value.realname = newUser.realname || "";
        baseForm.value.remarks = newUser.remarks || "";
      }
    },
    {immediate: true}
);

//------------------ 基本资料保存修改方法 ------------------
const onUpdateBaseInfo = () => {
  // 1. 获取当前用户的 ID
  const userId = userStore.currentUser?.id;
  if (!userId) {
    ElMessage.error("未找到用户 ID，无法保存修改！");
    return;
  }
  // 2. 构造请求参数，与后端 @Param 匹配
  const params = {
    id: userId,
    username: baseForm.value.username,
    realname: baseForm.value.realname,
    remarks: baseForm.value.remarks,
  };
  // 确认框
  ElMessageBox.confirm(
      '确定要保存对基本资料的修改吗?',
      '确认操作',
      {
        confirmButtonText: '确定保存',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(() => {
    // 3. 调用后端接口
    axios.put('/user/updateUserInfo', qs.stringify(params))
        .then(res => {
          ElMessage.success("基本资料修改成功！");
        })
  }).catch(() => {
    // ------------------ 用户点击“取消” ------------------
    ElMessage.info('已取消保存操作。');
  });
};


// ------------------ 修改密码方法 ------------------
// 修改密码
const pwdForm = ref({
  oldPwd: "",
  newPwd: "",
  confirmPwd: ""
});
// 密码表单的引用，用于手动触发校验
const pwdFormRef = ref(null);
// 密码表单校验规则
const pwdRules = ref({
  oldPwd: [
    {required: true, message: '请输入旧密码', trigger: 'blur'}
  ],
  newPwd: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {min: 6, message: '密码长度至少为6位', trigger: 'blur'},
    {
      validator: (rule, value, callback) => {
        if (value === pwdForm.value.oldPwd) {
          callback(new Error('新密码不能与旧密码相同!'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPwd: [
    {required: true, message: '请再次输入新密码', trigger: 'blur'},
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.value.newPwd) {
          callback(new Error('两次输入的密码不一致!'));
        } else {
          callback();
        }
      },
      trigger: 'blur'
    }
  ]
});

const onUpdatePassword = () => {
  // 1. 表单校验
  if (!pwdFormRef.value) return;

  pwdFormRef.value.validate((valid) => {
    if (valid) {
      // 2. 表单校验通过，进行二次确认
      ElMessageBox.confirm(
          '确定要修改您的登录密码吗？修改后将需要使用新密码重新登录。',
          '警告',
          {
            confirmButtonText: '确定修改',
            cancelButtonText: '取消',
            type: 'danger',
          }
      ).then(() => {
        // 3. 用户确认，调用后端接口
        const userId = userStore.currentUser?.id;
        if (!userId) {
          ElMessage.error("未找到用户 ID，无法修改密码！");
          return;
        }
        const params = {
          id: userId,
          oldPassword: pwdForm.value.oldPwd, // 注意参数名称与后端匹配
          newPassword: pwdForm.value.newPwd, // 注意参数名称与后端匹配
        };

        // 实际 axios 调用（后端是 PUT，且接收 @Param）
        axios.put('/user/updateUserPassword', qs.stringify(params))
            .then(res => {
              if (res.code === 200) {
                ElMessage.success("密码修改成功，请使用新密码重新登录！");
                // 清空表单
                pwdFormRef.value.resetFields();
                // 强制登出或引导用户刷新页面
                userStore.logout()
              }
            })
      })
    } else {
      ElMessage.warning('请根据提示完善表单信息！');
      return false;
    }
  })
};


//------------------  头像上传  ------------------
const fileInputRef = ref(null); // 原生文件输入框引用
const isUploading = ref(false);

// 1. 点击头像触发上传框
const handleAvatarClick = () => {
  if (isUploading.value) {
    ElMessage.warning('文件正在上传中，请稍候...');
    return;
  }
  // 触发文件选择框
  fileInputRef.value.click();
}

// 2. 文件选择后的处理和上传
const onFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) {
    return;
  }

  // ... (校验逻辑不变)
  const isJpgOrPngOrWebp = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp';
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isJpgOrPngOrWebp || !isLt5M) {
    e.target.value = '';
    return;
  }
  // --- 校验结束 ---

  // 获取用户ID
  const userId = userStore.currentUser?.id;
  if (!userId) {
    ElMessage.error("未找到用户 ID，无法上传头像！");
    e.target.value = '';
    return;
  }

  // 3. 构造 FormData (用于文件上传)
  const formData = new FormData();
  // ****** 关键修改点 1：将用户ID添加到 FormData ******
  formData.append('id', userId);
  // 必须使用 'file' 作为 key，匹配后端接口 UploadedFile file
  formData.append('file', file);

  isUploading.value = true;

  // 4. 执行 Axios 上传
  axios.post('/user/uploadAvatar', formData, {
    // 关键：设置 Content-Type 为 undefined，让浏览器自动处理 boundary
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
      .then(res => {
        isUploading.value = false;
        // 后端返回的是完整的 URL
        userStore.currentUser.avatar = res.data;
        ElMessage.success("头像上传成功！");
      })
};

</script>

<template>
  <div class="personal-info-page" style="display: flex; gap: 20px">

    <el-card style="width: 320px; min-height: 300px;">
      <template #header>
        <span style="font-size: 18px; font-weight: bold;">个人信息</span>
      </template>

      <div style="text-align: center; margin-bottom: 20px;">
        <div class="avatar-upload-container" @click="handleAvatarClick">
          <el-avatar :size="100" :src="domain+'/'+userInfo.avatar"/>

          <div v-if="isUploading" class="uploading-overlay">
            <el-icon class="is-loading" :size="30">
              <Loading/>
            </el-icon>
          </div>

          <input
              type="file"
              ref="fileInputRef"
              @change="onFileChange"
              accept="image/jpeg,image/png,image/webp"
              style="display: none;"
          />

        </div>
      </div>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="所属角色">{{ userInfo.role }}</el-descriptions-item>
        <el-descriptions-item label="角色备注">{{ userInfo.dept }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ userInfo.roleRemarks }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="flex: 1;">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本资料" name="base">
          <el-form label-width="80px" style="max-width: 500px; margin-top: 20px;">
            <el-form-item label="账号">
              <el-input v-model="baseForm.username"/>
            </el-form-item>

            <el-form-item label="用户姓名">
              <el-input v-model="baseForm.realname"/>
            </el-form-item>

            <el-form-item label="用户备注">
              <el-input v-model="baseForm.remarks"/>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="onUpdateBaseInfo">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="pwd">
          <el-form
              ref="pwdFormRef"
              :model="pwdForm"
              :rules="pwdRules"
              label-width="90px"
              style="max-width: 500px; margin-top: 20px;"
          >
            <el-form-item label="旧密码" prop="oldPwd">
              <el-input v-model="pwdForm.oldPwd" type="password"/>
            </el-form-item>

            <el-form-item label="新密码" prop="newPwd">
              <el-input v-model="pwdForm.newPwd" type="password"/>
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPwd">
              <el-input v-model="pwdForm.confirmPwd" type="password"/>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="onUpdatePassword">确认修改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

  </div>
</template>

<style scoped>
.personal-info-page {
  padding: 20px;
}

/* 头像上传相关的样式 */
.avatar-upload-container {
  position: relative;
  display: inline-block;
  cursor: pointer; /* 提示用户可以点击 */
  border-radius: 50%;
  transition: all 0.3s;
}

.avatar-upload-container:hover {
  opacity: 0.85; /* 鼠标悬停时提供反馈 */
}

/* 上传中的遮罩 */
.uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
}
</style>