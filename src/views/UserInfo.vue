<script setup>
import { computed, ref } from "vue";
import { useCurrentUserStore } from "@/stores/currentUser.js";
import { watch } from "vue";

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
    { immediate: true }
);

// 修改密码
const pwdForm = ref({
  oldPwd: "",
  newPwd: "",
  confirmPwd: ""
});
</script>

<template>
  <div class="personal-info-page" style="display: flex; gap: 20px">

    <!-- 左侧卡片 -->
    <el-card style="width: 320px; min-height: 300px;">
      <template #header>
        <span style="font-size: 18px; font-weight: bold;">个人信息</span>
      </template>

      <!-- 头像 -->
      <div style="text-align: center; margin-bottom: 20px;">
        <el-avatar :size="100" src="userInfo.avatar" />
      </div>

      <!-- 信息列表 -->
      <el-descriptions :column="1" border>
        <el-descriptions-item label="所属角色">{{ userInfo.role }}</el-descriptions-item>
        <el-descriptions-item label="角色备注">{{ userInfo.dept }}</el-descriptions-item>
        <el-descriptions-item label="所属部门">{{ userInfo.roleRemarks }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 右侧卡片 -->
    <el-card style="flex: 1;">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本资料" name="base">
          <el-form label-width="80px" style="max-width: 500px; margin-top: 20px;">
            <el-form-item label="账号">
              <el-input v-model="baseForm.username" />
            </el-form-item>

            <el-form-item label="用户姓名">
              <el-input v-model="baseForm.realname" />
            </el-form-item>

            <el-form-item label="用户备注">
              <el-input v-model="baseForm.remarks" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary">保存修改</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="修改密码" name="pwd">
          <el-form label-width="90px" style="max-width: 500px; margin-top: 20px;">
            <el-form-item label="旧密码">
              <el-input v-model="pwdForm.oldPwd" type="password" />
            </el-form-item>

            <el-form-item label="新密码">
              <el-input v-model="pwdForm.newPwd" type="password" />
            </el-form-item>

            <el-form-item label="确认密码">
              <el-input v-model="pwdForm.confirmPwd" type="password" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary">确认修改</el-button>
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
</style>
