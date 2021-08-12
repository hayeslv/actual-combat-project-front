<template>
  <div>
    <el-form class="login-form" :rules="rules">
      <el-form-item props="email">
        <span> <i class="el-icon-mobile" /> </span>
        <el-input placeholder="邮箱" />
      </el-form-item>
      <el-form-item props="passwork">
        <span> <i class="el-icon-lock" /> </span>
        <el-input placeholder="密码" />
      </el-form-item>
      <el-form-item props="captcha">
        <el-input placeholder="验证码" />
        <img :src="captchaUrl" alt="" @click="updateCaptcha">
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
export default {
  layout: 'login',
  data () {
    return {
      rules: {},
      captchaUrl: '/api/captcha?_t' + new Date().getTime()
    }
  },
  methods: {
    updateCaptcha () {
      this.captchaUrl = '/api/captcha?_t' + new Date().getTime()
    }
  }
}
</script>

<style lang="scss" scoped>
.login-form{
  width: 800px;
  margin: 50px auto;
}
</style>
