import createMockCalls from './mock-calls.js';
import { injector, AppConfig } from '../../dependencies';

export function createMockAdapter(window, coreInterface) {
  let mockCalls = null;

  const appConfig = injector.resolve(AppConfig);

  return {
    platform: 'Mock',

    query,
    initialize,
    sendMessage,
    triggerEvent,
    resolveUrl,
  };

  function query() {
    return Promise.resolve(!window.engine);
  }

  function initialize() {
    window.engine = {
      _trigger: ::coreInterface.emit,
    };

    mockCalls = createMockCalls({window, coreInterface});
    return Promise.resolve();
  }

  function sendMessage(callName, requestId, ...args) {
    const mockCallHandler = coreInterface.mock[callName];

    if (mockCallHandler) {
      setTimeout(() => mockCallHandler(...args).then(result => coreInterface.emit('_Result', requestId, result)), 0);
    } else {
      setTimeout(() => coreInterface.emit('_Result', requestId, mockCallHandler), 0);
    }
  }

  function triggerEvent(eventName, ...args) {
    setTimeout(() => coreInterface.emit('mock:' + eventName, ...args), 0);
  }

  function resolveUrl(relativeUrl) {
    if (relativeUrl.includes('/Models/Images/')) {
      const results = /\/(\w+)\.\w+$/.exec(relativeUrl);
      if (results && results[1]) {
        return `${appConfig.host}/model/downloadImage/display:1/size:large/id:${results[1]}`;
      }
    } else if (relativeUrl.includes('/CategoryImages/')) {
      const results = /\/(\w+)\.\w+$/.exec(relativeUrl);
      if (results && results[1]) {
        return `${appConfig.host}/category/display:1/downloadImage/size:large/id:${results[1]}`;
      }
    } else if (relativeUrl.includes('/ResourceThumbnails/') || relativeUrl.includes('/Models/Resources/')) {
      const results = /\/(?:\w+)\/thumb_(\w+)\.(jpe?g)$/.exec(relativeUrl);
      if (results && results[1]) {
        return `${appConfig.host}/resources/DownloadImage/display:1/id:${results[1]}/name:thumb_${results[1]}.${results[2]}`;
      }
    }
    return '';
  }

}
