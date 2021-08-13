/*
 * @Author: Lvhz
 * @Date: 2021-08-12 11:42:09
 * @Description: Description
 */
import Vue from 'vue'
import axios from 'axios'
import { MessageBox } from 'element-ui'

const service = axios.create({
  baseURL: '/api' // 走这里的请求，都有/api的前缀
})

export default ({ store, redirect }) => {
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

      if (data.code === 403) {
        MessageBox.confirm('登录已过期', '过期', {
          confirmButtonText: '登录',
          showCancelButton: false,
          type: 'warning'
        }).then(() => {
          localStorage.removeItem('token')
          redirect({ path: '/login' })
        })
      }

      return data
    }
  )
}

Vue.prototype.$http = service

export const http = service
