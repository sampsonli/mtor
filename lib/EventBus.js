"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
var EventBus = /** @class */ (function () {
    function EventBus() {
        this.cbs = {};
    }
    EventBus.prototype.on = function (type, listener) {
        if (this.cbs[type]) {
            this.cbs[type].push(listener);
        }
        else {
            this.cbs[type] = [listener];
        }
    };
    EventBus.prototype.off = function (type, listener) {
        if (this.cbs[type]) {
            this.cbs[type] = this.cbs[type].filter(function (cb) { return listener !== cb; });
        }
    };
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