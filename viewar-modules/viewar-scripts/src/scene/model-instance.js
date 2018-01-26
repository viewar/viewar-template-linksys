import compose from 'stampit/compose';
import isNil from 'lodash/isNil';
import isEqual from 'lodash/isEqual';
import mergeWith from 'lodash/mergeWith';
import deburr from 'lodash/deburr';
import pick from 'lodash/pick';

import createNamespace from '../utils/namespace';
import { dictionarize, toValueObject, createAssignMembers, sanitizePose, generateId } from '../utils/utils';
import { DEFAULT_POSE, DEFAULT_INTERACTION, DEFAULT_VISIBLE } from '../constants';

import { injector, $ } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';

import { SceneNode } from '../components/scene-node/scene-node';

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

//======================================================================================================================
// MODEL INSTANCE
//======================================================================================================================

/**
 * @typedef {Object.<string, string|number>} PropertyValues
 */

/**
 * @interface Property
 */

/**
 * name of the property. used when referencing the property
 * @member {string} name
 * @memberof Property#
 */

/**
 * Represents an instance of a model in the scene.
 *
 * @interface ModelInstance
 * @extends SceneNode
 */
export const ModelInstance = compose(SceneNode, {

  initializers: [function (specification) {
    const { coreInterface } = specification;
    const { model, animations, videos, properties, displayTemplate, parameterDescription, materialList } = specification;

    this::assignMembers({
      public: {
        /**
         * Model this object was instantiated from
         * @member {Model} model
         * @memberof ModelInstance#
         */
        model,
        /**
         * List of animations
         * @member {Animation[]} animations
         * @memberof ModelInstance#
         */
        animations,
        /**
         * List of videos
         * @member {Video[]} video
         * @memberof ModelInstance#
         */
        videos,
        /**
         * Template used for displaying instances properties
         * @member {Array.<Object>} displayTemplate
         * @memberof ModelInstance#
         */
        displayTemplate,
        /**
         * Dictionary of properties this instance has
         * @member {Object.<string, Property>} properties
         * @memberof ModelInstance#
         */
        properties: dictionarize(properties, 'name'),
      },
      shared: {
        insert: this::insert,
        remove: this::remove,
      },
      private: {
        coreInterface,
        properties,
        parameterDescription,
        materialList,
      },
    });
  }],

  methods: {
    setPropertyValues,
    toJSON,
  },

  propertyDescriptors: {
    /**
     * Dictionary of property values keyed by their names
     * @member {PropertyValues} propertyValues
     * @memberof ModelInstance#
     */
    propertyValues: { get() { return this::getPropertyValues(); } },
  }

});

export const createModelInstance = injector.wireFactory(ModelInstance, {
  coreInterface: CoreInterface,
});

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

function getPropertyValues() {
  return toValueObject(_(this).properties.map(({name, value: {key}}) => ({name, value: key})));
}

/**
 * Assigns values to one or more properties.
 * @param {PropertyValues} newValues
 * @returns {Promise.<void>} resolved when done.
 * @memberof ModelInstance#
 */
function setPropertyValues(newValues) {
  return Promise.resolve()
      .then(() => this::updatePropertyValues(newValues))
      .then((changedProperties) => Promise.all([
        this::updateMaterialProperties(changedProperties),
        this::updateGeometricProperties(changedProperties),
      ]));
}

function updatePropertyValues(newPropertyValues) {
  const currentPropertyValues = this.propertyValues;
  const changedPropertyValues = {};

  Object.entries(newPropertyValues).forEach(([name, valueKey]) => {
    if (currentPropertyValues[name] && currentPropertyValues[name] !== valueKey) {
      changedPropertyValues[name] = valueKey;
    }
  });

  Object.entries(changedPropertyValues).forEach(([name, valueKey]) => {
    const property = this.properties[name];
    const resolvedValue =
        property.resolveValue(deburr(valueKey).replace(/::/, '_').replace(/[^\w_]+/g, '')) ||
        property.resolveValue(valueKey);
    if (resolvedValue) {
      property.value = resolvedValue;
    }
  });

  return changedPropertyValues;
}

function updateMaterialProperties(changedPropertyValues) {
  const transferId = generateId();
  const materialPropNames = _(this).properties.filter(property => property.type === 'material').map(prop => prop.name);
  const values = pick(changedPropertyValues, materialPropNames);
  console.log(this.model.foreignKey, values);
  return _(this).coreInterface.call('applyMaterialOptions', {[this.id]: values}, '', transferId);
}

function updateGeometricProperties() {
  const { parameters } = this::compilePropertyParams();
  return _(this).coreInterface.call('setInstanceParameterGroupTransformations', this.id, parameters);
}

//======================================================================================================================
// SHARED INTERFACE
//======================================================================================================================

async function insert(pose, {snapTo} = {}) {
  const transferId = generateId();

  await _(this).coreInterface.call('insertModelNew', this.model.id, {
    ...this::compileInsertionParams(),
    pose: !snapTo && pose ? sanitizePose(pose) : undefined,
    snapTo,
  }, '', transferId);

  $(this.model).registerInstance(this);
  $(this).updatePose(await _(this).coreInterface.call('getInstancePose', this.id));
  return this;
}

function remove() {
  return _(this).coreInterface.call('deleteInstance', this.id);
}

//======================================================================================================================
// PRIVATE INTERFACE
//======================================================================================================================

function compileInsertionParams() {
  const { materialPickerInfo, parameters } = this::compilePropertyParams();

  return {
    instanceId: this.id,
    highlight: this.highlight,
    pose: this.pose,
    materialPickerInfo,
    parameters,
    visible: this.visible,
    interaction: this.interaction,
    animations: dictionarize(this.animations.map(({name}) => ({name, state: 'stopped', loop: false, time: 0})), 'name'),
    videos: dictionarize(this.videos.map(({name}) => ({name, state: 'stopped', loop: false, time: 0})), 'name'),
    targetContainerId: this.parent.id,
    shouldBeGrouped: this.parent.type !== 'ungrouped',
  };
}

function compilePropertyParams() {
  const {propertyValues: materials = {}} = mergeWith(..._(this).properties.filter(property => property.type === 'material')
      .map(property => property.getInsertionParams(this.propertyValues)));
  const {propertyValues: parameters = {}} = mergeWith(..._(this).properties.filter(property => property.type === 'geometric')
      .map(property => property.getInsertionParams(this.propertyValues)));

  return {
    materialPickerInfo: Object.entries(materials).map(([name, value]) => ({groupId: name, optionId: value})),
    parameters: this::compileParameterInfo(parameters, _(this).parameterDescription),
  }
}

function compileParameterInfo(parameters, parameterDescription) {
  const applyMapping = (newValue, {axis, scale = 1, offset = 0}) => ({[axis]: (newValue * scale + offset)});

  const uvOffsetInfo = parameterDescription
      .filter(({type}) => type === 'uvOffset')
      .map(({mappings, name}) =>
          mappings.reduce((object, key) =>
              Object.assign(object, {[key]: parameters[name] || 0}), {}))
      .reduce((object, part) => Object.assign(object, part), {});

  const info = parameterDescription
      .filter(({type}) => type === 'manipulation')
      .map(parameter =>
          parameter.mappings.map(mapping =>
              ({mapping, value: parameters[parameter.name] || 0})))
      .reduce((array, item) => array.concat(item), [])
      .filter(({value}) => !isNil(value))
      .reduce(function (object, {mapping: {group, translation, rotation, scaling}, value}) {
        const param = object[group] = object[group] || {group};

        param.translation = translation &&
            Object.assign(param.translation || {}, ...translation.map(info => applyMapping(value, info)));
        param.rotation = rotation &&
            Object.assign(param.rotation || {}, ...rotation.map(info => applyMapping(value, info)));
        param.scaling = scaling &&
            Object.assign(param.scaling || {}, ...scaling.map(info => applyMapping(value, info)));

        Object.assign(param, {textureOffset: uvOffsetInfo[group]});

        return object;
      }, {});

  return Object.keys(info).reduce((array, key) => array.concat(info[key]), []);
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
