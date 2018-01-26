import compose from 'stampit/compose';

import createNamespace from '../../utils/namespace';
import { createAssignMembers } from '../../utils/utils';
import { $ } from '../../dependencies';

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

/**
 * Composed into description objects that can be instantiated.
 *
 * @interface Instantiable
 */
export const Instantiable = compose({

  initializers: [function () {
    const instances = new Set();

    this::assignMembers({
      shared: {
        instantiate: this::instantiate,
        registerInstance: this::registerInstance,
        unregisterInstance: this::unregisterInstance,
        unregisterAllInstances: this::unregisterAllInstances,
      },
      private: {
        instances,
      }
    });

    /**
     * Set of all instances of this instantiable object
     * @member {Set<ModelInstance>} instances
     * @memberof Instantiable
     */
    Object.defineProperty(this, 'instances', {
      get() { return new Set(instances); },
      enumerable: true,
    });

  }],
});

function instantiate() {
  throw new Error('instantiate() is not implemented!');
}

function registerInstance(instance) {
  _(this).instances.add(instance);
}

function unregisterInstance(instance) {
  _(this).instances.delete(instance);
}

function unregisterAllInstances() {
  _(this).instances.clear();
}
