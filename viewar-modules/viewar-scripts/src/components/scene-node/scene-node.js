import compose from 'stampit/compose';
import createNamespace from '../../utils/namespace';
import { $ } from '../../dependencies';

import { Identifiable } from '../identifiable/identifiable';
import { Highlightable } from '../highlightable/highlightable';
import { Locatable } from '../locatable/locatable';
import { Visible } from '../visible/visible';
import { Interactive } from '../interactive/interactive';
import { Leaf } from '../tree/leaf';
import { ProtectedEmitter } from '../emitter';

const _ = createNamespace();

//======================================================================================================================

/**
 * Provides getters and setters for common properties of scene nodes ({@link ModelInstance} {@link Container})
 *
 * @interface SceneNode
 * @extends Identifiable
 * @extends Highlightable
 * @extends Locatable
 * @extends Visible
 * @extends Interactive
 * @extends Leaf
 * @extends Emitter
 */
export const SceneNode = compose(Identifiable, Locatable, Visible, Interactive, Highlightable, Leaf, ProtectedEmitter, {
  initializers: [function ({coreInterface}) {
    Object.assign(_(this), {
      coreInterface
    });
  }],

  methods: {
    setParent,
    setPropertyValues
  },
});

/**
 * Moves the node to a new container.
 * @param {Container} newParent
 * @returns {Promise} resolved when done.
 *
 * @memberof SceneNode#
 */
function setParent(newParent) {
  return _(this).coreInterface.call('setParentContainer', this.id, newParent.id).then(() => {
    $(this.parent).removeChild(this);
    $(newParent).addChild(this);
  })
}

function setPropertyValues(newValues) {
  return this::callRecursively(node => node.setPropertyValues(newValues));
}

function callRecursively(fn) {
  return Promise.resolve().then(() => this.children && Promise.all(this.children.map(fn)));
}
