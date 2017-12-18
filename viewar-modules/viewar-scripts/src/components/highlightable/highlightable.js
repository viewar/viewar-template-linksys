import compose from 'stampit/compose';
import cloneDeep from 'lodash/cloneDeep';

import { $ } from '../../dependencies';
import { Identifiable } from '../identifiable/identifiable';

import { DEFAULT_HIGHLIGHT_INFO } from '../../constants';

/**
 * Composed into description objects that can be highlighted.
 *
 * @interface Highlightable
 * @extends Identifiable
 *
 */
export const Highlightable = compose(Identifiable, {

  initializers: [function ({highlight = Highlightable.DEFAULT_HIGHLIGHT, coreInterface}) {
    const _highlight = cloneDeep(highlight);

    /**
     * Object's highlight settings.
     * @member {HighlightInfo} highlight
     * @memberof Highlightable#
     */
    Object.defineProperty(this, 'highlight', {
      get: () => cloneDeep(_highlight),
      enumerable: true,
      configurable: false
    });

    /**
     * Object's highlight visibility.
     * @member {boolean} highlighted
     * @memberof Highlightable#
     */
    Object.defineProperty(this, 'highlighted', {
      get: () => _highlight.visible,
      enumerable: true,
      configurable: false
    });

    /**
     * Object's highlight settings.
     * @method setHighlighted
     * @memberof Highlightable#
     * @param newHighlight {boolean}
     * @returns {Promise} Promise that resolves when updated.
     */
    this.setHighlighted = function setHighlighted(visible) {
      return coreInterface.call('setNodeHighlight', this.id, visible)
          .then(() => Object.assign(_highlight, { visible }));
    };

  }],

  staticPropertyDescriptors: {
    DEFAULT_HIGHLIGHT: {
      get: () => cloneDeep(DEFAULT_HIGHLIGHT_INFO),
      enumerable: true,
      configurable: false
    }
  }

});
