import compose from 'stampit/compose';

import { $ } from '../../dependencies';
import { clamp } from '../../utils/utils';
import { Leaf } from './leaf';

/**
 * @interface Node
 * @extends Leaf
 */
export const Node = compose(Leaf, {

  initializers: [function () {

    Object.assign($(this), {
      addChild: this::addChild,
      removeChild: this::removeChild,
    });

  }],

  deepProperties: {
    /**
     * Node's children
     * @member {Leaf[]}
     * @memberof Node#
     */
    children: []
  },

});

function addChild(child, position = Infinity) {
  const clampedPosition = clamp(position, 0, this.children.length);

  this.children.splice(clampedPosition, 0, child);
  $(child).setParent(this);

  return true;
}

function removeChild(child) {
  const childIndex = this.children.indexOf(child);

  if (~childIndex) {
    this.children.splice(childIndex, 1);
    $(child).setParent(null);
    return true;
  }

  return false;
}

export const SceneParent = Node;
