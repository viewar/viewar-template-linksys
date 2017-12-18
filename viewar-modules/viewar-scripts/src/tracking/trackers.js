import createGoogleTangoProvider from './google-tango-provider';
import createKudanProvider from './kudan-provider.js';
import createWikitudeProvider from './wikitude-provider.js';
import createRealSenseProvider from './realsense-provider.js';
import createStructureProvider from './structure-provider.js';
import createVisionLibProvider from './vision-lib-provider.js';
import createVuforiaProvider from './vuforia-provider.js';
import createMockProvider from './mock-provider.js';
import createARKitProvider from './arkit-provider';


import { injector } from '../dependencies';
import { CoreInterface } from '../interface/core-interface';
import { Logger } from '../utils/logger';

const trackingProviderFactories = {
  'GoogleTango': createGoogleTangoProvider,
  'Kudan': createKudanProvider,
  'RealSense': createRealSenseProvider,
  'Structure': createStructureProvider,
  'VisionLib': createVisionLibProvider,
  'Vuforia': createVuforiaProvider,
  'Mock': createMockProvider,
  'ARKit': createARKitProvider,
  'Wikitude': createWikitudeProvider,
};

export const createTrackers = injector.wireFactory(createTrackingProviders, {coreInterface: CoreInterface, logger: Logger});

export function createTrackingProviders({coreInterface, logger, trackerList}) {

  const trackers = {};

  trackerList.forEach(provider => {
    if (trackingProviderFactories[provider.name]) {

      trackers[provider.name] = coreInterface.platform === 'Emscripten' ?
          createMockProvider() :
          trackingProviderFactories[provider.name]({...provider, coreInterface});

    } else {
      logger.warn(`Unknown tracking provider "${provider.name}"`);
    }
  });

  return trackers;
}

/**
 * @namespace tracking
 */

/**
 * @member {VuforiaTracker} Vuforia
 * @memberof tracking#
 */
