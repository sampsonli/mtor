class EventBus {
    cbs = {

    };

    on(type, listener) {
        if (this.cbs[type]) {
            this.cbs[type].push(listener);
        } else {
            this.cbs[type] = [listener];
        }
    }

    off(type, listener) {
        if (this.cbs[type]) {
            this.cbs[type] = this.cbs[type].filter(cb => listener !== cb);
        }
    }

    emit(event, param) {
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

    once(type, listener) {
        listener._once = true;
        this.on(type, listener);
    }

    static instance = new EventBus();
}

export default EventBus;
export const eventBus = EventBus.instance;
