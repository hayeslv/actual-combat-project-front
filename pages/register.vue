<template>
  <div class="login-container">
    <el-form ref="registerForm" label-width="100px" class="login-form" :model="form" :rules="rules">
      <div class="title-container">
        <img src="/logo.png" alt="">
      </div>
      <el-form-item prop="email" label="邮箱">
        <el-input v-model="form.email" placeholder="请输入邮箱" />
      </el-form-item>
      <el-form-item prop="captcha" label="验证码" class="captcha-container">
        <div class="captcha">
          <img :src="code.captcha" alt="" @click="resetCaptcha">
        </div>
        <el-input v-model="form.captcha" placeholder="请输入验证码" />
      </el-form-item>
      <el-form-item prop="nickname" label="昵称">
        <el-input v-model="form.nickname" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item prop="password" label="密码">
        <el-input v-model="form.password" type="password" placeholder="请输入密码" />
      </el-form-item>
      <el-form-item prop="repassword" label="确认密码">
        <el-input v-model="form.repassword" type="password" placeholder="请再次输入密码" />
      </el-form-item>
      <el-form-item label="">
        <el-button type="primary" @click.native.prevent="handlerRegister">
          注册
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import md5 from 'md5'
export default {
  layout: 'login',
  data () {
    return {
      form: {
        email: '417703683@qq.com',
        password: 'a417703683',
        repassword: 'a417703683',
        nickname: 'dylan',
        captcha: ''
      },
      rules: {
        email: [
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入正确的邮箱格式' }
        ],
        captcha: [
          { required: true, message: '请输入验证码' }
        ],
        nickname: [
          { required: true, message: '请输入昵称' }
        ],
        password: [
          { required: true, pattern: /^[\w_-]{6,12}$/, message: '请输入6~12位密码' }
        ],
        repassword: [
          { required: true, pattern: /^[\w_-]{6,12}$/, message: '请再次密码' },
          {
            validator: (rule, value, callback) => {
              if (value !== this.form.password) {
                callback(new Error('两次密码不一致'))
              }
              callback()
            }
          }
        ]
      },
      code: {
        captcha: '/api/captcha'
      }
    }
  },
  methods: {
    resetCaptcha () {
      this.code.captcha = '/api/captcha?_t' + new Date().getTime()
    },
    handlerRegister () {
      this.$refs.registerForm.validate(async (valid) => {
        if (valid) {
          console.log('校验成功')
          // TODO 发送注册请求
          const params = {
            email: this.form.email,
            password: md5(this.form.password), // 注意这里实际使用时应该加盐
            nickname: this.form.nickname,
            captcha: this.form.captcha
          }
          const res = await this.$http.post('/user/register', params)
          if (res.code === 200) {
            this.$alert('注册成功', '成功', {
              confirmButtonText: '去登录',
              callback: () => {
                this.$router.push('/login')
              }
            })
          } else {
            this.$message.error(res.message)
          }
        } else {
          console.log('校验失败')
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
