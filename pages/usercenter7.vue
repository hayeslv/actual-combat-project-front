<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: 并发数控制
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
    <div>
      <!-- 如果progress < 0，就报错，显示红色；100成功 -->
      <div class="cube-container" :style="{width: cubeWidth+'px'}">
        <div v-for="chunk in chunks" :key="chunk.name" class="cube">
          <div :style="{height: chunk.progress+'%'}" :class="{'uploading': chunk.progress > 0 && chunk.progress < 100, 'success': chunk.progress === 100, 'error': chunk.progress < 0}" />
          <i v-if="chunk.progress > 0 && chunk.progress < 100" class="el-icon-loading" style="color: #f56c6c" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import sparkMD5 from 'spark-md5'
const CHUNK_SIZE = 0.5 * 1024 * 1024 // 初始化切片大小为 0.1M
export default {
  data () {
    return {
      file: null,
      // uploadProgress: 0, // 进度
      hashProgress: 0,
      chunks: []
    }
  },
  computed: {
    cubeWidth () {
      // 每个方块长度是16像素
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16
    },
    uploadProgress () {
      if (!this.file || this.chunks.length) {
        return 0
      }
      const loaded = this.chunks.map(item => item.chunk.size * item.progress)
        .reduce((acc, cur) => acc + cur, 0)
      return parseInt(100 * loaded / this.file.size)
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
    // 抽样hash
    calculateHashSample () {
      return new Promise((resolve) => {
        const spark = new sparkMD5.ArrayBuffer()
        const reader = new FileReader()

        const file = this.file
        const size = file.size
        const offset = 2 * 1024 * 1024
        // 第一个区块（2M），最后一个区块，数据全要
        // 中间的，取前中后两个字节
        const chunks = [file.slice(0, offset)]

        let cur = offset
        while (cur < size) {
          if (cur + offset >= size) { // 最后一个区块
            chunks.push(file.slice(cur, cur + offset))
          } else {
            // 中间的区块
            const mid = (cur + offset) / 2
            const end = cur + offset
            chunks.push(file.slice(cur, cur + 2))
            chunks.push(file.slice(mid, mid + 2))
            chunks.push(file.slice(end - 2, end))
          }
          cur += offset
        }
        reader.readAsArrayBuffer(new Blob(chunks))
        reader.onload = (e) => {
          spark.append(e.target.result)
          this.hashProgress = 100
          resolve(spark.end())
        }
      })
    },
    // web-worker计算hash
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
    // 空闲时间计算hash
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
      if (!this.file) { return }
      // 切片上传 + 合并
      const chunks = this.createFileChunk(this.file)
      const hash = await this.calculateHashSample()
      this.hash = hash

      // 问一下后端，文件是否上传过，如果没有，是否有存在的切片
      const { data: { uploaded, uploadedList } } = await this.$http.post('/checkfile', {
        hash: this.hash,
        ext: this.file.name.split('.').pop()
      })

      if (uploaded) {
        // 秒传
        return this.$message.success('秒传成功！')
      }

      this.chunks = chunks.map((chunk, index) => {
        // 切片的名字，hash + index
        const name = hash + '-' + index
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          progress: uploadedList.includes(name) ? 100 : 0
        }
      })
      await this.uploadChunks(uploadedList)
    },
    async uploadChunks (uploadedList = []) {
      const requests = this.chunks
        .filter(chunk => !uploadedList.includes(chunk.name))
        .map((chunk, index) => {
        // 转成Promise
          const form = new FormData()
          form.append('chunk', chunk.chunk)
          form.append('hash', chunk.hash)
          form.append('name', chunk.name)
          // form.append('index', chunk.index)
          return { form, index: chunk.index }
        })
        // .map(({ form, index }) => this.$http.post('uploadfileChunk', form, {
        //   onUploadProgress: (progress) => {
        //   // 不是整体的进度条了，而是每个区块有自己的进度条，整体的进度条需要计算
        //     this.chunks[index].progress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
        //   }
        // }))
      // todo 并发量控制
      // 尝试申请tcp链接过多，也会造成卡顿
      // await Promise.all(requests)
      await this.endRequest(requests)

      // 切片传送完毕，发送合并切片请求
      this.mergeRequest()

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
    endRequest (chunks, limit = 3) {
      // 核心的思路是用一个数组，数组的长度是limit
      return new Promise((resolve, reject) => {
        const len = chunks.length // 总任务数
        let count = 0 // 完成任务数
        const start = async () => {
          const task = chunks.shift()
          if (task) {
            const { form, index } = task
            await this.$http.post('uploadfileChunk', form, {
              onUploadProgress: (progress) => {
                this.chunks[index].progress = Number(((progress.loaded / progress.total) * 100).toFixed(2))
              }
            })
            if (count === len - 1) { // 最后一个任务
              resolve()
            } else {
              count++
              // 当前任务完成，启动下一个任务
              start()
            }
          }
        }

        while (limit > 0) {
          // 启动limit个任务
          setTimeout(() => {
            start()
          }, Math.random() * 2000)
          limit -= 1
        }
      })
    },
    mergeRequest () {
      this.$http.post('/mergefile', {
        ext: this.file.name.split('.').pop(),
        size: CHUNK_SIZE,
        hash: this.hash
      })
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
.cube-container{
  .cube{
    width: 14px;
    height: 14px;
    line-height: 12px;
    border: 1px solid black;
    background-color: #eee;
    float: left;
    >.success{
      background-color: green;
    }
    >.uploading{
      background-color: blue;
    }
    >.error{
      background-color: red;
    }
  }
}
</style>
