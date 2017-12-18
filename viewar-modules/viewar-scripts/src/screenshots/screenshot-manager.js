import { injector } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';

/**
 * @namespace screenshotManager
 */


export const createScreenshotManager = injector.wireFactory(function ({coreInterface}) {
  return {
    takeScreenshot,
    saveScreenshot,
    deleteScreenshot,
    emailScreenshot,
    shareScreenshot,
    saveScreenshotToGallery,
  };

//======================================================================================================================
// PUBLIC INTERFACE
//======================================================================================================================

  /**
   * Takes a screenshot. The screenshot isn't immediately saved.
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function takeScreenshot() {
    const promise = new Promise(resolve => coreInterface.once('screenshotTaken', resolve));
    coreInterface.emit('takeScreenshot');
    return promise;
  }

  /**
   * Saves a taken screenshot to a sub-folder on the hard drive. Returns a path to the file.
   * @param {string} subFolder target sub-folder
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function saveScreenshot(subFolder) {
    return coreInterface.call('saveScreenshotToSubfolder', subFolder);
  }

  /**
   * Opens the native email client with taken screenshot in the attachment.
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function emailScreenshot() {
    coreInterface.emit('sendScreenshot');
    return Promise.resolve();
  }

  /**
   * Saves taken screenshot to device's native gallery.
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function saveScreenshotToGallery() {
    coreInterface.emit('saveScreenshotToGallery');
    return Promise.resolve();
  }

  /**
   * Shares saved screenshot on chosen social media service.
   * @param {string} socialMediaService name of the social media service
   * @param {string} screenshotPath
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function shareScreenshot(socialMediaService, screenshotPath) {
    return coreInterface.call('shareScreenshot', socialMediaService, screenshotPath);
  }

  /**
   * Deletes stored screenshot from sub-folder
   * @param {string} screenshotPath name of the social media service
   * @param {string} subFolder folder containing screenshot
   * @returns {Promise} Resolved when done.
   * @memberof screenshotManager#
   */
  function deleteScreenshot(screenshotPath, subFolder) {
    coreInterface.emit('deleteScreenshotInSubfolder', screenshotPath, subFolder);
    return Promise.resolve();
  }

}, {coreInterface: CoreInterface});
