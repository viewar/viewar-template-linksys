import compose from 'stampit/compose';
import defaults from 'lodash/defaults';
import isEqual from 'lodash/isEqual';

import createNamespace from '../utils/namespace';
import { createAssignMembers } from '../utils/utils';

import { wireFactory, $ } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { DEFAULT_POSE, DEFAULT_INTERACTION, DEFAULT_VISIBLE } from '../constants';

import { SceneNode } from '../components/scene-node/scene-node';
import { Node } from '../components/tree/node';

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

//======================================================================================================================
// STAMP
//======================================================================================================================

/**
 * Represents a group of other scene nodes. Can be either grouped or ungrouped. If ungrouped, it is non-interactive but
 * its children are.
 *
 * @interface Container
 * @extends SceneNode
 * @extends Node
 */
export const Container = compose(SceneNode, Node, {

  initializers: [function (specification) {
    const { type } = defaults({}, specification, this);
    const { coreInterface } = specification;

    this::assignMembers({
      public: {
        /**
         *
         * @type {string}
         * @memberOf! Container#
         */
        type,
      },
      shared: {
        insert: this::insert,
        remove: this::remove,
      },
      private: {
        coreInterface
      },
    });
  }],

  methods: {
    toJSON,
  },

  properties: {
    type: 'grouped',
  },

  staticProperties: {
    TYPE_GROUPED: 'grouped',
    TYPE_UNGROUPED: 'ungrouped',
  },

});

async function insert() {
  await _(this).coreInterface.call('insertContainer', this.id, this::compileInsertionParams());
  return this;
}

async function remove() {
  return _(this).coreInterface.call('deleteInstance', this.id);
}

function compileInsertionParams() {
  return {
    pose: this.pose,
    highlight: this.highlight,
    orientation: this.interaction.manipulationPlane || this.interaction.orientation || 'horizontal',
    visible: this.visible,
    interaction: this.interaction,
    targetContainerId: this.parent.id,
    shouldBeGrouped: this.parent.type !== Container.TYPE_UNGROUPED,
  };
}

function toJSON() {
  const { type, orientation, pose, interaction, visible, id, children } = this;
  return {
    id,
    type,
    orientation,
    pose: isEqual(pose, DEFAULT_POSE) ? undefined : pose,
    interaction: isEqual(interaction, DEFAULT_INTERACTION) ? undefined : interaction,
    visible: isEqual(visible, DEFAULT_VISIBLE) ? undefined : visible,
    children,
  }
}

export const createContainer = wireFactory(Container, {
  coreInterface: CoreInterface,
});
