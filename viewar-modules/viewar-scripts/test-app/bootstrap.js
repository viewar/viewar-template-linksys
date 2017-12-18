(function bootstrap({ mock = false, appId, version, canvas }){

  return new Promise((resolve, reject) => {

    window.bundleIdentifier = appId;
    window.bundleidentifier = appId;

    if (!canvas) {
      canvas = document.createElement('canvas');

      canvas.oncontextmenu = () => event.preventDefault();

      document.body.appendChild(canvas);

      canvas.style.width = '100%';
      canvas.style.height = '100%';


    } else {
      canvas.oncontextmenu = () => event.preventDefault();
    }

    const module = {
      totalDependencies: 0,
      preRun: [],
      postRun: [],
      locateFile: function (filename) {
        return './core/' + filename;
      },
      print: console.log.bind(console),
      printErr: console.error.bind(console),
      canvas: (function () {

        window.addEventListener('oncontextmenu', preventDefault);
        window.addEventListener('resize', resizeCanvas);

        resizeCanvas();

        return canvas;

        function resizeCanvas() {
          const rect = canvas.getBoundingClientRect();
          Object.assign(canvas, { width: rect.width, height: rect.height });
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
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve.bind(this);
        script.onerror = reject.bind(this);
        document.body.appendChild(script);
      });
    }

    window.viewar = {
      initializeApp: () => initializeApp({ appId, version }, canvas, api => resolve(api)),
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
  });
})({appId: 'com.viewar.impleniadev'});

async function initializeApp({appId, version, debug}, canvas, next) {

  const api = await viewarApi.default.init({ appId, debug });

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
