import { CloudStorage } from '../dependencies';

import { injector, AuthenticationManager, Config, AppConfig, Http } from '../dependencies';

injector.register(CloudStorage, createCloudStorage, {
  authenticationManager: AuthenticationManager,
  appConfig: AppConfig,
  config: Config,
  http: Http,
});

export { CloudStorage } from '../dependencies';

/**
 * @interface CloudStorage
 * @extends Storage
 */


/**
 * @private
 * @returns CloudStorage
 */

export function createCloudStorage(specification) {
  const { authenticationManager, config, appConfig, http } = specification;

  const host = appConfig.host;
  let storageKey = appConfig.storageKey;
  const serverUrl = config.serverUrl || host;
  const createUrl = action => `${serverUrl}/appstorage/${action}/storage:${storageKey}`;

  const password = config.password || '';

  const provider = {
    get storageKey() { return storageKey; },
    set storageKey(key) { storageKey = key; },
    createUrl,
    read,
    write,
    remove,
  };

  return provider;

  function checkPermission(path) {
    const token = authenticationManager.token;

    if (!(path.match(/^\/public\//) || (token && path.match(new RegExp(`^/${token}/`))))) {
      throw new Error('Access violation! Restricted access to unauthorized users!');
    }
  }

  function read(path) {
    return Promise.resolve()
        .then(() => checkPermission(path))
        .then(() => http.post(createUrl('query'), { password, uid: path }))
        .then(result => result ? JSON.parse(result) : null);
  }

  function write(path, content, format) {
    return Promise.resolve()
        .then(() => checkPermission(path))
        .then(() => http.post(createUrl('save'), { password, uid: path, data: content }));
  }

  function remove(path) {
    return Promise.resolve()
        .then(() => checkPermission(path))
        .then(() => http.post(createUrl('delete'), { password, uid: path }));
  }
}

/**
 * @interface Storage
 */

/**
 * Reads file contents from storage. Resolves to null if file doesn't exist.
 * @function
 * @name Storage#read
 * @params {string} path file path
 * @returns {Promise.<string|null>} file contents
 */

/**
 * Writes file contents from storage.
 * @function
 * @name Storage#write
 * @params {string} path file path
 * @params {string} content content to write
 * @params {string} format content format
 * @returns {Promise} resolved on completion
 */

/**
 * Removes file from storage.
 * @function
 * @name Storage#remove
 * @params {string} path file path
 * @returns {Promise} resolved on completion
 */

/**
 * @namespace storage
 */

/**
 * @member {LocalStorage} local
 * @memberof storage#
 */

/**
 * @member {CloudStorage} cloud
 * @memberof storage#
 */
