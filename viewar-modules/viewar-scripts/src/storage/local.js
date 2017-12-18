import { LocalStorage } from '../dependencies';

import { injector } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';

injector.register(LocalStorage, createLocalStorage, {coreInterface: CoreInterface});

export { LocalStorage } from '../dependencies';


/**
 * @interface LocalStorage
 * @extends Storage
 */


/**
 * @private
 * @returns LocalStorage
 */
export function createLocalStorage(specification) {
  const { coreInterface } = specification;

  const provider = {
    read,
    write,
    remove
  };

  return provider;


  function read(name) {
    return coreInterface.call('readCustomFile', name.replace(/\//g, '_'));
  }

  function write(name, content, format = '') {
    return coreInterface.call('saveCustomFile', name.replace(/\//g, '_'), content, format);
  }

  function remove(name) {
    coreInterface.emit('deleteCustomFile', name.replace(/\//g, '_'));
    return Promise.resolve();
  }

}
