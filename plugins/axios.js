import Vue from 'vue'
import axios from 'axios'

const service = axios.create({
  baseURL: '/api' // 走这里的请求，都有/api的前缀
})

// 请求拦截
// 主要做token管理
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      // eslint-disable-next-line dot-notation
      config.headers.common['Authorization'] = 'Bearer ' + token
    }
    return config
  }
)

// 响应拦截
service.interceptors.response.use(
  (response) => {
    const { data } = response

    return data
  }
)

Vue.prototype.$http = service

export const http = service
