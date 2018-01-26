import compose from 'stampit/compose';
import { satisfies } from 'semver';

import createNamespace from '../../utils/namespace';

import { Identifiable } from '../identifiable/identifiable';
import { Taggable } from '../taggable/taggable';

const _ = createNamespace();

/**
 * @interface CatalogItem
 * @extends Identifiable
 * @extends Taggable
 */
export const CatalogItem = compose(Identifiable, Taggable, {

  initializers: [function (specification) {
    const {name, coreInterface, appConfig} = specification;
    Object.assign(_(this), {
      coreInterface,
      appConfig,
      imageUrl: coreInterface.resolveUrl('/Models/Images/' + this.id + '.png'),
    });

    Object.defineProperties(this, {
      name: {
        value: name,
        enumerable: true,
        configurable: false,
      },
      imageUrl: {
        get: () => _(this).imageUrl,
        enumerable: true,
        configurable: false,
      },
    });
  }],

  methods: {
    downloadImage
  },

  properties: {
    /**
     * Product or model name
     * @member {string} name
     * @memberOf CatalogItem#
     */
    name: '',
    /**
     * string containing thumbnail URL
     * @member {string} imageUrl
     * @memberOf CatalogItem#
     */
    imageUrl: '',
  },

});

/**
 * Downloads the catalog image of this item.
 * @method
 * @memberof CatalogItem#
 * @returns {Promise} resolved when completed.
 */
async function downloadImage(fullsize = false) {
  const { coreInterface, appConfig } = _(this);
  if (this.children) {
    try {
      if (coreInterface.platform !== 'UWP' ) {
        await coreInterface.call('prepareCategoryImage', this.id, '');
      }
    } catch(e) {
      //console.error(e);
    }
    return _(this).imageUrl = coreInterface.resolveUrl('/CategoryImages/' + this.id + '.png');
  } else {
    try {
      if (coreInterface.platform !== 'UWP') {
        if (satisfies(appConfig.version.core, '^5.1.0') && fullsize) {
          await coreInterface.call('prepareModelImageLarge', this.id, '');
        } else {
          await coreInterface.call('prepareModelImage', this.id, '');
        }
      }
    } catch(e) {
      //console.error(e);
    }
    return _(this).imageUrl = coreInterface.resolveUrl('/Models/Images/' + this.id + '.png');
  }
}
