declare class EventBus {
    cbs: {};
    on(type: any, listener: any): void;
    off(type: any, listener: any): void;
    clean(type: any): void;
    emit(event: any, param: any): void;
    once(type: any, listener: any): void;
    static instance: EventBus;
}
export default EventBus;
export declare const eventBus: EventBus;
