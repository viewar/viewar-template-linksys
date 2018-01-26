import compose from 'stampit/compose';
import cloneDeep from 'lodash/cloneDeep';

import { $ } from '../../dependencies';

import { Identifiable } from '../identifiable/identifiable';
import { DEFAULT_INTERACTION } from '../../constants';

/**
 * Represents interactive scene nodes.
 *
 * @interface Interactive
 * @extends Identifiable
 */
export const Interactive = compose(Identifiable, {

  initializers: [function ({interaction = Interactive.DEFAULT_INTERACTION, coreInterface}) {
    const _interaction = cloneDeep(interaction);

    /**
     * Object's interaction settings.
     * @member interaction {Interaction}
     * @memberof Interactive#
     */
    Object.defineProperty(this, 'interaction', {
      get: () => cloneDeep(_interaction),
      enumerable: true,
      configurable: false
    });

    /**
     * Changes object's interaction settings.
     * @method setInteraction
     * @memberof Interactive#
     * @param newInteraction {Interaction}
     * @returns {Promise} Promise that resolves when updated.
     */

    this.setInteraction = function setInteraction(newInteraction) {
      return coreInterface.call('setObjectInteraction', this.id, newInteraction)
          .then(() => Object.assign(_interaction, newInteraction));
    };

    Object.assign($(this), {
      updateInteraction(newInteraction) {
        return Object.assign(_interaction, newInteraction);
      }
    });
  }],

  staticPropertyDescriptors: {
    DEFAULT_INTERACTION: {
      get: () => cloneDeep(DEFAULT_INTERACTION),
      enumerable: true,
      configurable: false
    }
  }

});
