import viewarApi from '../../viewar-modules/viewar-scripts/dist/viewar-api';

export default function initLocalEmscripten(appId, next){

    window.bundleIdentifier = appId;
    window.bundleidentifier = appId;


    const canvas = document.createElement('canvas');

    canvas.className += 'emscripten';
    canvas.setAttribute('id', 'canvas');

    document.body.appendChild(canvas);

    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const module = {
      totalDependencies: 0,
      preRun: [],
      postRun: [],
      locateFile: function (filename) {
        return './src/lib/core/' + filename; //TODO figure out direct location (copy files)
      },
      print: console.log.bind(console),
      printErr: console.error.bind(console),
      canvas: (function () {

        window.addEventListener('oncontextmenu', preventDefault);
        window.addEventListener('resize', resizeCanvas);

        //fixes the initial streching
        Object.assign(canvas, { width: window.innerWidth, height: window.innerHeight });

        return canvas;

        function resizeCanvas() {
          const rect = canvas.getBoundingClientRect();
          Object.assign(canvas, { width: window.innerWidth, height: window.innerHeight });
        }

        function preventDefault(event) {
          event.preventDefault();
        }
      })(),
      monitorRunDependencies: function () {},
      setStatus: console.log.bind(console),
    };

    function injectScript(url) {
      return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = url;
        script.onload = resolve.bind(this);
        script.onerror = reject.bind(this);
        document.body.appendChild(script);
      });
    }

    window.viewar = {
      initializeApp: () => initializeApp({ appId }, canvas, next),
    };

    Promise.resolve()
      .then(function () {
        window.Module = module;
      })
      .then(function () {
        return injectScript(module.locateFile('ViewAR.asm.js'));
      })
      .then(function () {
        return injectScript(module.locateFile('ViewAR.js'));
      })
      .catch(console.error.bind(console));
}


async function initializeApp({appId}, canvas, next) {

  const api = await viewarApi.init({ appId });

  if (canvas && api.appConfig.deviceType === 'tablet') {
    canvas.style.display = 'hidden';
  }

  if (!(window.viewar && window.viewar.emscriptenLoaded) && window.Module && window.Module.__GLOBAL__sub_I_ViewAREmscriptenUIImplementation_cpp) {
    setBundleId(window, appId);

    function setBundleId(window, id) {
      window.bundleIdentifier = id;
      window.bundleidentifier = id;
    }

    window.viewar = {
      initializeApp() {
        return api;
      },
    };
  }
  return next ? next(api) : api;
}