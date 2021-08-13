<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: 版本2:拖拽上传 + 进度条
-->
<template>
  <div>
    <h1>用户中心</h1>
    <div id="drag" ref="drag">
      <input type="file" name="file" @change="handleFilerChange">
    </div>
    <div>
      <el-progress :stroke-width="20" :text-inside="true" :percentage="uploadProgress" />
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
      file: null,
      uploadProgress: 0 // 进度
    }
  },
  async mounted () {
    const res = await this.$http.get('/user/info')
    console.log(res)
    this.bindEvents()
  },
  methods: {
    bindEvents () {
      const drag = this.$refs.drag
      // 拖进来
      drag.addEventListener('dragover', (e) => {
        drag.style.borderColor = 'red'
        e.preventDefault()
      })
      // 拖出去
      drag.addEventListener('dragleave', (e) => {
        drag.style.borderColor = '#eee'
        e.preventDefault()
      })
      // 放下
      drag.addEventListener('drop', (e) => {
        const fileList = e.dataTransfer.files
        drag.style.borderColor = '#eee'
        this.file = fileList[0]

        e.preventDefault()
      })
    },
    async uploadFiler () {
      // 因为文件是二进制的，所以要放到FormData之上
      const form = new FormData()
      form.append('name', 'file')
      form.append('file', this.file)
      const res = await this.$http.post('/uploadfile', form, {
        onUploadProgress: (progress) => {
          this.uploadProgress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
        }
      })
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
#drag {
  height: 100px;
  line-height: 100px;
  border: 2px dashed #eee;
  text-align: center;
  vertical-align: middle;
}
</style>
