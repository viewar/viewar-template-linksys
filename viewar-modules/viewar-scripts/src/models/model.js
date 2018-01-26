import compose from 'stampit/compose';

import createNamespace from '../utils/namespace';

import { wireFactory, $, AppConfig } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { ModelManager } from '../models/model-manager';

import { createAssignMembers, sanitizeModelDescription } from '../utils/utils';

import { createContainer } from '../scene/container';
import { createModelInstance } from '../scene/model-instance';
import { createAssembly } from '../scene/assembly';
import { createConfiguration } from '../scene/configuration/configuration';
import { createProperty } from '../scene/configuration/property/property.factory';
import { createAnimation } from '../scene/playable/animation.js';
import { createVideo } from '../scene/playable/video.js';

import { Identifiable } from '../components/identifiable/identifiable';
import { CatalogItem } from '../components/catalog-item/catalog-item';
import { Instantiable } from '../components/instantiable/instantiable';
import { Leaf } from '../components/tree/leaf';
import { ProtectedEmitter } from '../components/emitter';
import { Constant as createConstant } from '../scene/configuration/property/constant';

import { mixinBasicModel } from './basic-model';
import { mixinReferenceModel } from './reference-model';
import { mixinConfigurableModel } from './configurable-model';
import { mixinAssemblyModel } from './assembly-model';

//======================================================================================================================
// FACTORY
//======================================================================================================================

const _ = createNamespace();
const assignMembers = createAssignMembers(_, $);

/**
 * @interface Model
 * @extends Resource
 * @extends Instantiable
 * @extends Taggable
 * @extends CatalogItem
 * @extends Leaf
 */
export const Model = compose(Identifiable, CatalogItem, Leaf, Instantiable, ProtectedEmitter, {

  initializers: [function (specification) {
    const { type = '', foreignKey = '', resources = [], version = 0 } = specification;
    const { coreInterface, modelManager, createModelInstance, createContainer, createConfiguration, walkCamera,
            createVideo, createAnimation, createProperty, createAssembly, createConstant } = specification;

    this::assignMembers({
      public: {
        /**
         * Type of the model. Can be 'basic', 'environment', 'configurable'.
         * @member {string}
         * @memberOf Model#
         */
        type,
        /**
         * Foreign key in the model tree.
         * @member {string}
         * @memberOf Model#
         */
        foreignKey,
        /**
         * IDs of resource packs this model depends on.
         * @member {string[]}
         * @memberOf Model#
         */
        resources,
        /**
         * Version of the locally stored resource. Should be a UNIX timestamp.
         * @member {number}
         * @memberof Model#
         */
        version,
      },
      shared: {
        provideDescription: this::provideDescription,
        instantiate: this::instantiate,
      },
      private: {
        coreInterface, modelManager, walkCamera, createAssembly, createConstant,
        createModelInstance, createContainer, createConfiguration, createProperty, createVideo, createAnimation,
        runDownloadJobs: this::runDownloadJobs,
        downloadJob: null,
        downloadStopped: false,
        complete: false,
        downloaded: false,
      },
    });
  }],

  methods: {
    downloadDescription,
    download,
    stopDownload,
  },

});

export const createModel = wireFactory((specification) => Model({
  ...specification,
  createContainer,
  createModelInstance,
  createConfiguration,
  createAssembly,
  createAnimation,
  createVideo,
  createProperty,
  createConstant,
  walkCamera: { active: false },
}), {
  coreInterface: CoreInterface,
  modelManager: ModelManager,
  appConfig: AppConfig
});

//======================================================================================================================
// INSTANTIATION
//======================================================================================================================

async function instantiate(instanceProps, insertionParams) {
  await this.downloadDescription();
  return _(this).instantiateModel(sanitizeParams(instanceProps), insertionParams);
}

function sanitizeParams({id, parent, pose, visible, interaction, materials, parameters, highlight, propertyValues}) {
  return {id, parent, pose, visible, interaction, materials, parameters, highlight, propertyValues};
}

//======================================================================================================================
// ASSET MANAGEMENT
//======================================================================================================================

async function downloadDescription() {
  if (!_(this).complete) {
    const description = sanitizeModelDescription(await _(this).coreInterface.call('prepareModelDescription', this.id));
    await $(this).provideDescription(description);
  }
  return this;
}

async function provideDescription(description) {
  if (description.configurationDescription) {
    this::mixinConfigurableModel(_, $);
  } else if (description.references) {
    this::mixinReferenceModel(_, $);
  } else if (this.type === 'assembly') {
    this::mixinAssemblyModel(_, $);
  } else {
    this::mixinBasicModel(_, $);
  }

  await _(this).completeModel(description);
  _(this).complete = true;
}

async function stopDownload() {
  _(this).downloadStopped = true;

  if (_(this).downloadJob) {
    _(this).downloadJob.cancel();
    _(this).downloadJob = null;
  }
}

async function download() {
  if (!_(this).downloaded) {
    try {
      await this.downloadImage();
      await this.downloadDescription();
      await _(this).downloadAssets();
      _(this).downloaded = true;
    } catch (error) {
      if (error instanceof Promise.CancellationError) {
        $(this).emit('downloadStopped');
      } else {
        throw error;
      }
    } finally {
      _(this).downloadStopped = false;
      _(this).downloadJob = null;
    }
  }
}

/** @private */
async function runDownloadJobs(jobs) {
  const { coreInterface } = _(this);
  const total = jobs.length;
  let current = 0;

  const handler = (_, __, ___, progress) => {
    $(this).emit('downloadProgress', ((current / total) * 100) + progress);
  };

  coreInterface.on('transferProgress', handler);

  for (const job of jobs) {
    await this::startJob(job);
    current++;
  }

  coreInterface.off('transferProgress', handler);
}

/** @private */
async function startJob(thunk) {
  if (_(this).downloadStopped) {
    throw new Promise.CancellationError('downloadAllAborted');
  } else {
    await (_(this).downloadJob = thunk());
  }
}
