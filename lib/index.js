"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModels = exports.convert = exports.Model = exports.resource = exports.inject = exports.useModel = exports.service = void 0;
/**
 * mtor
 * Copyright (c) 2021 Sampson Li (lichun) <740056710@qq.com>
 * @license MIT
 */
var react_1 = require("react");
var util_1 = require("./util");
var EventBus_1 = require("./EventBus");
var EventBus_2 = require("./EventBus");
Object.defineProperty(exports, "eventBus", { enumerable: true, get: function () { return EventBus_2.eventBus; } });
// 保存所有模块的原型
var allProto = {};
// 保存所有模块的static属性, 方便开发模式热更新静态数据保留
var allStatic = {};
var allState = {};
var FLAG_PREFIX = 'spring/';
// 用于保存所有模块依赖注入注册的事件， 防止热更新的时候内存泄露
var allEvents = {};
/**
 * 创建模块
 * @param {string} ns -- 模块名称， 模块名称唯一， 不能有冲突
 */
function service(ns) {
    return function (Clazz) {
        var TYPE = "" + FLAG_PREFIX + ns;
        var instance = new Clazz();
        var __wired = Clazz.prototype.__wired || {};
        var wiredList = Object.keys(__wired);
        delete Clazz.prototype.__wired;
        function doUpdate(newState) {
            var keys = Object.keys(newState);
            var oldState = allState[ns];
            var diff = keys.some(function (key) { return !__wired[key] && newState[key] !== oldState[key]; });
            if (diff) {
                var newObj = Object.create(allProto[ns]);
                util_1.assign(newObj, newState);
                allState[ns] = newObj;
                EventBus_1.eventBus.emit(TYPE, newObj);
            }
        }
        // 给外面用的原型实例
        var prototype = { setData: undefined, reset: undefined, created: undefined };
        // 给内部用的原型实例
        var _prototype = { setData: undefined, reset: undefined };
        Object.getOwnPropertyNames(Clazz.prototype).forEach(function (key) {
            if (key !== 'constructor' && typeof Clazz.prototype[key] === 'function') {
                var origin_1 = Clazz.prototype[key];
                var isGen_1 = util_1.isGenerator(origin_1); // 是否是generator方法
                prototype[key] = function () {
                    var params = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        params[_i] = arguments[_i];
                    }
                    var _this = Object.create(_prototype);
                    if (isGen_1) { // 如果当前方法是generator方法
                        var runGen_1 = function (ge, val, isError, e) {
                            var state = allState[ns];
                            Object.keys(state).forEach(function (_key) {
                                if (__wired[_key]) {
                                    _this[_key] = allState[__wired[_key]];
                                }
                                else {
                                    _this[_key] = state[_key];
                                }
                            });
                            var tmp;
                            try {
                                if (isError) {
                                    tmp = ge.throw(e);
                                }
                                else {
                                    tmp = ge.next(val);
                                }
                            }
                            catch (error) {
                                doUpdate(_this);
                                ge.throw(error);
                            }
                            doUpdate(_this);
                            if (tmp.done) {
                                return tmp.value;
                            }
                            if (tmp.value && tmp.value.then) {
                                return tmp.value.then(function (data) { return runGen_1(ge, data, false, null); }).catch(function (error) { return runGen_1(ge, null, true, error); });
                            }
                            return runGen_1(ge, tmp.value, false, null);
                        };
                        // 异步方法必须异步执行
                        return Promise.resolve().then(function () { return runGen_1(origin_1.bind(_this).apply(void 0, params), null, false, null); });
                    }
                    var state = allState[ns];
                    Object.keys(state).forEach(function (_key) {
                        if (__wired[_key]) { // 更新注入的模块实例
                            _this[_key] = allState[__wired[_key]];
                        }
                        else {
                            _this[_key] = state[_key];
                        }
                    });
                    var result = origin_1.bind(_this).apply(void 0, params);
                    if (result && typeof result.then === 'function') { // 如果返回来的是promise, 对数据进行同步， 此处可以兼容大部分async/await方法
                        doUpdate(_this);
                        return result.then(function (data) {
                            doUpdate(_this);
                            return data;
                        });
                    }
                    // console.log('hello111')
                    doUpdate(_this);
                    return result;
                };
                if (isGen_1) { // 解决异步方法嵌套调用问题
                    _prototype[key] = prototype[key];
                }
                else {
                    _prototype[key] = origin_1;
                }
            }
        });
        // @ts-ignore
        prototype.setData = function (props) {
            var state = allState[ns];
            var keys = Object.keys(props);
            if (keys.some(function (key) { return props[key] !== state[key]; })) {
                var newObj = Object.create(allProto[ns]);
                util_1.assign(newObj, state);
                util_1.assign(newObj, props);
                allState[ns] = newObj;
                EventBus_1.eventBus.emit(TYPE, newObj);
            }
        };
        // @ts-ignore
        _prototype.setData = prototype.setData; // 模块内部也支持 调用setData方法
        var initState = Object.create(prototype);
        /**
         * 重置模块数据到初始状态， 一般用于组件销毁的时候调用
         */
        // @ts-ignore
        prototype.reset = function () {
            var newObj = Object.create(prototype);
            Object.getOwnPropertyNames(instance).forEach(function (key) {
                newObj[key] = instance[key];
            });
            wiredList.forEach(function (key) {
                newObj[key] = allState[__wired[key]];
            });
            allState[ns] = newObj;
            EventBus_1.eventBus.emit(TYPE, newObj);
        };
        // @ts-ignore
        _prototype.reset = prototype.reset;
        var finalInstance = allState[ns] ? allState[ns] : instance;
        Object.getOwnPropertyNames(instance).forEach(function (key) {
            initState[key] = finalInstance[key];
        });
        wiredList.forEach(function (key) {
            initState[key] = allState[__wired[key]];
        });
        // eventBus.on(TYPE, (state) => allState[ns] = state);
        allEvents[ns] = allEvents[ns] || {};
        var events = allEvents[ns];
        wiredList.forEach(function (key) {
            var eventName = "" + FLAG_PREFIX + __wired[key];
            events[eventName] && EventBus_1.eventBus.off(eventName, events[eventName]);
            events[eventName] = function (state) {
                var newObj = Object.create(allProto[ns]);
                util_1.assign(newObj, allState[ns]);
                newObj[key] = state;
                allState[ns] = newObj;
                EventBus_1.eventBus.emit(TYPE, newObj);
            };
            EventBus_1.eventBus.on(eventName, events[eventName]);
        });
        var isHotReload = !!allProto[ns];
        if (isHotReload) { // 热更新时候用得到
            allState[ns] = initState;
            EventBus_1.eventBus.emit(TYPE, initState); // 热更新替换老的模型实例
        }
        /**
         * 开发模式 static数据保存和恢复
         */
        if (!isHotReload) {
            allState[ns] = initState;
            allStatic[ns] = util_1.assign({}, Clazz);
        }
        else {
            util_1.assign(Clazz, allStatic[ns]);
        }
        allProto[ns] = prototype;
        // 初始化提供created 方法调用, 热更新不重复调用
        if (typeof prototype.created === 'function' && !isHotReload) {
            // @ts-ignore
            prototype.created();
        }
        Clazz.ns = ns;
        util_1.assign(Clazz.prototype, prototype); // 覆盖初始原型对象
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
    Model.ns = '';
    return Model;
}());
exports.Model = Model;
/**
 * 转换generator类型到promise类型， 如果主项目使用ts开发， 可以通过此方法可以转换到Promise类型避免ts类型提示错误
 * @param gen 被转换的generator类型
 */
exports.convert = function (gen) {
    return gen;
};
/**
 * 获取所有模型实例
 */
exports.getModels = function () {
    return allState;
};
//# sourceMappingURL=index.js.map