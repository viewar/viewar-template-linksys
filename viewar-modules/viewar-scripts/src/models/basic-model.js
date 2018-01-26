import deepCopy from 'lodash/cloneDeep';
import defaults from 'lodash/defaults';
import defaultsDeep from 'lodash/defaultsDeep';
import deburr from 'lodash/deburr';

import { createAssignMembers, compileMaterialInfo, generateId } from '../utils/utils';

export function mixinBasicModel(_, $) {
  const assignMembers = createAssignMembers(_, $);

  this::assignMembers({
    public: {
      type: 'basic',
    },
    private: {
      completeModel: this::completeBasicModel,
      instantiateModel: this::instantiateBasicModel,
      downloadAssets: this::downloadBasicAssets,
    }
  });

  /** @private */
  function downloadBasicAssets() {
    const { runDownloadJobs, coreInterface } = _(this);
    const transferId = generateId();

    return runDownloadJobs([
      () => coreInterface.call('prepareAllModelAssets', this.id, '', transferId),
    ]);
  }

  /** @private */
  async function completeBasicModel(description) {
    const { type, data, desc, materialList = [], materialDescription, parameterDescription, resources, defaultInteraction, animations, videos, version } = description;

    this::assignMembers({
      public: {
        type,
        data,
        description: desc,
        version,
      },
      private: {
        resources,
        animations,
        videos,
        materialDescription: compileMaterialInfo(_(this).coreInterface, materialDescription),
        parameterDescription,
        defaultInteraction: Object.assign(defaultInteraction, deepCopy(description.defaultInteraction)),
        materialList,
      }
    });

    return this;
  }

  /** @private */
  async function instantiateBasicModel(instantiationParams, params) {
    const instance = _(this).createModelInstance(this::prepareSpecification(instantiationParams));

    $(instantiationParams.parent).addChild(instance);

    return $(instance).insert(instantiationParams.pose, params);
  }

  function prepareSpecification(instantiationParams) {
    const { materialDescription, parameterDescription, animations, videos, defaultInteraction, materialList } = _(this);
    const { createAnimation, createVideo, createProperty } = _(this);

    const defaultPropertyValues = this::getDefaultPropertyValues(materialDescription, parameterDescription);

    const params = defaultsDeep(instantiationParams, {
      id: generateId(),
      interaction: defaultInteraction,
      propertyValues: defaults(instantiationParams.propertyValues, instantiationParams.materials,
          instantiationParams.parameters, defaultPropertyValues),
    });

    const playableObjects = preparePlayableObjects({instanceId: params.id, animations, videos, createAnimation, createVideo});

    const properties = compileProperties(materialDescription, parameterDescription, params.propertyValues, createProperty);

    const displayTemplate = compileDisplayTemplate(properties);

    return {model: this, ...playableObjects, ...params, properties, displayTemplate, parameterDescription, materialList};
  }

  function getDefaultPropertyValues(materialDescription, parameterDescription) {
    const propertyValues = {};

    materialDescription
        .filter(material => material.id)
        .forEach(material => propertyValues[material.id] = material.options[0].id);

    parameterDescription
        .filter(parameter => parameter.name)
        .forEach(parameter => propertyValues[parameter.name] = parameter.value.default);

    return propertyValues;
  }

  function compileProperties(materialDescription, parameterDescription, propertyValues, createProperty) {
    const materialProperties = materialDescription.map(({id: name, options}) =>
        createProperty({name, options: options.map(({id: name, imageUrl}) => ({name, imageUrl, key: name, isValid: () => true})),
          type: 'material', optionType: 'enumerated'}));

    const geometricProperties = parameterDescription.map(({name, value}) =>
        createProperty({name, options: value, type: 'geometric', optionType: 'range'}));

    const properties = [...materialProperties, ...geometricProperties];
    properties.forEach(property => {
      if (property.type === 'material') {
        const realValue = property.resolveValue(propertyValues[property.name]);
        const mangledValue = property.resolveValue(deburr(propertyValues[property.name]).replace(/::/, '_').replace(/[^\w_]+/g, ''));
        property.value = realValue || mangledValue;
      } else {
        property.value = propertyValues[property.name];
      }
    });

    return properties;
  }

  function compileDisplayTemplate(properties) {
    return properties.map(property => ({
      name: property.name,
      properties: [{
        name: property.name,
        widget: getWidgetType(property),
      }]
    }));
  }

  function getWidgetType({type, valueType}) {
    if (type === 'material') {
      return 'thumbnailList'
    } else if (type === 'geometric') {
      if (valueType === 'range') return 'slider';
    }
    return 'list';
  }

  function preparePlayableObjects({instanceId, animations, videos, createAnimation, createVideo}) {
    return {
      animations: Object.entries(animations).map(([name, {duration}]) => createAnimation({name, instanceId, duration})),
      videos: Object.entries(videos).map(([name]) => createVideo({name, instanceId, duration: 0})),
    };
  }

}
