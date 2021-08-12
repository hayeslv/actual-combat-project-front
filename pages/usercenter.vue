<!--
 * @Author: Lvhz
 * @Date: 2021-08-12 17:42:51
 * @Description: Description
-->
<template>
  <div>
    <h1>用户中心</h1>
  </div>
</template>

<script>
export default {
  async mounted () {
    const res = await this.$http.get('/user/info')
    console.log(res)
  }
}
</script>

<style lang="scss" scoped>

</style>
