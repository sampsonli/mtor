export function assign(target, from) {
    if (Object.assign) return Object.assign(target, from); // 现代浏览器赋值
    Object.keys(from).forEach(key => {
        target[key] = from[key];
    });
    return target;
}
