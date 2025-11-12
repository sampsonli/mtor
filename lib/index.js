"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInitModel = exports.getModels = exports.Model = exports.resource = exports.inject = exports.useModel = exports.service = exports.define = void 0;
/**
 * mtor
 * Copyright (c) 2021 Sampson Li (lichun) <740056710@qq.com>
 * @license MIT
 */
var react_1 = require("react");
var util_1 = require("./util");
var EventBus_1 = require("./EventBus");
// 导出事件总线实例，供外部使用
var EventBus_2 = require("./EventBus");
Object.defineProperty(exports, "evtBus", { enumerable: true, get: function () { return EventBus_2.eventBus; } });
/**
 * 全局存储对象，用于管理所有模块实例
 */
// 保存所有模块的原型对象，键为模块名称，值为模块原型
var allProto = {};
// 保存所有模块的静态属性，用于开发模式下的热更新，确保静态数据不丢失
var allStatic = {};
// 保存所有模块的实例状态，键为模块名称，值为模块实例
var allState = {};
// 事件前缀，用于区分不同模块的事件
var FLAG_PREFIX = 'mtor/';
/**
 * 保存所有模块依赖注入注册的事件监听器，防止热更新时内存泄漏
 * 结构：{ [模块名称]: { [事件名称]: 事件监听函数 } }
 */
var allEvents = {};
/**
 * 基于webpack打包构建中定义模块
 * @param {string} md -- 模块（必须包含id属性）
 */
function define(md) {
    var _a;
    // @ts-ignore
    (_a = md.hot) === null || _a === void 0 ? void 0 : _a.accept();
    return service(md.id);
}
exports.define = define;
/**
 * 创建模块
 * @param {string} ns -- 模块名称， 模块名称唯一， 不能有冲突
 */
function service(ns) {
    return function (Clazz) {
        var TYPE = "" + FLAG_PREFIX + ns;
        var instance = new Clazz();
        var __wired = Clazz.prototype.__wired;
        if (!__wired) {
            __wired = {};
            var tmp_1 = Object.getOwnPropertyDescriptors(instance);
            Object.keys(tmp_1).forEach(function (key) {
                if (typeof tmp_1[key].value === "string") {
                    var _ns = tmp_1[key].value.split('xxx$$$~~~')[1];
                    if (_ns) {
                        __wired[key] = _ns;
                    }
                }
            });
        }
        var wiredList = Object.keys(__wired);
        delete Clazz.prototype.__wired;
        // 给外面用的原型实例
        var prototype = { setData: undefined, reset: undefined, onCreated: undefined, __origin: instance, onBeforeClean: undefined, onBeforeReset: undefined };
        // 是否正在同步标志位
        var isSyncing = false;
        var toBeSyncState; // 内部this, 对this 的如何修改都会同步到_toBeSyncState中
        var _toBeSyncState; // 真正保存中间数据的对象
        // 同步数据方法
        var syncFn = function () {
            if (isSyncing)
                return; // 节流
            Promise.resolve().then(function () {
                // 重新实例化对象
                var newObj = Object.create(allProto[ns]);
                util_1.assign(newObj, _toBeSyncState);
                allState[ns] = newObj;
                EventBus_1.eventBus.emit(TYPE, newObj);
                isSyncing = false;
            });
            isSyncing = true;
        };
        var propNames = Object.getOwnPropertyNames(Clazz.prototype);
        if (Object.getPrototypeOf(Clazz.prototype) !== Model.prototype) {
            propNames = __spreadArrays(Object.getOwnPropertyNames(Object.getPrototypeOf(Clazz.prototype)), propNames);
        }
        propNames.forEach(function (key) {
            var _a;
            if (key !== 'constructor' && typeof Clazz.prototype[key] === 'function') {
                var evtName_1 = "" + FLAG_PREFIX + ns + "-function-" + key;
                EventBus_1.eventBus.clean(evtName_1);
                EventBus_1.eventBus.on(evtName_1, function (_a) {
                    var params = _a.params, cb = _a.cb;
                    var origin = Clazz.prototype[key];
                    var result = origin.bind(toBeSyncState).apply(void 0, params);
                    cb(result);
                });
                prototype[key] = ((_a = allProto[ns]) === null || _a === void 0 ? void 0 : _a[key]) || function () {
                    var params = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        params[_i] = arguments[_i];
                    }
                    var result;
                    EventBus_1.eventBus.emit(evtName_1, {
                        params: params,
                        cb: function (ret) {
                            result = ret;
                        }
                    });
                    return result;
                };
            }
        });
        prototype.setData = function (props) {
            var needUpdate = false;
            Object.keys(props).forEach(function (key) {
                if (!Object.getOwnPropertyDescriptor(_toBeSyncState, key)) {
                    Object.defineProperty(toBeSyncState, key, {
                        set: function (value) {
                            if (value !== toBeSyncState[key]) {
                                _toBeSyncState[key] = value;
                                syncFn();
                            }
                        },
                        get: function () { return _toBeSyncState[key]; },
                    });
                    needUpdate = true;
                }
                else if (!needUpdate && props[key] !== _toBeSyncState[key]) {
                    needUpdate = true;
                }
            });
            if (needUpdate) { // 判断有没有修改
                // 重新实例化对象， 同步设置
                var newObj = Object.create(allProto[ns]);
                util_1.assign(_toBeSyncState, props);
                util_1.assign(newObj, _toBeSyncState);
                allState[ns] = newObj;
                EventBus_1.eventBus.emit(TYPE, newObj);
            }
        };
        var initState = Object.create(prototype);
        /**
         * 重置模块数据到初始状态， 一般用于组件销毁的时候调用
         */
        prototype.reset = function () {
            EventBus_1.eventBus.emit("" + FLAG_PREFIX + ns + "-reset");
            var newObj = Object.create(allProto[ns]);
            var origin = allProto[ns].__origin;
            Object.getOwnPropertyNames(origin).forEach(function (key) {
                newObj[key] = origin[key];
            });
            wiredList.forEach(function (key) {
                newObj[key] = allState[__wired[key]];
            });
            initSyncState(newObj);
            allState[ns] = newObj;
            EventBus_1.eventBus.emit(TYPE, newObj);
        };
        prototype.onBeforeReset = function (cb) {
            if (cb) {
                EventBus_1.eventBus.once("" + FLAG_PREFIX + ns + "-reset", cb);
            }
        };
        var finalInstance = allState[ns] || instance;
        Object.getOwnPropertyNames(instance).forEach(function (key) {
            initState[key] = finalInstance[key];
        });
        wiredList.forEach(function (key) {
            initState[key] = allState[__wired[key]];
        });
        allEvents[ns] = allEvents[ns] || {};
        var events = allEvents[ns];
        wiredList.forEach(function (key) {
            var eventName = "" + FLAG_PREFIX + __wired[key];
            events[eventName] && EventBus_1.eventBus.off(eventName, events[eventName]);
            events[eventName] = function (state) {
                var _a;
                util_1.assign(toBeSyncState, (_a = {}, _a[key] = state, _a));
            };
            EventBus_1.eventBus.on(eventName, events[eventName]);
        });
        var initSyncState = function (state) {
            if (state === void 0) { state = allState[ns]; }
            toBeSyncState = Object.create(prototype);
            _toBeSyncState = __assign({}, state);
            Object.keys(state).forEach(function (key) {
                Object.defineProperty(toBeSyncState, key, {
                    set: function (value) {
                        if (value !== toBeSyncState[key]) {
                            _toBeSyncState[key] = value;
                            syncFn();
                        }
                    },
                    get: function () { return _toBeSyncState[key]; },
                });
            });
        };
        var isHotReload = !!allProto[ns];
        if (isHotReload) { // 热更新时候用得到
            initSyncState(allState[ns]);
            util_1.assign(toBeSyncState, initState);
            syncFn(); // 强制触发一次更新
            // assign(Clazz, allStatic[ns]);
            Promise.resolve().then(function () {
                Object.keys(allStatic[ns]).forEach(function (key) {
                    Clazz[key] = allStatic[ns][key];
                });
                allStatic[ns] = Clazz;
            });
        }
        else {
            allState[ns] = initState;
            initSyncState(initState);
            allStatic[ns] = Clazz;
        }
        allProto[ns] = prototype;
        Clazz.ns = ns;
        // assign(Clazz.prototype, prototype); // 覆盖初始原型对象
        return Clazz;
    };
}
exports.service = service;
/**
 * react hooks 方式获取模块类实例
 * @param Class 模块类
 */
exports.useModel = function (Class) {
    var ns = Class.ns;
    var _a = react_1.useState(allState[ns]), data = _a[0], setData = _a[1];
    react_1.useEffect(function () {
        var eventName = "" + FLAG_PREFIX + ns;
        EventBus_1.eventBus.on(eventName, setData);
        return function () { return EventBus_1.eventBus.off(eventName, setData); };
    }, []);
    return data;
};
/**
 * 按照类型自动注入Model实例
 * @param {Model} Class --模块类
 */
function inject(Class) {
    var ns = Class.ns;
    return function (clazz, attr) {
        if (!clazz)
            return function () { return "xxx$$$~~~" + ns; };
        if (!clazz.__wired) {
            clazz.__wired = {};
        }
        clazz.__wired[attr] = ns;
    };
}
exports.inject = inject;
/**
 * 按照模块名自动注入Model实例
 * @param {string} ns --模块名称
 */
function resource(ns) {
    return function (clazz, attr) {
        if (!clazz.__wired) {
            clazz.__wired = {};
        }
        clazz.__wired[attr] = ns;
    };
}
exports.resource = resource;
/**
 * 模块基类，每个模块都应继承该基础模块类
 */
var Model = /** @class */ (function () {
    function Model() {
    }
    /**
     * 批量设置模块数据
     * @param {Object} data - key-value 对象
     */
    Model.prototype.setData = function (data) {
        return;
    };
    /**
     * 重置模块数据到初始默认值
     */
    Model.prototype.reset = function () {
        return;
    };
    Model.prototype.onBeforeReset = function (cb) {
    };
    Model.ns = '';
    return Model;
}());
exports.Model = Model;
/**
 * 获取所有模型实例
 */
exports.getModels = function () {
    return allState;
};
/**
 *  用于保存页面销毁前定时器清除方法回调
 */
var tempObj = {};
/**
 * 对useModel 方法二次封装的工具方法， 可以避免开发环境热更新重新调用初始化方法以及重置方法。
 * 页面中实例化模块类，同时调用指定初始化方法，以及页面销毁的时候调用 reset方法<br/>
 *
 * @param Clazz - 模块类
 *
 * @param initFn - 模块类中方法名字符串或方法回调
 *
 * @param clean - 是否在页面销毁的时候调用reset方法, 默认true
 */
exports.useInitModel = function (Clazz, initFn, clean) {
    if (initFn === void 0) { initFn = function () { return null; }; }
    if (clean === void 0) { clean = true; }
    var model = exports.useModel(Clazz);
    react_1.useEffect(function () {
        if (tempObj[Clazz.ns]) {
            clearTimeout(tempObj[Clazz.ns]);
        }
        else {
            if (typeof initFn === 'function') {
                initFn(model);
            }
        }
        return function () {
            tempObj[Clazz.ns] = setTimeout(function () {
                clean && model.reset();
                delete tempObj[Clazz.ns];
            }, 20);
        };
    }, []);
    return model;
};
//# sourceMappingURL=index.js.map