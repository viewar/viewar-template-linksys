import compose from 'stampit/compose';

import { $ } from '../../dependencies';

import { Identifiable } from '../identifiable/identifiable';
import { DEFAULT_VISIBLE } from '../../constants';

/**
 * Represents scene nodes whose visibility can be toggled.
 *
 * @interface Visible
 * @extends Identifiable
 */
export const Visible = compose(Identifiable, {

  initializers: [function ({visible = Visible.DEFAULT_VISIBLE, coreInterface}) {
    let _visible = visible;

    /**
     * Object's visibility.
     * @member {boolean}
     * @memberof Visible#
     */
    Object.defineProperty(this, 'visible', {
      get: () => _visible,
      enumerable: true,
      configurable: false
    });

    /**
     * Changes object's visibility.
     * @method setVisible
     * @memberof Visible
     * @param newVisible {boolean}
     * @returns {Promise} Promise that resolves when updated.
     */
    this.setVisible = function setVisible(newVisible) {
      return coreInterface.call('setNodeVisibility', this.id, newVisible)
          .then(() => _visible = newVisible);
    };

    Object.assign($(this), {
      updateVisible(newVisible) {
        return _visible = newVisible;
      }
    });

  }],

  staticPropertyDescriptors: {
    DEFAULT_VISIBLE: {
      get: () => DEFAULT_VISIBLE,
      enumerable: true,
      configurable: false
    }
  }

});

