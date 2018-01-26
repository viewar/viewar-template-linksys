import { AppUtils } from '../dependencies';

import { injector } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';

injector.register(AppUtils, createAppUtils, {coreInterface: CoreInterface});

/**
 * @namespace appUtils
 */

export { AppUtils } from '../dependencies';
export function createAppUtils(specification) {
  const { coreInterface } = specification;

  const appUtils = Object.assign({
    closeApp,

    pauseRenderLoop,
    resumeRenderLoop,

    getAuthentication,
    setAuthentication,

    httpPost,
    openUrl,
    prepareCustomImage,
    sendEmail,
    setCollisionMode,
    setTextureQuality,
    getSecureUrl,
    getCachedUrl,
  });

  return appUtils;

//======================================================================================================================
// METHODS
//======================================================================================================================

  /**
   * Sends an HTTP POST request
   * @param {string} url target URL
   * @param {object} args POST arguments (parameters)
   * @returns {Promise}
   * @memberof appUtils#
   */
  function httpPost(url, args) {
    return coreInterface.call('httpPost', url, args).then((jobId) => {
      return new Promise((resolve, reject) => {
        coreInterface.on('httpPostResult', httpPostResultHandler);

        function httpPostResultHandler(incomingId, success, result) {
          if (incomingId === jobId) {
            coreInterface.off('httpPostResult', httpPostResultHandler);
            if (!success) {
              reject(new Error('Error in httpPost: ' + result));
            } else {
              resolve(result);
            }
          }
        }
      })
    });
  }

  /**
   * Gets the RAM info of the device
   * @returns {Promise}
   * @memberof appUtils#
   */
  function getDeviceRamInfo() {
    return coreInterface.call('getDeviceRamInfo');
  }

  /**
   * Sets the global texture quality to be used by the engine.
   * @param {!string} quality
   * @param {boolean} [reloadScene=true] - flag that specifies if the whole scene should be updated to the given quality
   * @returns {Promise}
   * @memberof appUtils#
   */
  function setTextureQuality(quality, reloadScene = true) {
    return Promise.resolve().then(function () {
      if (['low', 'medium', 'high', 'nextlower', 'nexthigher'].includes(quality)) {
        return coreInterface.call('setTextureQuality', quality, !!reloadScene);
      } else {
        throw new Error('Texture quality must be either "high", "medium", "low", "nextlower", or "nexthigher"!');
      }
    });
  }

  /**
   * Sets the mode for the collision system.
   *
   * Valid flags:
   *  0 (COLLISION_DISABLED)
   *  1 (COLLISION_ENABLED)
   *  2 (COLLISION_NOTIFICATION)
   */
  function setCollisionMode(collisionMode) {
    return coreInterface.call('setCollisionMode', collisionMode);
  }

  /**
   * Opens the given URL in the device's browser. The app will go into background.
   *
   * @param {string} url - URL to be opened
   * @memberof appUtils#
   */
  function openUrl(url) {
    coreInterface.emit('openInExternalBrowser', url);
  }

  /**
   * Downloads an image under the given URL.
   *
   * @param {string} fileName - file name to save the image under
   * @param {string} url - image location
   * @returns {Promise.<string>} path to the downloaded image
   * @memberof appUtils#
   */
  function prepareCustomImage(fileName, url) {
    return coreInterface.call('prepareCustomImage', fileName, url, '');
  }

  /**
   * Opens the devices email client/form and fills it with the given data.
   *
   * @param {EmailObject} emailObject - object containing email data
   * @returns {Promise}
   * @memberof appUtils#
   */
  function sendEmail(emailObject) {
    return coreInterface.call('sendEmail', JSON.stringify(emailObject));
  }

  /**
   * Pauses the main render loop of the 3D engine. Freezes the engine output, but not the user interface, which remains
   * functional as usual. Any changes in the state of the app will not be redrawn until the render loop is resumed. This
   * frees up a lot of resources and may improve performance of background tasks such as download and insertion.
   * This method is idempotent.
   *
   * @returns {Promise}
   * @memberof appUtils#
   */
  function pauseRenderLoop() {
    return coreInterface.call('pauseRenderLoop');
  }

  /**
   * Resumes the render loop, allowing changes in the app state to be redrawn. Note that it might cause a delay if new
   * objects had been inserted into scene during the pause.
   * This method is idempotent.
   *
   * @returns {Promise}
   * @memberof appUtils#
   */
  function resumeRenderLoop() {
    return coreInterface.call('resumeRenderLoop');
  }

  /**
   * Takes the given url and adds the https proxy in front of it. If a url uses already the https protocol or if
   * the url is no http url the unchanged url is returned.
   *
   * @param {string} url - the url to secure
   * @returns {string} a secure url
   */
  function getSecureUrl(url) {
    const httpsProxyUrl = 'https://www.viewar.com/proxy2.php?url=';

    if (url.startsWith('http://')) {
      return httpsProxyUrl + url;
    } else {
      return url;
    }
  }

  /**
   * Persistently stores an authentication key. The purpose of this key is arbitrary and fully depends on the app logic.
   * The key persists between app executions and can be retrieved using {@link getAuthentication} function.
   *
   * @param {string} authKey
   * @returns {Promise}
   * @memberof appUtils#
   */
  function setAuthentication(authKey) {
    return coreInterface.call('setAuthKey', authKey);
  }

  /**
   * Retrieves the authentication key stored using {@link setAuthentication} function.
   *
   * @returns {Promise}
   * @memberof appUtils#
   */
  function getAuthentication() {
    return coreInterface.call('getAuthKey');
  }

  /**
   * Sends a shutdown signal to the app. Used for device platforms that do not normally close running apps via task
   * manager. Works on Windows platform only.
   *
   * @returns {Promise}
   * @memberof appUtils#
   */
  function closeApp() {
    coreInterface.emit('closeAR');
    return Promise.resolve();
  }

  function getCachedUrl(url) {
    return ['Emscripten', 'Mock'].includes(coreInterface.platform) ? url : `coui://${encodeURIComponent(url)}`;
  }

}
