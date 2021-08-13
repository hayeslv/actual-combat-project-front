<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: 版本4：web-worker计算md5（大文件上传前提）
 *                      利用空闲时间（idle，react中的原理）计算md5
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
    <div>
      <p>计算hash的进度</p>
      <el-progress :stroke-width="20" :text-inside="true" :percentage="hashProgress" />
    </div>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const CHUNK_SIZE = 0.1 * 1024 * 1024 // 初始化切片大小为 0.5M
export default {
  data () {
    return {
      file: null,
      uploadProgress: 0, // 进度
      hashProgress: 0
    }
  },
  async mounted () {
    await this.$http.get('/user/info')
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
    calculateHashWorker () {
      return new Promise((resolve) => {
        this.worker = new Worker('hash.js')
        this.worker.postMessage({ chunks: this.chunks })
        this.worker.onmessage = (e) => {
          const { progress, hash } = e.data
          this.hashProgress = Number(progress.toFixed(2))
          if (hash) {
            resolve(hash)
          }
        }
      })
    },
    calculateHashIdle () {
      const chunks = this.chunks
      return new Promise((resolve) => {
        const spark = new sparkMD5.ArrayBuffer()
        let count = 0

        const appendToSpark = (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(file)
            reader.onload = (e) => {
              spark.append(e.target.result)
              resolve()
            }
          })
        }
        const workLoop = async (deadline) => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            // 空闲时间，且有任务
            await appendToSpark(chunks[count].file)
            count++
            if (count < chunks.length) {
              this.hashProgress = Number(
                ((100 * count) / chunks.length).toFixed(2)
              )
            } else {
              this.hashProgress = 100
              resolve(spark.end())
            }
          }
          window.requestIdleCallback(workLoop)
        }
        window.requestIdleCallback(workLoop)
      })
    },
    // 计算文件chunk
    createFileChunk (file, size = CHUNK_SIZE) {
      const chunks = []
      let cur = 0
      while (cur < file.size) {
        chunks.push({ index: cur, file: this.file.slice(cur, cur + size) })
        cur += size
      }
      return chunks
    },
    async uploadFile () {
      // 切片上传 + 合并
      this.chunks = this.createFileChunk(this.file)
      console.time('hash')
      const hash = await this.calculateHashWorker()
      console.timeEnd('hash')
      console.time('hash1')
      const hash1 = await this.calculateHashIdle()
      console.timeEnd('hash1')
      console.log('文件hash', hash)
      console.log('文件hash1', hash1)

      // const form = new FormData()
      // form.append('name', 'file')
      // form.append('file', this.file)
      // const res = await this.$http.post('/uploadfile', form, {
      //   onUploadProgress: (progress) => {
      //     this.uploadProgress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
      //   }
      // })
      // console.log(res)
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
