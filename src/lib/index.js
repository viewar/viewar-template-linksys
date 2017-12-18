import viewarApi from '../../viewar-modules/viewar-scripts/dist/viewar-api';
import initLocalEmscripten from './emscriptenLoader';

export async function initViewar({appId, mock = process.env.NODE_ENV === 'mock'}) {
  return new Promise((resolve, reject) => {
    if(mock || process.env.NODE_ENV === 'production') {
      return init(appId, resolve);
    }else{
      return initLocalEmscripten(appId, resolve);
    }

  });
}

function init(appId, next) {

  if (window.emscriptenPending || !(window.viewar && window.viewar.emscriptenLoaded) && window.Module && window.Module.__GLOBAL__sub_I_ViewAREmscriptenUIImplementation_cpp) {
    setBundleId(window, appId);

    function setBundleId(window, id) {
      window.bundleIdentifier = id;
      window.bundleidentifier = id;
    }

    window.viewar = {
      initializeApp() {
        return bootstrap(window, next);
      },
    };
  } else {
    bootstrap(window, next);
  }

  async function bootstrap(window, next) {

    const api = await viewarApi.init({
      appId,
      appName: 'testApp',
    }, window);

    next(api);

  }
}