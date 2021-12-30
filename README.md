# 一、mtor 是什么？

[comment]: <> ([![Build Status]&#40;https://travis-ci.org/sampsonli/mtor.svg?branch=master&#41;]&#40;https://travis-ci.org/sampsonli/mtor&#41;)
[![npm version](https://img.shields.io/npm/v/mtor.svg?style=flat)](https://www.npmjs.com/package/mtor)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/sampsonli/mtor/blob/master/LICENSE)
----
mtor 是一个基于react 类响应式数据流状态管理库， 本身是基于原生react hooks 进行了二次封装，对比原生react hooks:

| 问题  | react hooks                             | mtor                                                |
|-----|-----------------------------------------|-----------------------------------------------------|
| 属性保存与修改 | 一个useState 只能管理一个属性         | <font color="green">是用setData方法可以同时对多个属性进行修改</font> |
| 可读性 | 随着组件规模增大，展示与业务逻辑混在一起，可读性直线降低， 也更容易出错 | ui展示与业务了逻辑分离，结构更清晰,<font color="green">可读性更好</font> |
| 复用性 | 组件里面的业务逻辑不可复用             | 整个模块都是<font color="green">可复用</font>                |
| 数据共享 | 必须使用useContext，或属性传值，增加大量非业务代码    | 使用依赖注入， 多模块轻松实现<font color="green">共享/内部通信</font>   |
| 开发体验 | 热更新，所有state丢失，useMemo,useCallback,等依赖项很容易出错 | 热更新数据保留，不用关心依赖项更新问题                                 |
----
mobx也是基于响应式数据流， 在写法，底层实现和mobx有十分相像，对比：

| 问题     | mobx                                  | mtor                            |
|--------|---------------------------------------|---------------------------------|
| 易用性    | api比较多，配置项也比较多， 容易出错， 且相对难以快速上手    | api较少，直接引用直接上手，且不容易出错 |
| 可读性    | 可读性一般    | 完全基于面向对象， 可读性非常高  |
| 申明状态   | 需要添加observable注解， 不够灵活    | 直接在类中声明属性即可  |
| 异步数据流  | 每次异步操作完， 回调数据操作必须包装在runInAction, 很不灵活 | 不管在任何地方， 只要在类中， 都可以直接通过this修改属性 |
| 模块相互依赖 | 支持得不是很好， 需要写很多非业务代码   | 直接使用依赖注入即可，非常方便，不影响代码可读性  |

总结 mtor 具有以下四大特点:
1. 模块化
2. 面向对象
3. 依赖注入
4. 异步处理

### 模块化
把所有数据、业务逻辑作集成在一个模块中，模块之间低耦合，更容易排查问题；

### 面向对象
所有状态，方法封装成一个类，在方法中操作状态。
总的来说， 在数据层面上，更适合基于面向对象开发，展示层面用方法组件而不是类组件， 再配合react hooks新特性，二者可以完美融合。
我们可以把页面展示和数据流处理剥离开来， 甚至前端开发可以进一步拆分： “静态页面” 与 “数据处理” 两大块。
一套数据流处理可以同时应用到多场合，比如pc/h5/小程序/react-native。
此外， 完美支持typescript，更友好提供类型支持
### 依赖注入
mtor 基本理念参考了后端java 中spring框架， DI（依赖注入）核心思想。 所有model都是单实例的，统一由框架创建与维护， 模块之间可以相互依赖，
由mtor自动注入，用户只需通过注解标注类型即可，这样模块之间数据/逻辑共享就变得特别简单。

### 异步操作
异步操作在开发过程中特别常见，mtor对异步方法做了大量开发体验优化， 不像mobx等库异步处理完一定要在runInAction 中设置数据
而且当遇到多个顺序异步操作， 假如两个异步操作之间有数据修改的情况下可以把修改的数据实时反馈到页面中，而不需要做额外的操作，可以与面向对象思想完美相结合。

### 其他
1. 通用性，兼容性强， 完美支持taro， react-native 等使用react 场景；
2. 模块跟随导入的页面加载而自动注册， 无需单独写注入逻辑；
3. 完美的开发体验，热更新数据不丢失， 包括类属性和静态属性；

### 2.0 对比1.0 有哪些改进
1. 使用async/await,取代generator方法， 更通用，更主流；
2. 对typescript 支持更友好， 实现100%完美支持；
3. 底层做了大量优化， 性能更高效；
4. 普通异步操作可以直接通过this修改数据， 不需要再次封装promise；


# 二、开始使用mtor
## 安装
```shell script
yarn add mtor # npm install --save mtor
```
## 从一个简单demo开始
> 实现一个简单小需求， 从后端接口获取一个随机数，展示在页面中，
> 页面有一个按钮，点击给获取的随机数+1

### 1. 定义模块类
~~~js
import {service, Model} from 'mtor';
function ajax() { // 模拟ajax请求
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(parseInt(Math.random() * 10, 10));
        }, 16.7);
    });
}
@service('home')
class HomeModel extends Model {
    num = 0;

    async init() {
        this.num = await ajax();
    }

    add() { // 普通方法
        this.num ++;
    }
}
export default HomeModel;
~~~
-说明
1. @service('home') 定义一个模块， 每个模块必须添加此注解， 其中home 是自己给模块取的名称, 如果不想取名，也可直接用module.id， 比如@service(module.id);
2. mtor 大量依赖最新注解语法， 需要配置相应babel插件(@babel/plugin-proposal-decorators);
3. Model 是个类接口， 主要是给model实例和类提供接口api和属性;
4. init() 是一个异步方法, 调用接口返回给num属性;
5. add() 是定义的普通类方法， 此方法给类属性num 加1;
6. num 是一个类属性， 页面中可以直接使用;


### 2. 在页面中使用 model (useModel)
> 页面引入model目前仅支持方法组件（使用hooks语法），使用方法如下：
```jsx
import React, {useEffect} from 'react';
import {useModel} from 'mtor';
import style from './style.less';
import HomeModel from '../../models/HomeModel';

export default () => {
    const model = useModel(HomeModel);
    const {
        num,
    } = model;
    useEffect(() => {
        model.init();
    }, []);
    return (
        <div className={style.container}>
            <div className={style.content}>
                <div className={style.addOne} onClick={model.add}>
                    +1
                </div>
                <div className={style.txt}>
                    {num}
                </div>
            </div>
        </div>
    );
};

```
- 说明
1. model 是HomeModel的一个实力， 通过useModel 方法获取， 传一个类型类；
2. 页面加载后调用model中定义的init方法，获取随机数；
3. **（小技巧）** model中所有方法已经绑定过this了， 可以单独拿出来直接使用；

### 3. 在页面中使用 model (useModel 二次封装版 useInitModel)
> 在上面案例中使用useModel写法 每次页面加载都会重新执行init方法， 如果开发情况下， 修改了页面， 会导致页面热跟新，其实并不需要再次执行init方法， 可以用useInitModel 取代 useModel， 方法如下： 
```jsx
export default () => {
    const model = useInitModel(HomeModel, () => model.init(), true);
    const {
        num,
    } = model;
    return (
        <div>
            {/* // 业务代码   */}
        </div>
    );
};

```
- 说明
1. useInitModel 底层基于useModel， useEffect 的二次封装方法;
2. 第二个参数是第一次加载初始化方法，第三个参数是退出是否调用reset方法；
3. useInitModel开发模式做了优化， 页面热更新的时候不会再次调用reset 与初始化方法；


# 三、深入理解 mtor
### 1. 依赖注入（DI)
> 以上案例基本上可以满足绝大部分业务需求, 但是有时候我们定义了多个model， model之间需要有数据共享， 在mtor 引入了依赖注入（Dependency Inject),
> 模块之间可以相互依赖， 框架会根据配置类型自动注入进来。举个例子，还是在上面的案例中， HomeModel 依赖另外
> 一个UserModel, UserModel 中定义了name 属性， HomeModel 初始化后拿到UserModel中的name,并展示在页面中;

#### 1. 定义需要依赖的model
 ```js UserModel.js
 import {Model, service} from 'mtor';
 
 @service('usermodel')
 class UserModel extends Model {
   name = 'hello user';
 }
 export default UserModel;
 ``` 
- 此处定义了UserModel, 里面有name 属性

#### 2. 定义准备依赖的model
 ```js HomeModel.js
 import UserModel from './UserModel';

 @service(module.id) // 也可以直接使用模块标识
 class HomeModel extends Model {
     num = 0;
     username;
     
     /**
      * 声明user类型
      * @type {UserModel}
      */
     @inject(UserModel) 
     user;
 
     async init() {
         this.num = await ajax();
         this.username = this.user.name; // 可以在model方法中直接使用UserModel 中name 属性
         // this.user.name = 'sampsonli' // ***不可以***直接修改被注入属性中的值， 应该调用被注入属性中的方法修改其值
         // this.user.setData({name: 'sampsonli'} // 可以调用UserModel 中setData 为name 赋值
     }
 
     add() {
         this.num ++;
     }
 }
 export default HomeModel;
 
 ```
 - 说明
 1. @inject(UserModel)，给属性注入UserModel 的实例；
 2. 注入的实例，类方法中可以获取实例属性， 也可以调用注入实例的方法， 但是不能直接修改实例的属性， 只能通过setData方法或者UserModel 中单独定义方法去设置；
 3. 如果使用es语法，被注入的属性前面建议加上jsDoc注释，表明属性类型，方便后续使用实例属性和方法；


#### 3. 最后在页面中展示数据
 ```jsx
 import React, {useEffect} from 'react';
 import {useModel} from 'mtor';
 import style from './style.less';
 import HomeModel from '../../models/HomeModel';
 
 export default () => {
     const model = useModel(HomeModel);
     const {
         num,username, user,
     } = model;
     useEffect(() => {
         model.init();
     }, []);
     return (
         <div className={style.container}>
             <div className={style.content}>
                 <div className={style.addOne} onClick={model.add}>
                     +1
                 </div>
                 <div className={style.txt}>
                     {num}
                 </div>
                 <div className={style.txt}>
                     {username}-{user.name}
                 </div>
             </div>
         </div>
     );
 };
 ```
 - 说明
     1. 也可以直接使用被注入属性中的属性值， 当user数据有更新时，会同步到页面中。


### 2. 定义model注意事项
1. 不管是普通方法，还是异步方法， 尽量不要定义为箭头方法， 箭头方法在类中是以普通属性存在， 不能使用类中定义的属性；
2. 保留字 setData, reset, ns,不能用于自定义方法、属性名； 自定义onCreated, onBeforeClean 会根据满足某些条件自动调用；
3. 当修改模块中对象类型的属性时， 需要同时更新对象引用值。例如：
    ```js
    @service(module.id)
    class DemoModel extends Model {
        obj = {a: 1};
    
        updateObj() {
            this.obj.a = 2; // 错误的做法
        }
        updateObj2() {
            this.obj = {...this.obj, a: 2}; // 正确的做法
        }
    }
    export default DemoModel;
    ```
4. 使用属性前，必须先在类中声明， 否则动态添加的属性不生效
    ```js
    @service(module.id)
    class DemoModel extends Model {
        setA() {
            this.a = 111;  // 此处修改不会反馈到页面中
        }
    }
    export default DemoModel;
    ```

### 3. 初始化方法
> 有时候会遇到这种场景， 模块加载的时候进行一些初始化操作（注意不是初始化值）， 初始化操作可以定义onCreated方法来实现
```js
@service(module.id)
class CreatedModel extends Model {
    num = 0;
    constructor() { // 构造方法只能初始化变量
        this.num = 1;
        // this.ajaxGet()// 不能直接调用模块中的方法
    }
    ajaxGet() {
        // 方法逻辑
    }
    onCreated() { // 如果定义了onCreated方法，此方法在模块加载的时候会自动执行（注意，热跟新的时候也不会执行哦。。。）
        thia.ajaxGet() // 此方法中可以调用模块中的方法进行初始化
    }
}
export default CreatedModel;
```
- 最佳实践， 尽量减少created方法使用， 在模块类中定义init方法，然后放入组件的 React.useEffect方法中调用。

### 4. setData 妙用
#### 1. 便捷地操作model中的数据
> 有时候页面中需要修改model中的数据， 如果只是修改少量数据，新定义一个方法会大大增加业务代码量， 可以使用 model.setData(params)方法
> params是一个普通对象， key是要修改的属性名， value是修改后的值。
```jsx
export default () => {
    const model = useModel(HomeModel);
    const {
        num,username
    } = model;
    useEffect(() => {
        model.init();
    }, []);
    return (
        <div className={style.container}>
            <div className={style.content}>
                <div className={style.addOne} onClick={() => model.setData({num: num + 1})}>
                    +1
                </div>
                <div className={style.txt}>
                    {num}
                </div>
                <div className={style.txt}>
                    {username}
                </div>
            </div>
        </div>
    );
};
```
- 用 model.setData({num: num + 1}) 取代 model.add 方法， 可以减少代码量， 但是缺点是每次页面渲染都会生成一个新方法， 可能对性能优化不是很友好， 具体取舍看业务场景吧！
  setData 所设置的属性名尽量是模块类中存在的属性， 比如上例 setData({num2: 33}) 设置一个新属性num2, 虽然运行没问题， 但是不提倡这样写。
####2. 给model动态添加新属性
```js
@service(module.id)
class SetDataModel extends Model {
    num = 0;
    addNum2() {
       this.num2 = 100; // 此方法不会在页面中获取num2
       this.setData({num3: 200}); // 可以在页面中获取num3
    }
}
export default SetDataModel;

```
-说明
1. 正常情况下， 属性应该先声明再使用，尽量减少添加没有在类中声明的属性
2. 也可以在页面中调用setData 动态添加属性

### 5. 重置model中的所有数据到初始值
> 组件销毁的时候， 我们要清空现有的数据， 我们可以调用 model.reset；
```jsx
export default () => {
    const model = useModel(HomeModel);
    const {
        num,username
    } = model;
    useEffect(() => {
        model.init();
        return model.reset; // 当前组件销毁的时候会调用 model.reset() 方法
    }, []);
    return (
        <div className={style.container}>
            <div className={style.content}>
                <div className={style.addOne} onClick={() => model.setData({num: num + 1})}>
                    +1
                </div>
                <div className={style.txt}>
                    {num}
                </div>
                <div className={style.txt}>
                    {username}
                </div>
            </div>
        </div>
    );
};
```
-说明
1. 可以用 useInitModel 简化以上逻辑。

# 四、从1.0 迁移到2.0
> 只需要把 generator方法改为 async / await 即可
>
> 

# 五、已知存在的问题
#### 1. 由于页面数据更新是基于异步的， 如果实现可控组件，对中文输入法在部分浏览器存在兼容性问题， 可以使用setData,解决方案如下:
~~~jsx
export default () => {
    const model = useModel(DemoModel);
    const {name, name1} = model;
   return <div>
      <Input value={name} onChange={({target: {value}}) => model.setData({name: value})}/>
      <Input value={name1} onChange={({target: {value}}) => model.setName1(value)}/> {/* 在DemoModel 定义了setName1 这个方法情况下， 这种写法会存在兼容性问题*/}
   </div>
}
~~~
# 六、最佳实践
mtor 使用最佳实践参考 [最佳实践](https://github.com/sampsonli/mtor/blob/main/doc/最佳实践.md)
### 1. 应用场景
> mtor 非常适用于具有复杂交互逻辑的页面/组件， 或者页面之间有数据交互/共享等场景；
> 不适用于循环列表项中的复杂组件。
### 2. ui展示层与数据分离
> 页面展示和数据可以进一步拆分， 页面中不包含任何逻辑处理， 数据层完全基于model；
> 以面向对象的方式进行开发， 对外提供api接口和数据文档，并且一份model可以适配多平台，比如同时适配移动端h5 和pc端页面，
> 多人协作的时候， 可以把 ui设计 和 数据逻辑处理 完全交给不同人负责，高效完成需求， 同时可以保证代码风格统一。

### 3. 开发环境开启热更新
> 正常情况下 webpack环境下的热更新， 会依据更改的文件，依次往上找依赖模块，直到找到调用过" module.hot.accept() "方法的模块，最后执行整体更新。 如果我们在开发的过程中，
> 只修改Model文件， 没必要同时更新依赖Model的页面文件， 我们可以在Model所在文件底部加入" module.hot && module.hot.accept(); "即可，只会更新当前文件，这样可以达到最优开发体验。
> mtor 底层有对热更新做适配，会保留里面的所有数据， 包括静态属性和类属性， 热更新数据都不会丢失。


# 七、自己构建
如果需要定制api GitHub 上克隆代码并自己构建。
```shell
git clone https://github.com/sampsonli/mtor node_modules/mtor
cd node_modules/mtor
npm install
npm run build
```

# 八、一起维护
欢迎大家pull request 贡献自己的代码、提取宝贵意见。
# 九、参考模板项目
一个整合最新react17+webpack5通用模板项目[react_template_project](https://github.com/sampsonli/react_template_project)
此项目本人会不断维护更新，以最佳实践去使用 mtor。 大家也可以贡献自己的代码到这个项目中。

