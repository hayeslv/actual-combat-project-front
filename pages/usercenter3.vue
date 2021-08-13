<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: 版本3：二进制信息确认文件格式
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
      <el-button @click="uploadFile">
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
    blobToString (blob) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = function () {
          const res = reader.result.split('')
            .map(v => v.charCodeAt()) // 转换成ASCII码
            .map(v => v.toString(16).toUpperCase()) // 转成16进制，转成大写
            .map(v => v.padStart(2, '0')) // 个位数前方补0
            .join(' ')
          resolve(res)
        }
        reader.readAsBinaryString(blob)
      })
    },
    async isGif (file) {
      // 前面6个16进制：'47 49 46 38 39 61' or '47 49 46 38 37 61'
      // 分别代表：GIF89a 和 GIF87a
      // 16进制的转换
      const res = await this.blobToString(file.slice(0, 6))
      const isGif = (res === '47 49 46 38 39 61') || (res === '47 49 46 38 37 61')
      return isGif
    },
    async isPng (file) {
      // png判断前8个16进制
      const res = await this.blobToString(file.slice(0, 8))
      const isPng = (res === '89 50 4E 47 0D 0A 1A 0A')
      return isPng
    },
    async isJpg (file) {
      // jpg判断前2个和后2个16进制
      const len = file.size
      const start = await this.blobToString(file.slice(0, 2))
      const end = await this.blobToString(file.slice(-2, len))
      const isJpg = (start === 'FF D8') && (end === 'FF D9')
      return isJpg
    },
    async isImage (file) {
      // 通过文件流来判定
      // gif是前6个，jpg是前两个和后两个，png是前8个
      return await this.isGif(file) || await this.isPng(file) || await this.isJpg(file)
    },
    async uploadFile () {
      if (!await this.isImage(this.file)) {
        console.log('文件格式不对')
        return null
      } else {
        console.log('格式正确')
      }
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
