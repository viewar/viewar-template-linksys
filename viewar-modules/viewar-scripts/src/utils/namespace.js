const namespaces = new WeakSet();

export default function createNamespace() {
  const map = new WeakMap();

  namespaces.add(map);

  return function get(object) {
    !map.has(object) && map.set(object, {});
    return map.get(object);
  }
}
