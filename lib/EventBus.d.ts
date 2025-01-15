declare class EventBus {
    private cbs;
    /**
     * 注册事件
     * @param type - 事件名称
     * @param listener - 事件回调函数
     * @returns  取消当前事件回调方法
     */
    on(type: any, listener: any): () => void;
    /**
     * 取消注册的事件
     * @param type - 事件名称
     * @param listener - 事件回调
     */
    off(type: any, listener: any): void;
    /**
     * 清除对某事件的所有监控
     * @param type - 事件名称
     */
    clean(type: any): void;
    /**
     * 触发某事件
     * @param event - 事件名称
     * @param param - 传递注册事件回调函数的参数
     */
    emit(event: any, param?: any): void;
    /**
     * 只注册一次事件， 回调完销毁事件注册
     * @param type - 事件名称
     * @param listener - 事件回调函数
     */
    once(type: any, listener: any): void;
    static instance: EventBus;
}
export default EventBus;
export declare const eventBus: EventBus;
