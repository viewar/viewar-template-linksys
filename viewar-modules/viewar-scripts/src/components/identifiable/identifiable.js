import compose from 'stampit/compose';

import { generateId } from '../../utils/utils';

/**
 * Assigns a globally unique ID to the object.
 *
 * @interface Identifiable
 */
export const Identifiable = compose({

  initializers: [function ({id = Identifiable.generateId()}) {
    /**
     * system-wide unique identifier
     * @member {string} id
     * @memberOf Identifiable#
     */
    Object.defineProperty(this, 'id', {
      value: id,
      enumerable: true,
      configurable: false
    });
  }],

  staticProperties: {
    generateId
  }

});
