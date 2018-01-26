import compose from 'stampit/compose';
import isEqual from 'lodash/isEqual';

import createNamespace from '../utils/namespace';
import { createAssignMembers } from '../utils/utils';

import { injector, $ } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { DEFAULT_POSE, DEFAULT_INTERACTION, DEFAULT_VISIBLE } from '../constants';

import { SceneNode } from '../components/scene-node/scene-node';

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

export const Assembly = compose(SceneNode, {

  initializers: [function (specification) {
    const { model, containerProxy, content, coreInterface, modelManager } = specification;

    this::assignMembers({
      public: {
        /**
         * Model this object was instantiated from.
         * @type {Model}
         * @memberOf! Assembly#
         */
        model,
      },
      shared: {
        insert: this::insert,
        remove: this::remove,
      },
      private: {
        coreInterface,
        modelManager,
        content,
        containerProxy,
        parts: [],
      },
    });
  }],

  methods: {
    setPropertyValues,
    toJSON,
  },

  propertyDescriptors: {
    displayTemplate: { get() { return this::compileDisplayTemplate(); } },
    properties: { get() { return this::getProperties(); } },
    propertyValues: { get() { return this::getPropertyValues(); } },
  },

});

export const createAssembly = injector.wireFactory(Assembly, {
  coreInterface: CoreInterface,
});

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

function getProperties() {
  const properties = {};

  _(this).containerProxy.children.forEach(child => {
    Object.assign(properties, child.properties);
  });

  return properties;
}

/**
 * Sets values of given properties.
 * @param {object} newValues
 * @memberOf! {Assembly}
 */
function setPropertyValues(newValues) {
  return Promise.all(_(this).containerProxy.children.map(child => child.setPropertyValues(newValues)));
}

function getPropertyValues() {
  const propertyValues = {};

  _(this).containerProxy.children.forEach(child => {
    Object.assign(propertyValues, child.propertyValues);
  });

  return propertyValues;
}

function compileDisplayTemplate() {
  const displayTemplate = [];
  for (const propertyId in this.properties) {
    displayTemplate.push({
      display: "thumbnails",
      name: propertyId,
      properties: [propertyId]
    });
  }
  return displayTemplate;
}

//======================================================================================================================
// SHARED INTERFACE
//======================================================================================================================


async function insert() {
  const {containerProxy} = _(this);
  $(containerProxy).setParent(this.parent);
  await $(containerProxy).insert();
  await this::insertContent(_(this).containerProxy, _(this).content);
  return this;
}

async function insertContent(container, content) {
  for (const childSpecification of content) {
    _(this).parts.push(await $(childSpecification.model).instantiate({...childSpecification, parent: container}));
  }
}

async function remove() {
  return _(this).coreInterface.call('deleteInstance', this.id);
}

function toJSON() {
  const { model, propertyValues, pose, interaction, visible, id } = this;
  return {
    id,
    model: model.foreignKey || model.id,
    propertyValues,
    pose: isEqual(pose, DEFAULT_POSE) ? undefined : pose,
    interaction: isEqual(interaction, DEFAULT_INTERACTION) ? undefined : interaction,
    visible: isEqual(visible, DEFAULT_VISIBLE) ? undefined : visible,
  };
}
