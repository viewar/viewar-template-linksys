/**
 * @interface Mesh
 */

/**
 * @private
 * @returns {Mesh}
 */
export default function createMesh(specification) {
  const { coreInterface } = specification;

  let {
    id,
    name,
    collision,
    wireframeMode,
    visibility,
    material,
    numVertices
  } = Object.assign({}, specification);

  const mesh = {
    setMeshMaterial,
    setMeshVisibility,
    setMeshCollision,
    setMeshWireframeMode,

    /**
     * @type {string}
     * @memberOf! Mesh#
     */
    get id() { return id; },
    /**
     * @type {string}
     * @memberOf! Mesh#
     */
    get name() { return name; },
    /**
     * @type {number}
     * @memberOf! Mesh#
     */
    get vertexCount() { return numVertices; },
    /**
     * @type {material}
     * @memberOf! Mesh#
     */
    get material() { return material; },
    /**
     * @type {boolean}
     * @memberOf! Mesh#
     */
    get visibility() { return visibility; },
    /**
     * @type {boolean}
     * @memberOf! Mesh#
     */
    get collision() { return collision; },
    /**
     * @type {string}
     * @memberOf! Mesh#
     */
    get wireframeMode() { return wireframeMode; }
  };

  return mesh;

  /**
   * Sets mesh material
   * @param {string} newMaterialName
   * @returns {Promise} resolved when done.
   * @memberOf! Mesh#
   */
  function setMeshMaterial(newMaterialName) {
    material = newMaterialName;
    return coreInterface.call('setMeshMaterial', id, material);
  }

  /**
   * Sets mesh visibility
   * @param {boolean} newVisibility
   * @returns {Promise} resolved when done.
   * @memberOf! Mesh#
   */
  function setMeshVisibility(newVisibility) {
    visibility = newVisibility;
    return coreInterface.call('setMeshVisibility', id, visibility);
  }

  /**
   * Sets mesh collision
   * @param {boolean} newCollision
   * @returns {Promise} resolved when done.
   * @memberOf! Mesh#
   */
  function setMeshCollision(newCollision) {
    collision = newCollision;
    return coreInterface.call('useMeshAsCollider', id, collision);
  }

  /**
   * Sets mesh wireframe mode
   * @param {string} newWireframeMode
   * @returns {Promise} resolved when done.
   * @memberOf! Mesh#
   */
  function setMeshWireframeMode(newWireframeMode) {
    wireframeMode = newWireframeMode;
    return coreInterface.call('useMeshWireframeMode', id, wireframeMode);
  }
}
