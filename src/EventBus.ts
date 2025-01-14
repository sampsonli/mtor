class EventBus {
    private cbs = {

    };

    /**
     * 注册事件
     * @param type - 事件名称
     * @param listener - 事件回调函数
     * @returns  取消当前事件回调方法
     */
    on(type, listener) {
        if (this.cbs[type]) {
            this.cbs[type].push(listener);
        } else {
            this.cbs[type] = [listener];
        }
        return () =>  {
            this.cbs[type] = this.cbs[type].filter(cb => listener !== cb);
        }
    }

    /**
     * 取消注册的事件
     * @param type - 事件名称
     * @param listener - 事件回调
     */
    off(type, listener) {
        if (this.cbs[type]) {
            this.cbs[type] = this.cbs[type].filter(cb => listener !== cb);
        }
    }

    /**
     * 清除对某事件的所有监控
     * @param type - 事件名称
     */
    clean(type) {
        delete this.cbs[type]
    }

    /**
     * 触发某事件
     * @param event - 事件名称
     * @param param - 传递注册事件回调函数的参数
     */
    emit(event, param = undefined) {
        if (this.cbs[event]) {
            const todelete = [];
            this.cbs[event].forEach(cb => {
                if (cb._once) {
                    todelete.push(cb);
                }
                cb(param);
            });
            this.cbs[event] = this.cbs[event].filter(evt => todelete.indexOf(evt) === -1);
        }
    }

    /**
     * 只注册一次事件， 回调完销毁事件注册
     * @param type - 事件名称
     * @param listener - 事件回调函数
     */
    once(type, listener) {
        listener._once = true;
        this.on(type, listener);
    }

    static instance = new EventBus();
}

export default EventBus;
export const eventBus = EventBus.instance;
