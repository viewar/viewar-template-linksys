import compose from 'stampit/compose';
import isEqual from 'lodash/isEqual';
import mergeWith from 'lodash/mergeWith';
import flatMap from 'lodash/flatMap';
import isArray from 'lodash/isArray';
import cloneDeep from 'lodash/cloneDeep';

import createNamespace from '../../utils/namespace';
import { wireFactory, $ } from '../../dependencies';

import { SceneNode } from '../../components/scene-node/scene-node';
import { DEFAULT_POSE, DEFAULT_INTERACTION, DEFAULT_VISIBLE } from '../../constants';

import { dictionarize, toValueObject, createAssignMembers } from '../../utils/utils';
import createValueCombinationIterator from './value-combination-iterator';

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

export const Configuration = compose(SceneNode, {

  initializers: [function (specification) {
    const { model, properties, displayTemplate, containerProxy, parts, coreInterface } = specification;

    this::assignMembers({
      public: {
        model,
        properties: dictionarize(properties, 'name'),
        displayTemplate,
      },
      shared: {
        insert: this::insert,
        remove: this::remove,
      },
      private: {
        coreInterface,
        containerProxy,
        properties,
        partsByKey: dictionarize(parts, 'foreignKey'),
      }
    });
  }],

  methods: {
    setPropertyValues,
    toJSON,
  },

  propertyDescriptors: {
    propertyValues: { get() { return this::getPropertyValues(); }, enumerable: true, },
    animations: { get() { return flatMap(_(this).containerProxy.children.map(child => child.animations)); }, enumerable: true, },
    videos: { get() { return flatMap(_(this).containerProxy.children.map(child => child.videos)); }, enumerable: true, },
  },

});

export const createConfiguration = wireFactory(Configuration, {});

//======================================================================================================================

function getPropertyValues() {
  return toValueObject(_(this).properties.map(({name, value: {key}}) => ({name, value: key})));
}

function setPropertyValues(newPropertyValues) {
  return this::update(this::resolveValues(newPropertyValues));
}

function resolveValues(newPropertyValues) {
  const resolvedValues = {};

  Object.entries(newPropertyValues).forEach(([propertyName, value]) => {
    if (this.properties[propertyName]) {    // KH: Check is necessary if assembly model sets property and not every child has this property.
      const resolvedValue = this.properties[propertyName].resolveValue(value);
      if (resolvedValue) {
        resolvedValues[propertyName] = resolvedValue;
      }
    }
  });

  return resolvedValues;
}

function update(newPropertyValues, forceRebuild = false) {
  const { keyPrefixes, properties } = _(this);

  this::applyPropertyValues(newPropertyValues);

  const insertionParams = compileInsertionParams(properties, this.propertyValues);

  if (forceRebuild || !isEqual(this::getCurrentParts(), insertionParams.parts)) {
    return this::updateInstances(insertionParams);
  } else {
    return this::updateParams(insertionParams);
  }
}

function getCurrentParts() {
  return _(this).containerProxy.children.map(child => child.model.foreignKey);
}

function applyPropertyValues(newPropertyValues) {
  const oldValues = this.propertyValues;

  const modifiedProperties = this::assignValues(newPropertyValues);

  if (_(this).properties.every(property => property.hasValidValue(this))) {
    return modifiedProperties;
  }

  const orderedProperties = [];
  for (const property of _(this).properties.filter(property => property.valueType !== 'fixed')) {
    if (property.hasValidValue(this)) {
      orderedProperties.unshift(property);
    } else {
      orderedProperties.push(property);
    }
  }

  for (const valueCombination of createValueCombinationIterator(orderedProperties, newPropertyValues)) {

    this::assignValues(oldValues); //TODO: is there a better way of calculating modified properties?

    const modifiedProperties = this::assignValues(toValueObject(valueCombination));

    if (_(this).properties.every(property => property.hasValidValue(this))) {
      return modifiedProperties;
    }
  }

  throw new Error('Configuration conflicts could not be resolved!');
}

function assignValues(newValues) {
  const modifiedProperties = Object.entries(newValues).map(([name, value]) => {
    const property = this.properties[name];

    if (value !== property.value) {
      property.value = property.resolveValue(value);
      return property;
    } else {
      return null;
    }
  }).filter(property => !!property);

  return dictionarize(modifiedProperties, 'name');
}

function updateParams(params) {
  return _(this).containerProxy.setPropertyValues(params.propertyValues);
}

async function updateInstances({parts, propertyValues}) {
  const { containerProxy, partsByKey, coreInterface } = _(this);

  const oldInstances = [...containerProxy.children];

  const instancesByModelId = {};
  oldInstances.forEach(instance =>
      (instancesByModelId[instance.model.id] = instancesByModelId[instance.model.id] || []).push(instance));

  const models = parts
      .map(key => partsByKey[key] || console.warn(`Warning! Missing part foreign key: ${key} for model ${this.model.id} (${this.model.name})!`))
      .filter(model => !!model);

  const parent = containerProxy;
  const pose = SceneNode.DEFAULT_POSE;
  const previousInstances = [];
  const usedSnappingPoints = [];

  for (const model of models) {
    const plugPoint = getFirstSnappingPoint({model});
    const {socketInstance, socketPoint} = getMatchingSnappingPoint(plugPoint, usedSnappingPoints, previousInstances);

    if (instancesByModelId[model.id] && instancesByModelId[model.id].length) {
      const instance = instancesByModelId[model.id].pop();
      if (plugPoint && socketPoint) {
        const connectionName = plugPoint.plugs[0].connection;
        await coreInterface.call('snapTo', instance.id, plugPoint.name, socketInstance.id, socketPoint.name, connectionName);
        usedSnappingPoints.push(socketPoint);
      } else {
        await instance.setPose(pose);
      }
      await instance.setPropertyValues(propertyValues);
      previousInstances.push(instance);
    } else {
      if (plugPoint && socketPoint) {
        const connectionName = plugPoint.plugs[0].connection;
        const instance = await $(model).instantiate({propertyValues, parent, pose, visible: false});
        await coreInterface.call('snapTo', instance.id, plugPoint.name, socketInstance.id, socketPoint.name, connectionName);
        usedSnappingPoints.push(socketPoint);
        await instance.setVisible(true);
        previousInstances.push(instance);
      } else {
        previousInstances.push(await $(model).instantiate({propertyValues, parent, pose}));
      }
    }
  }

  await Promise.all(flatMap(Object.values(instancesByModelId)).map(async unusedInstance => {
    $(containerProxy).removeChild(unusedInstance);
    return $(unusedInstance).remove();
  }));
}

function getFirstSnappingPoint(instance) {
  return instance && instance.model.data.snappingpoints && instance.model.data.snappingpoints[0];
}

function getMatchingSnappingPoint(plugPoint, usedSnappingPoints, instances) {
  const connectionName = plugPoint && plugPoint.plugs[0].connection;
  for (const socketInstance of instances) {
    const socketPoint = socketInstance.model.data.snappingpoints &&
        socketInstance.model.data.snappingpoints.find(point =>
            !usedSnappingPoints.includes(point) && point.sockets.find(socket => socket.connection === connectionName));
    if (socketPoint) {
      return {socketInstance, socketPoint};
    }
  }
  return {};
}

function compileInsertionParams(properties, propertyValues) {
  return mergeWith(
      ...properties.map(property => property.getInsertionParams(propertyValues)),
      (objValue, srcValue) => isArray(objValue) && objValue.concat(srcValue) || undefined);
}

async function insert() {
  const { containerProxy } = _(this);
  $(containerProxy).setParent(this.parent);
  await $(containerProxy).insert();
  await this::update({}, true);
  return this;
}

async function remove() {
  const { containerProxy } = _(this);
  return containerProxy.remove();
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
