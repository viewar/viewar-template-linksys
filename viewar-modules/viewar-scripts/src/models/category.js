import compose from 'stampit/compose';

import { wireFactory } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';

import { Identifiable } from '../components/identifiable/identifiable';
import { CatalogItem } from '../components/catalog-item/catalog-item';
import { Node } from '../components/tree/node';
import { HasData } from '../components/has-data';

import createNamespace from '../utils/namespace';
const _ = createNamespace();

/**
 * Part of the model category tree, contains other categories and models.
 *
 * @interface Category
 * @extends Identifiable
 * @extends CatalogItem
 * @extends Taggable
 * @extends Node
 * @extends HasData
 */
export const Category = compose(Identifiable, CatalogItem, Node, HasData, {
  initializers: [function (specification) {
    const { coreInterface } = specification;

    Object.assign(_(this), {
      coreInterface,
    });
  }],
});


export const createCategory = wireFactory(Category, {
  coreInterface: CoreInterface,
});
