// const { effect, reactive } = require('@vue/reactivity')
// import { effectWatch, reactive } from './core/reactivity/index.js'
const { effectWatch, reactive } = require('./core/reactivity/index.js')

// v1
// let a = 10
// let b = a + 10
// console.log(b)
// a = 20
// b = a + 10
// console.log(b)

// v2
// let a = 10
// let b
// update()
// function update () {
//   b = a + 10
//   console.log(b)
// }
// a = 20
// update()

// v3
// 当a变更，让b自动更新
// 声明一个响应式对象
let a = reactive({
  value: 1
})
let b
effectWatch(() => {
  b = a.value + 10
  console.log(b)
})
a.value = 30
