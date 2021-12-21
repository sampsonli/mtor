/**
 * mtor
 * Copyright (c) 2021 Sampson Li (lichun) <740056710@qq.com>
 * @license MIT
 */
 import {useState, useEffect} from 'react';
 import {assign, isGenerator} from "./util";
 import {eventBus} from './EventBus';
export { eventBus as evtBus} from './EventBus';
 // 保存所有模块的原型
 const allProto = {};
 // 保存所有模块的static属性, 方便开发模式热更新静态数据保留
 const allStatic = {};

 let allState = {};

 const FLAG_PREFIX = 'mtor/';

 // 用于保存所有模块依赖注入注册的事件， 防止热更新的时候内存泄露
 const allEvents = {};


 /**
  * 创建模块
  * @param {string} ns -- 模块名称， 模块名称唯一， 不能有冲突
  */
 export function service(ns: string) {
     return function <T extends Model, K extends { new(): T, ns: string }>(Clazz: K): K {
         const TYPE = `${FLAG_PREFIX}${ns}`;
         const instance = new Clazz();
         const __wired = Clazz.prototype.__wired || {};
         const wiredList = Object.keys(__wired);
         delete Clazz.prototype.__wired;

         function doUpdate(newState) {
             const keys = Object.keys(newState);
             const oldState = allState[ns];
             const diff = keys.some(key => !__wired[key] && newState[key] !== oldState[key]);
             if (diff) {
                 const newObj = Object.create(allProto[ns]);
                 assign(newObj, newState);
                 allState[ns] = newObj;
                 eventBus.emit(TYPE, newObj);
             }
         }

         // 给外面用的原型实例
         const prototype = {setData: undefined, reset: undefined, created: undefined, eventBus, __origin: instance};

         // 给内部用的原型实例
         const _prototype = {setData: undefined, reset: undefined};

         Object.getOwnPropertyNames(Clazz.prototype).forEach(key => {
             if (key !== 'constructor' && typeof Clazz.prototype[key] === 'function') {
                 const origin = Clazz.prototype[key];
                 const isGen = isGenerator(origin); // 是否是generator方法
                 prototype[key] = function (...params) {
                     const _this = Object.create(_prototype);
                     if (isGen) { // 如果当前方法是generator方法
                         const runGen = (ge, val, isError, e) => {
                             const state = allState[ns];
                             Object.keys(state).forEach((_key) => {
                                 if (__wired[_key]) {
                                     _this[_key] = allState[__wired[_key]];
                                 } else {
                                     _this[_key] = state[_key];
                                 }
                             });
                             let tmp;
                             try {
                                 if (isError) {
                                     tmp = ge.throw(e);
                                 } else {
                                     tmp = ge.next(val);
                                 }
                             } catch (error) {
                                 doUpdate(_this);
                                 ge.throw(error);
                             }
                             doUpdate(_this);
                             if (tmp.done) {
                                 return tmp.value;
                             }
                             if (tmp.value && tmp.value.then) {
                                 return tmp.value.then(data => runGen(ge, data, false, null)).catch(error => runGen(ge, null, true, error));
                             }
                             return runGen(ge, tmp.value, false, null);
                         };
                         // 异步方法必须异步执行
                         return Promise.resolve().then(() => runGen(origin.bind(_this)(...params), null, false, null));
                     }
                     const state = allState[ns];
                     Object.keys(state).forEach(_key => {
                         if (__wired[_key]) { // 更新注入的模块实例
                             _this[_key] = allState[__wired[_key]];
                         } else {
                             _this[_key] = state[_key];
                         }
                     });
                     const result = origin.bind(_this)(...params);
                     if (result && typeof result.then === 'function') { // 如果返回来的是promise, 对数据进行同步， 此处可以兼容大部分async/await方法
                         doUpdate(_this);
                         return result.then(data => {
                             doUpdate(_this);
                             return data;
                         });
                     }
                     // console.log('hello111')
                     doUpdate(_this);
                     return result;
                 };
                 if (isGen) { // 解决异步方法嵌套调用问题
                     _prototype[key] = prototype[key];
                 } else {
                     _prototype[key] = origin;
                 }
             }
         });

         // @ts-ignore
         prototype.setData = function (props: Object) {
             const state = allState[ns];
             const keys = Object.keys(props);
             if (keys.some(key => props[key] !== state[key])) {
                 const newObj = Object.create(allProto[ns]);
                 assign(newObj, state);
                 assign(newObj, props);
                 allState[ns] = newObj;
                 eventBus.emit(TYPE, newObj);
             }
         };
         // @ts-ignore
         _prototype.setData = prototype.setData; // 模块内部也支持 调用setData方法

         const initState = Object.create(prototype);


         /**
          * 重置模块数据到初始状态， 一般用于组件销毁的时候调用
          */
         // @ts-ignore
         prototype.reset = function () {
             const newObj = Object.create(allProto[ns]);
             const origin = allProto[ns].__origin;
             Object.getOwnPropertyNames(origin).forEach(key => {
                 newObj[key] = origin[key];
             });
             wiredList.forEach(key => {
                 newObj[key] = allState[__wired[key]];
             });
             allState[ns] = newObj;
             eventBus.emit(TYPE, newObj);
         };
         // @ts-ignore
         _prototype.reset = prototype.reset;
         const finalInstance = allState[ns] ? allState[ns] : instance;
         Object.getOwnPropertyNames(instance).forEach(key => {
             initState[key] = finalInstance[key];
         });
         wiredList.forEach(key => {
             initState[key] = allState[__wired[key]];
         });

         // eventBus.on(TYPE, (state) => allState[ns] = state);
         allEvents[ns] = allEvents[ns] || {};
         const events = allEvents[ns];
         wiredList.forEach((key) => {
             const eventName = `${FLAG_PREFIX}${__wired[key]}`
             events[eventName] && eventBus.off(eventName, events[eventName]);
             events[eventName] = (state) => {
                 const newObj = Object.create(allProto[ns]);
                 assign(newObj, allState[ns]);
                 newObj[key] = state;
                 allState[ns] = newObj;
                 eventBus.emit(TYPE, newObj);
             }
             eventBus.on(eventName, events[eventName]);
         });

         const isHotReload = !!allProto[ns];
         if (isHotReload) { // 热更新时候用得到
             allState[ns] = initState;
             eventBus.emit(TYPE, initState); // 热更新替换老的模型实例

         }
         /**
          * 开发模式 static数据保存和恢复
          */
         if (!isHotReload) {
             allState[ns] = initState;
             allStatic[ns] = assign({}, Clazz);
         } else {
             assign(Clazz, allStatic[ns]);
         }

         allProto[ns] = prototype;
         // 初始化提供created 方法调用, 热更新不重复调用
         if (typeof prototype.created === 'function' && !isHotReload) {
             // @ts-ignore
             prototype.created();
         }
         Clazz.ns = ns;
         assign(Clazz.prototype, prototype); // 覆盖初始原型对象
         return Clazz;
     };
 }

 /**
  * react hooks 方式获取模块类实例
  * @param Class 模块类
  */
 export const useModel = <T extends Model>(Class: { new(): T, ns: string }): T => {
     const ns = Class.ns;
     const [data, setData] = useState(allState[ns]);
     useEffect(() => {
         const eventName = `${FLAG_PREFIX}${ns}`;
         eventBus.on(eventName, setData);
         return () => eventBus.off(eventName, setData);
     }, []);
     return data;
 };

 /**
  * 按照类型自动注入Model实例
  * @param {Model} Class --模块类
  */
 export function inject<T extends Model>(Class: { new(): T, ns: string }) {
     const ns = Class.ns;
     return (clazz, attr) => {
         if (!clazz.__wired) {
             clazz.__wired = {};
         }
         clazz.__wired[attr] = ns;
     };
 }

/**
 * 按照模块名自动注入Model实例
 * @param {string} ns --模块名称
 */
export function resource(ns: string) {
    return (clazz, attr) => {
        if (!clazz.__wired) {
            clazz.__wired = {};
        }
        clazz.__wired[attr] = ns;
    };
}


 /**
  * 模块基类，每个模块都应继承该基础模块类
  */
 export class Model {
     static ns = '';

     /**
      * 批量设置模块数据
      * @param {Object} data - key-value 对象
      */
     setData<T>(this: T, data: { [p in { [c in keyof T]: T[c] extends Function ? never : c }[keyof T]]?: T[p] }) {
         return;
     }

     /**
      * 重置模块数据到初始默认值
      */
     reset() {
         return;
     }
 }

 /**
  * 转换generator类型到promise类型， 如果主项目使用ts开发， 可以通过此方法可以转换到Promise类型避免ts类型提示错误
  * @param gen 被转换的generator类型
  */
 export const convert = <T>(gen: Generator<unknown, T, unknown>): Promise<T> => {
     return <any>gen;
 }

/**
 * 获取所有模型实例
 */
export const getModels = () => {
     return allState;
 }
