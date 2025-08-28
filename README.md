# MTOR 使用文档

## 目录
1. [MTOR简介](#1-mtor简介)
2. [安装](#2-安装)
3. [基本使用](#3-基本使用)
4. [核心概念](#4-核心概念)
5. [高级特性](#5-高级特性)
6. [API参考](#6-api参考)
7. [最佳实践](#7-最佳实践)
8. [常见问题](#8-常见问题)
9. [版本迁移](#9-版本迁移)

## 1. MTOR简介

MTOR是一个基于React的响应式数据流状态管理库，它基于原生React Hooks进行了二次封装，提供了更加简洁、高效的状态管理方案。

### 1.1 核心特点

MTOR具有以下四大特点：

1. **面向对象**：将功能模块中的所有方法、属性和数据封装成一个模型类，由MTOR自动初始化并管理类实例。
2. **依赖注入**：参考了Java Spring框架的DI（依赖注入）概念，所有模块类都是单实例的，由框架创建并维护，模块之间可以相互依赖。
3. **异步操作**：对异步方法做了大量开发体验方面的优化，异步操作之间的数据修改可以实时反馈到页面中。
4. **其他优势**：
   - 通用性强，兼容Taro、React Native等React生态
   - 模块跟随页面加载自动注册，无需单独写注入逻辑
   - 热更新数据不丢失，包括类属性和静态属性

### 1.2 与React Hooks对比

| 问题 | React Hooks | MTOR |
|-----|-------------|------|
| 属性保存与修改 | 一个useState只能管理一个属性 | 使用setData方法可以同时对多个属性进行修改 |
| 可读性 | 随着组件规模增大，展示与业务逻辑混在一起，可读性降低 | UI展示与业务逻辑分离，结构更清晰，可读性更好 |
| 复用性 | 组件里面的业务逻辑不可复用 | 整个模块都是可复用的 |
| 数据共享 | 必须使用useContext或属性传值，增加大量非业务代码 | 使用依赖注入，多模块轻松实现共享/内部通信 |
| 开发体验 | 热更新时所有state丢失，useMemo、useCallback等依赖项容易出错 | 热更新数据保留，不用关心依赖项更新问题 |

## 2. 安装

```bash
# 使用npm安装
npm install --save mtor

# 或使用yarn安装
yarn add mtor
```

## 3. 基本使用

### 3.1 简单示例

以下是一个简单的示例，实现从后端获取随机数并在页面中展示，点击按钮可以给随机数加1：

#### 3.1.1 定义模块类

```javascript
// HomeModel.js
import { service, Model } from 'mtor';

function ajax() { // 模拟ajax请求
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(parseInt(Math.random() * 10, 10));
        }, 16.7);
    });
}

@service('home') // 或使用 @service(module.id) 或 @define(module)
class HomeModel extends Model {
    num = 0;

    async init() {
        this.num = await ajax();
    }

    add() { // 普通方法
        this.num++;
    }
}

export default HomeModel;
```

#### 3.1.2 在页面中使用模块

```jsx
// HomePage.jsx
import React, { useEffect } from 'react';
import { useModel } from 'mtor';
import HomeModel from './HomeModel';

export default () => {
    const model = useModel(HomeModel);
    const { num } = model;
    
    useEffect(() => {
        model.init();
    }, []);
    
    return (
        <div>
            <div onClick={model.add}>+1</div>
            <div>{num}</div>
        </div>
    );
};
```

#### 3.1.3 使用useInitModel简化代码

```jsx
// HomePage.jsx
import React from 'react';
import { useInitModel } from 'mtor';
import HomeModel from './HomeModel';

export default () => {
    const model = useInitModel(HomeModel, (m) => m.init(), true);
    const { num } = model;
    
    return (
        <div>
            <div onClick={model.add}>+1</div>
            <div>{num}</div>
        </div>
    );
};
```

## 4. 核心概念

### 4.1 模块定义

模块是MTOR的核心概念，通过`@service`装饰器定义：

```javascript
@service('moduleName') // 或使用 @service(module.id) 或 @define(module)
class MyModel extends Model {
    // 属性定义
    count = 0;
    
    // 方法定义
    increment() {
        this.count++;
    }
    
    async fetchData() {
        // 异步操作
    }
}
```

### 4.2 依赖注入

MTOR支持模块间的依赖注入，使用`@inject`装饰器：

```javascript
import UserModel from './UserModel';

@service(module.id)
class HomeModel extends Model {
    // 注入UserModel实例
    @inject(UserModel)
    user;
    
    async init() {
        // 可以直接使用注入的实例
        console.log(this.user.name);
    }
}
```

也可以使用`@resource`按名称注入：

```javascript
@service(module.id)
class HomeModel extends Model {
    // 按名称注入
    @resource('usermodel')
    user;
}
```

### 4.3 数据操作

#### 4.3.1 直接修改属性

在模块方法中可以直接修改属性：

```javascript
@service(module.id)
class CounterModel extends Model {
    count = 0;
    
    increment() {
        this.count++; // 直接修改属性
    }
}
```

#### 4.3.2 使用setData方法

可以使用`setData`方法同时修改多个属性：

```javascript
@service(module.id)
class UserModel extends Model {
    name = '';
    age = 0;
    
    updateUser(name, age) {
        this.setData({
            name,
            age
        });
    }
}
```

在组件中也可以直接调用`setData`：

```jsx
const model = useModel(UserModel);

// 在事件处理函数中
const handleClick = () => {
    model.setData({ name: 'John', age: 30 });
};
```

### 4.4 生命周期方法

MTOR提供了几个生命周期方法：

- `onCreated`：模块首次创建时调用
- `onBeforeClean`：在调用`reset`方法前自动调用

```javascript
@service(module.id)
class MyModel extends Model {
    timer = null;
    
    onCreated() {
        // 模块创建时执行初始化
        this.timer = setInterval(() => {
            // 定时任务
        }, 1000);
    }
    
    onBeforeClean() {
        // 清理资源
        clearInterval(this.timer);
    }
}
```

## 5. 高级特性

### 5.1 异步操作处理

MTOR对异步操作做了特别优化，可以在异步方法中直接修改属性：

```javascript
@service(module.id)
class DataModel extends Model {
    data = null;
    loading = false;
    error = null;
    
    async fetchData() {
        try {
            this.loading = true; // 修改会立即反映到UI
            this.data = await api.getData();
        } catch (err) {
            this.error = err.message;
        } finally {
            this.loading = false;
        }
    }
}
```

### 5.2 模块重置

使用`reset`方法可以将模块状态重置为初始值：

```jsx
useEffect(() => {
    model.init();
    return model.reset; // 组件卸载时重置模块
}, []);
```

### 5.3 事件总线

MTOR提供了事件总线机制，可以用于模块间通信：

```javascript
import { evtBus } from 'mtor';

// 在一个模块中发布事件
evtBus.emit('userLoggedIn', { userId: 123 });

// 在另一个模块中订阅事件
onCreated() {
    evtBus.on('userLoggedIn', (data) => {
        this.userId = data.userId;
    });
}

// 清理事件监听
onBeforeClean() {
    evtBus.off('userLoggedIn', fn); // fn 为订阅时候提供的方法
}
```

## 6. API参考

### 6.1 装饰器

- `@service(name: string)`：定义一个模块
- `@inject(ModelClass)`：按类型注入依赖
- `@resource(name: string)`：按名称注入依赖

### 6.2 Model类

基础模型类，提供以下方法：

- `setData(data: Object)`：批量设置属性
- `reset()`：重置模块状态
- `onBeforeReset(callback: Function)`：注册重置前回调

### 6.3 Hooks

- `useModel(ModelClass)`：获取模块实例
- `useInitModel(ModelClass, initFn?, clean?)`：获取模块实例并处理初始化和清理

### 6.4 其他API

- `define(module)`：基于webpack模块定义模块
- `getModels()`：获取所有模型实例
- `evtBus`：事件总线实例

## 7. 最佳实践

### 7.1 目录组织

推荐的目录结构：

```
src/
├── models/
│   ├── HomeModel.js
│   └── UserModel.js
├── pages/
│   ├── Home/
│   │   ├── index.js
│   │   └── style.less
│   └── User/
│       ├── components/
│       │   └── UserCard/
│       │       ├── index.js
│       │       └── style.less
│       ├── index.js
│       └── style.less
└── index.js
```

### 7.2 模块定义规范

1. 使用`@service(module.id)`确保模块名称全局唯一
2. 类名与文件名保持一致
3. 继承`Model`基类
4. 使用TypeScript或JSDoc提供类型信息
5. 添加热更新支持：`module.hot?.accept()`
6. 不要随意添加未声明的属性
7. 异步方法封装为Promise
8. 一个页面组件对应一个模型

### 7.3 组件使用规范

1. 使用`useInitModel`代替`useModel`+`useEffect`组合
2. 页面组件中的业务逻辑放入模型中
3. 列表项组件通过属性传值，不直接使用模型

### 7.4 对象属性修改

修改对象类型属性时，需要更新引用：

```javascript
// 错误方式
updateObj() {
    this.obj.a = 2; // 不会触发更新
}

// 正确方式
updateObj() {
    this.obj = { ...this.obj, a: 2 };
}
```

### 7.5 热更新优化

在模型文件末尾添加：

```javascript
// webpack
module.hot?.accept();

// vite
import.meta.hot?.accept();
```

## 8. 常见问题

### 8.1 中文输入法兼容性问题

对于可控组件，推荐使用`setData`方法：

```jsx
<Input 
    value={name} 
    onChange={({target: {value}}) => model.setData({name: value})}
/>
```

### 8.2 属性未更新到UI

可能的原因：

1. 修改了对象属性但没有更新引用
2. 使用了未在类中声明的属性
3. 在构造函数中调用了异步方法

### 8.3 模块间循环依赖

避免模块间形成循环依赖，可以使用事件总线或共享服务模式解决。

## 9. 版本迁移

### 9.1 从1.x迁移到2.x

主要变化：

1. 使用`async/await`替代`generator`方法
2. 对TypeScript支持更友好
3. 底层优化，性能更高效
4. 普通异步回调可以直接通过`this`修改数据

迁移步骤：

1. 将所有`generator`方法改为`async/await`
2. 检查并更新依赖注入方式
3. 更新异步操作处理方式

## 附录：完整示例

### 模型定义

```typescript
// UserModel.ts
import { service, Model } from 'mtor';

@service('usermodel')
class UserModel extends Model {
    name = 'Guest';
    isLoggedIn = false;
    
    login(username: string) {
        this.name = username;
        this.isLoggedIn = true;
    }
    
    logout() {
        this.name = 'Guest';
        this.isLoggedIn = false;
    }
}

export default UserModel;

// HomeModel.ts
import { service, Model, inject } from 'mtor';
import UserModel from './UserModel';

@service(module.id)
class HomeModel extends Model {
    count = 0;
    messages = [];
    
    @inject(UserModel)
    user;
    
    async init() {
        this.messages = await this.fetchMessages();
    }
    
    increment() {
        this.count++;
    }
    
    async fetchMessages() {
        // 模拟API调用
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(['Message 1', 'Message 2', 'Message 3']);
            }, 1000);
        });
    }
}

export default HomeModel;
```

### 组件使用

```tsx
// HomePage.tsx
import React from 'react';
import { useInitModel } from 'mtor';
import HomeModel from '../models/HomeModel';

const HomePage: React.FC = () => {
    const model = useInitModel(HomeModel, m => m.init(), true);
    const { count, messages, user } = model;
    
    return (
        <div>
            <h1>Welcome, {user.name}</h1>
            
            <div>
                <h2>Counter: {count}</h2>
                <button onClick={() => model.increment()}>Increment</button>
            </div>
            
            <div>
                <h2>Messages</h2>
                <ul>
                    {messages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                    ))}
                </ul>
            </div>
            
            {user.isLoggedIn ? (
                <button onClick={() => user.logout()}>Logout</button>
            ) : (
                <button onClick={() => user.login('John')}>Login</button>
            )}
        </div>
    );
};

export default HomePage;
```

---

更多信息和示例，请访问[GitHub仓库](https://github.com/sampsonli/mtor)。