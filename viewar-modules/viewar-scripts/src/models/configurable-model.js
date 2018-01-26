import defaults from 'lodash/defaults';
import deburr from 'lodash/deburr';
import unique from 'lodash/uniq';
import flatMap from 'lodash/flatMap';

import { createModel } from './model';

import { createAssignMembers, compileMaterialInfo, sanitizeModelDescription, generateId } from '../utils/utils';

export function mixinConfigurableModel(_, $) {
  const assignMembers = createAssignMembers(_, $);

  this::assignMembers({
    public: {
      type: 'configurable',
    },
    private: {
      completeModel: this::completeConfigurableModel,
      instantiateModel: this::instantiateConfigurableModel,
      downloadAssets: this::downloadConfigurableAssets,
    }
  });

  /** @private */
  async function completeConfigurableModel(description) {
    const { coreInterface, modelManager } = _(this);
    const { data, desc, images, configurationDescription, version } = description;
    const { preset, dataSource: { properties, displayTemplate } } = configurationDescription;

    const foreignKeys = [];

    properties.filter(prop => prop.type === 'part' && prop.valueType === 'enumerated').forEach(property => {
      property.values.forEach(value => {
        value.foreignKey && foreignKeys.push(value.foreignKey);
        value.foreignKeys && foreignKeys.push(...value.foreignKeys);
      })
    });

    const models = foreignKeys
        .map(key => modelManager.findModelByForeignKey(key) ||
            console.warn(`Warning! Missing part foreign key: ${key} for model ${this.id} (${this.name})!`))
        .filter(model => !!model);

    const parts = [];
    const resourcePacks = [];

    for (const model of models) {
      if (model !== this) {
        await model.downloadDescription();
        parts.push(model);

        if (model.resources.length) {
          resourcePacks.push(...model.resources.map(resource => resource.id));
        } else {
          // KH: This is for the case that the model has no resource packs and all the materials are in the model itself.
          // Otherwise the material thumbnails are not found.
          resourcePacks.push(model.id);
        }
      } else {
        const basicModel = createModel(description);
        await $(basicModel).provideDescription({...description, configurationDescription: null});
        parts.push(basicModel);

        if (model.resources.length) {
          resourcePacks.push(...model.resources.map(resource => resource.id));
        }
      }
    }

    const matList = await Promise.all(unique(resourcePacks).map(id => {
      return coreInterface.call('prepareModelDescription', id).then(data => {
        return sanitizeModelDescription(data);
      }).then(data => data.materialDescription);
    }));

    const materialDescription = compileMaterialInfo(coreInterface, flatMap(matList));

    return this::assignMembers({
      public: {
        version,
        data,
        images,
        description: desc,
      },
      private: {
        materialDescription,
        displayTemplate,
        preset,
        parts,
        properties,
      }
    });
  }

  /** @private */
  async function instantiateConfigurableModel(insertionParams) {
    const id = generateId();
    const {
      materialDescription, preset, parts, properties, displayTemplate,
      createAnimation, createVideo, createProperty, createConstant, coreInterface,
    } = _(this);

    const specification = {
      ...insertionParams, id,
      materialDescription, preset, parts, properties,
      createProperty, createConstant, createAnimation, createVideo,
    };


    Object.assign(insertionParams, {
      id
    });
    const containerProxy = _(this).createContainer(insertionParams);

    const configuration = _(this).createConfiguration({
      ...specification,
      coreInterface,
      containerProxy,
      displayTemplate,
      properties: this::prepareProperties(specification),
      model: this
    });

    $(specification.parent).addChild(configuration);

    return $(configuration).insert();
  }

  /** @private */
  function downloadConfigurableAssets() {
    return _(this).runDownloadJobs(_(this).parts.map(part => () => part.download()));
  }

}

export function prepareProperties(specification) {
  const { preset, properties: props, materialDescription, propertyValues = {}, createProperty } = specification;

  const properties = props.map(createProperty);

  properties.forEach(property => copyImageUrls(property, materialDescription));

  Object.entries(defaults({}, propertyValues, preset)).forEach(([name, valueKey]) => {
    const property = properties.find(property => property.name === name);
    if (property) {
      property.value = property.resolveValue(valueKey);
      if (!property.value) {
        property.value = [...property.values][0];
      }
    } else {
      console.warn(`Warning! Found preset for unknown property "${name}" of model ${this.id} (${this.name})!`);
    }
  });

  return properties;
}

function copyImageUrls(property, materials) {
  [...property.values].forEach(option => {

    if (!option.null) {
      const key = option.key;
      const oldKey = deburr('' + option.key || '').replace(/:+/g, '_').replace(/[-\s]/g, '');

      for(let alias of property.aliases) {
        if (!option.imageUrl || option.imageUrl === '') {

          const material = materials.find(options => options.id === alias);
          if (material) {

            const materialOption = material.options.find(option => option.id === key || option.id === oldKey);
            if (materialOption) {
              option.imageUrl = materialOption.imageUrl;
            } else {
              //console.warn('Material option "' + key + '" for material property "' + property.name + '" not found. Can\'t set option thumbnail.');
            }

          }
        }
      }
    }
  });
}
