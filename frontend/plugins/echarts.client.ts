import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

export default defineNuxtPlugin((nuxtApp) => {
  use([CanvasRenderer])
  nuxtApp.vueApp.component('VChart', VChart)
})
