/**
 * mtor
 * Copyright (c) 2021 Sampson Li (lichun) <740056710@qq.com>
 * @license MIT
 */
import {useState, useEffect} from 'react';
import {assign} from "./util";
import {eventBus} from './EventBus';

export {eventBus as evtBus} from './EventBus';
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

        // 给外面用的原型实例
        const prototype = {setData: undefined, reset: undefined, created: undefined, __origin: instance};

        let isSyncing = false;
        let toBeSyncState: {_state: any};
        const syncFn = () => {
            if(isSyncing) return; // 节流
            Promise.resolve().then(() => {
                const newObj = Object.create(allProto[ns]);
                assign(newObj, toBeSyncState._state);
                allState[ns] = newObj;
                eventBus.emit(TYPE, newObj);
                isSyncing = false;
            });
            isSyncing = true;
        }
        Object.getOwnPropertyNames(Clazz.prototype).forEach(key => {
            if (key !== 'constructor' && typeof Clazz.prototype[key] === 'function') {
                const origin = Clazz.prototype[key];
                prototype[key] = function (...params) {
                    return origin.bind(toBeSyncState)(...params)
                };
            }
        });

        // @ts-ignore
        prototype.setData = function (props: Object) {
            assign(toBeSyncState, props)
        };
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
            assign(toBeSyncState, newObj)
        };
        const finalInstance = allState[ns] || instance;
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
                assign(toBeSyncState, {[key]: state})
            }
            eventBus.on(eventName, events[eventName]);
        });

        const initSyncState = (state = allState[ns]) => {
            toBeSyncState = Object.create(prototype);
            toBeSyncState._state = state;
            Object.keys(state).forEach(key => {
                Object.defineProperty(toBeSyncState, key, {
                    set: (value) => {
                        if (value !== toBeSyncState[key]) {
                            toBeSyncState._state[key] = value;
                            syncFn();
                        }
                    },
                    get: () => toBeSyncState._state[key],
                })
            });
        }
        const isHotReload = !!allProto[ns];
        if (isHotReload) { // 热更新时候用得到
            initSyncState(allState[ns]);
            assign(toBeSyncState, initState);
            syncFn(); // 强制触发一次更新
        }
        if (!isHotReload) { // 第一次加载初始化
            allState[ns] = initState;
            initSyncState(initState);
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
 * 获取所有模型实例
 */
export const getModels = () => {
    return allState;
}


/**
 *  用于保存页面销毁前定时器清除方法回调
 */
const tempObj = {};
/**
 * 对useModel 方法二次封装的工具方法， 可以避免开发环境热更新重新调用初始化方法以及重置方法。
 * 页面中实例化模块类，同时调用指定初始化方法，以及页面销毁的时候调用 reset方法
 * @param Clazz - 模块类
 * @param initFn - 模块类中方法名字符串或方法回调, 默认“init”
 * @param clean - 是否在页面销毁的时候调用reset方法, 默认true
 */
export const useInitModel = <T extends Model>(Clazz: { new(): T, ns: string }, initFn: string | ((args: T) => any) = 'init', clean: boolean = true): T => {
    const model = useModel(Clazz);
    useEffect(() => {
        if (tempObj[Clazz.ns]) {
            clearTimeout(tempObj[Clazz.ns]);
        } else {
            if (typeof initFn === 'string') {
                model[initFn] && model[initFn]();
            }
            if (typeof initFn === 'function') {
                initFn(model);
            }
        }
        return () => {
            tempObj[Clazz.ns] = setTimeout(() => {
                clean && model.reset();
                delete tempObj[Clazz.ns];
            }, 20);
        };
    }, []);
    return model;
}
