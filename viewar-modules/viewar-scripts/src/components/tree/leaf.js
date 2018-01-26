import compose from 'stampit/compose';

import { $ } from '../../dependencies';

/**
 * @interface Leaf
 */
export const Leaf = compose({

  initializers: [function ({parent = null}) {
    let _parent = parent;

    /**
     * Node's parent
     * @member {Node}
     * @memberof Leaf#
     */
    Object.defineProperty(this, 'parent', {
      get: () => _parent,
      enumerable: true,
      configurable: false
    });

    Object.assign($(this), {
      setParent(newParent) {
        _parent = newParent;
      }
    })
  }],

});

export const SceneChild = Leaf;
