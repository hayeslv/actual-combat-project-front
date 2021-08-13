<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: Description
-->
<template>
  <div>
    <h1>用户中心</h1>
    <div>
      <input type="file" name="file" @change="handleFilerChange">
    </div>
    <div>
      <el-button @click="uploadFiler">
        上传
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      file: null
    }
  },
  async mounted () {
    const res = await this.$http.get('/user/info')
    console.log(res)
  },
  methods: {
    async uploadFiler () {
      // 因为文件是二进制的，所以要放到FormData之上
      const form = new FormData()
      form.append('name', 'file')
      form.append('file', this.file)
      const res = await this.$http.post('/uploadfile', form)
      console.log(res)
    },
    handleFilerChange (e) {
      const [file] = e.target.files
      if (!file) {
        return null
      }
      this.file = file
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
