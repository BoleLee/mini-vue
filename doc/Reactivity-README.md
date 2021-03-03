# Reactivity响应式库的实现

## 改变一个变量值

```javascript
// v1
let a = 10
let b = a + 10
console.log(b)
a = 20
b = a + 10
console.log(b)
// 结果：
// 20
// 30

// v2
let a = 10
let b
update()
function update () {
  b = a + 10
  console.log(b)
}
a = 20
update()
// 结果：
// 20
// 30


// v3
// 当a变更，让b自动更新
const { effect, reactive } = require('@vue/reactivity')
// 声明一个响应式对象
let a = reactive({
  value: 1
})
let b
// 依赖
effect(() => {
  b = a.value + 10
  console.log(b)
})
a.value = 30
// 结果：
// 11
// 40
```

上述示例中，b的值由a决定，称之为a的依赖，我们希望当a的值变化时，所有a的依赖都自动被触发，那么，a就是响应式的。
上述3个版本，第3个为vue的方式，下面我们将按vue的实现方式，来实现一遍

## 响应式库

步骤1: 将一个值(Number|String|Boolean)变成响应式数据

```javascript
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
  // 执行依赖
  effect() // effect()就是我们要收集的依赖本身
  currentEffect = null
}

// demo1
const dep = new Dep(10)
let b
let c
effectWatch(() => {
  b = dep.value + 10 // 在dep的get中收集依赖
  console.log('b: ' + b)
})
effectWatch(() => {
  c = dep.value * 2 // 在dep的get中收集依赖
  console.log('c: ' + c)
})
// 值发生变更
dep.value = 20 // 在dep的set中触发依赖
```

- 上述定义了`class Dep`, 借助类的定义，当读取`value`时，`get`被执行，`value`值在`set`中被改变，因此可以实现：**在get中收集依赖，在set中触发依赖。**也就是说，把一个值用Dep定义，它就变成响应式数值。
- `effectWatch`的责任，则是把依赖给Dep收藏起来，此处通过`currentEffect`，将`Dep`和`effectWatch`联系了起来。

demo1结果：
>b: 20
c: 20
b: 30
c: 40

步骤2: 把一个Object变成响应式

dep只能把`number string boolean`变成响应式，不支持`object array`，接下来我们实现把`object`变成响应式，也就是每一个`key`都转成`dep`

`vue2`中使用`Object.defineProperty(obj, key, config)`来实现，存在缺点：1）覆盖不全 2）一个个key处理，性能消耗较大 3）初始化时设置响应式，后续改值检测不到
`vue3`改用`proxy`实现，原理也是拦截，但是是在对象层面拦截，性能大大改善

下面我们先用`Object.defineProperty`来验证一下缺点3

```javascript
function reactive (raw) {
  const keys = Object.keys(raw)
  keys.forEach(key => {
    const val = raw[key]
    Object.defineProperty(raw, key, {
      enumerable: true,
      configuration: true,
      get: function () {
        console.log(key + ': ' + val) // 验证读取时是否被调用
        return val
      }
    })
  })
  return raw
}

// test
const user = reactive({
  age: 28
})
user.age
user.name = 'grace'
user.name
```

输出结果
>age: 28

读取`user.age`时，`get`被调用了，读取后来加上的`name`属性，`get`没有被调用。
再改成`proxy`实现试试：

```javascript
function reactivity (raw) {
  return new Proxy(raw, {
    get (target, key) {
      console.log(key + ': ' + target[key])
      return Reflect.get(target, key) // 新标准的用法，相当于 target[key]
    }
  })
}
```

输出结果

>age: 28
name: grace

现在用Proxy改写Object，将其变成响应式数据

```javascript
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
  return new Proxy(raw, {
    get (target, key) {
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

// demo 2
const user = reactive({
  age: 28
})
let double
effectWatch(() => {
  console.log('---reactive---')
  double = user.age * 2
  console.log(double)
})
user.age = 18
```

输出结果
>---reactive---
56
---reactive---
36

至此，便实现了一个简单的响应式库，使用其代替`@vue/reactivity`，看看最初例子的效果吧

```javascript
// index.js
const { effectWatch, reactive } = require('./core/reactivity/index.js')

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
```
