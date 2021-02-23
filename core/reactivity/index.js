// 响应式库

// 依赖
let currentEffect
class Dep {
  constructor (val) {
    this.effects = new Set() //用集合收集依赖，防止重复
    this._val = val
  }

  get value () {
    // 被使用时收集依赖，以便值更新时可触发依赖
    this.depend()
    return this._val
  }
  set value (value) {
    this._val = value
    // 值更新后，通知触发依赖
    this.notice()
  }
  // 1. 收集依赖
  depend () {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }
  // 2. 触发依赖
  notice () {
    // 触发一下之前收集到的依赖
    this.effects.forEach(effect => {
      effect()
    })
  }
}

function effectWatch (effect) {
  // 收集依赖
  currentEffect = effect
  // 一开始执行一次
  effect() // effect()在哪定义的？它是传进来的函数，就是我们要收集的依赖本身
  currentEffect = null
}

// demo1
// const dep = new Dep(10)
// let b
// effectWatch(() => {
//   b = dep.value + 10 // 在dep的get中收集依赖
//   console.log(b)
// })
// // 值发生变更
// dep.value = 20 // 在dep的set中触发依赖

// reactive
// dep -> number string boolean, 不支持object, array
// object: key -> dep

// 1. 对象在什么时候改变
// object.a -> get (被使用时在get中收集依赖)
// object.a = 3 -> set (值改变时在set中触发依赖)

// vue2 -> Object.defineProperty(obj, key, config)
// 缺点：1）覆盖不全 2）一个个key处理，性能消耗较大 3）初始化时设置响应式，后续改值检测不到
// vue3 -> proxy
// 原理：也是拦截，但是是在对象层面拦截，性能大大改善

const targetMap = new Map() // 存储对象的des

function getDep (target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Dep()
    depsMap.set(key, dep)
  }
  return  dep
}
function reactive (raw) {
  // const keys = Object.keys(raw)
  // keys.forEach(key => {
  //   const val = raw[key]
  //   Object.defineProperty(raw, key, {
  //     enumerable: true,
  //     configuration: true,
  //     get: function () {
  //       console.log(key)
  //       console.log(val)
  //       return val
  //     }
  //   })
  // })
  // return raw
  return new Proxy(raw, {
    get (target, key) {
      console.log(key + ': ' + target[key])
      // key -> dep
      // dep存储在哪里？
      const dep = getDep(target, key)
      // 收集依赖
      dep.depend()

      return Reflect.get(target, key) // 新标准的用法，相当于 target[key]
    },
    set (target, key, value) {
      const result = Reflect.set(target, key ,value)
      // 触发依赖
      const dep = getDep(target, key) // 获取到dep
      dep.notice()
      return result
    }
  })
}

// demo2
// const user = reactive({
//   age: 28
// })
// let double
// effectWatch(() => {
//   console.log('---reactive---')
//   double = user.age * 2
//   console.log(double)
// })
// user.age = 18

module.exports = {
  effectWatch,
  reactive
}