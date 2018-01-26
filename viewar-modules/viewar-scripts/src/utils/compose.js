import sharedMembers from './shared';

export function assign(target, ...sources) {
  sources.forEach(source => Object.keys(source || {}).forEach(key =>
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key))
  ));
  return target;
}

export function compose(...factories) {
  return function (props = {}) {
    return factories.reduce((object, factory) => {
      factory.call(object, props, sharedMembers);
      return object;
    }, this || Object.create(null));
  }
}

export function withProps(factory, newProps) {
  return function (props = {}) {
    const object = this || Object.create(null);
    factory.call(object, {...props, ...newProps}, sharedMembers);
    return object;
  }
}
