"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
var EventBus = /** @class */ (function () {
    function EventBus() {
        this.cbs = {};
    }
    /**
     * 注册事件
     * @param type - 事件名称
     * @param listener - 事件回调函数
     */
    EventBus.prototype.on = function (type, listener) {
        if (this.cbs[type]) {
            this.cbs[type].push(listener);
        }
        else {
            this.cbs[type] = [listener];
        }
    };
    /**
     * 取消注册的事件
     * @param type - 事件名称
     * @param listener - 事件回调
     */
    EventBus.prototype.off = function (type, listener) {
        if (this.cbs[type]) {
            this.cbs[type] = this.cbs[type].filter(function (cb) { return listener !== cb; });
        }
    };
    /**
     * 清除对某事件的所有监控
     * @param type - 事件名称
     */
    EventBus.prototype.clean = function (type) {
        delete this.cbs[type];
    };
    /**
     * 触发某事件
     * @param event - 事件名称
     * @param param - 传递注册事件回调函数的参数
     */
    EventBus.prototype.emit = function (event, param) {
        if (this.cbs[event]) {
            var todelete_1 = [];
            this.cbs[event].forEach(function (cb) {
                if (cb._once) {
                    todelete_1.push(cb);
                }
                cb(param);
            });
            this.cbs[event] = this.cbs[event].filter(function (evt) { return todelete_1.indexOf(evt) === -1; });
        }
    };
    /**
     * 只注册一次事件， 回调完销毁事件注册
     * @param type - 事件名称
     * @param listener - 事件回调函数
     */
    EventBus.prototype.once = function (type, listener) {
        listener._once = true;
        this.on(type, listener);
    };
    EventBus.instance = new EventBus();
    return EventBus;
}());
exports.default = EventBus;
exports.eventBus = EventBus.instance;
//# sourceMappingURL=EventBus.js.map