import createEmitter from 'component-emitter';
import { SYNC_CALLS, ASYNC_CALLS } from '../../constants';
import { emscriptenParse as parse, generateId } from '../../utils/utils';
import { injector, AppConfig } from '../../dependencies';

export function createEmscriptenAdapter(window, coreInterface) {

  const urlCache = {};
  const appConfig = injector.resolve(AppConfig);
  let callInterface = null;

  let resolveMutex = () => {};
  let rejectMutex = () => {};
  let mutexPromise = Promise.resolve();

  return {
    platform: 'Emscripten',

    query,
    initialize,
    sendMessage,
    triggerEvent,
    resolveUrl,
  };

  function query() {
    return new Promise(resolve => resolve(!!(window.Module && window.Module.EmscriptenUIImplementation)));
  }

  function initialize() {
    Object.assign(createEmitter(window.engine = {}), {
      checkClickThrough,
      _trigger,
    });

    return bindingsReady();
  }

  function bindingsReady() {
    addProgressFeedback(window.Module);

    window.Module.EmscriptenUIImplementation.prototype.httpPost = httpPost;
    callInterface = new window.Module.EmscriptenUIImplementation();
    callInterface.registerEvents();

    return Promise.resolve();
  }

  function _trigger(event, ...args) {
    if (event === '_Result') resolveMutex();
    if (event === '_OnError') rejectMutex(new Error());
    coreInterface.emit(event, ...args.map(parse));
  }

  function enqueue(job) {
    return mutexPromise = mutexPromise.then(() => new Promise(job), () => new Promise(job));
  }

  function sendMessage(callName, requestId, ...messageArguments) {
    return enqueue((resolve, reject) => {
      if (callInterface[callName]) {
        resolve(callInterface[callName](...messageArguments));
      } else {
        reject(new Error(`Sync call ${callName} doesn't exist!`));
      }
    }).then(result => _trigger('_Result', requestId, result));
  }

  function triggerEvent(eventName, ...messageArguments) {
    return enqueue((resolve, reject) => {
      try {
        if (ASYNC_CALLS.includes(eventName)) {
          resolveMutex = resolve;
          rejectMutex = reject;
          if (!callInterface[eventName]) throw new Error(`Async call ${eventName} doesn't exist!`);
          callInterface[eventName](...messageArguments);
        } else {
          if (!callInterface[eventName]) throw new Error(`Event ${eventName} doesn't exist!`);
          callInterface[eventName](...messageArguments);
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

//======================================================================================================================
// PRIVATE INTERFACE
//======================================================================================================================

  function checkClickThrough(x, y) {
    return isConsumed({pageX: x, pageY: y}) ? "Y" : "N";
  }

  function isConsumed(touch) {
    let x = touch.pageX, y = touch.pageY;
    let elem = document.elementFromPoint(x, y);
    if (elem && elem != document.body && !elem.classList.contains('coui-noinput')) {
      // check for custom client click-through logic
      if (elem.classList.contains('coui-inputcallback')) {
        return elem.couiInputCallback(x, y);
      }
      return true;
    } else {
      return false;
    }
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
      if (results && results[1] && results[2]) {
        return `${appConfig.host}/resources/DownloadImage/display:1/id:${results[1]}/name:thumb_${results[1]}.${results[2]}`;
      }
    }

    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }

    if (!urlCache[relativeUrl]) {
      const {URL} = window;

      const relativePath = relativeUrl.replace(/^\//, '');
      const blob = getBlob(relativePath);

      urlCache[relativeUrl] = blob ? URL.createObjectURL(blob) : '';
    }

    return urlCache[relativeUrl];
  }


  function getBlob(path) {
    const {FS, Blob} = window;

    const node = FS.findObject(`/ViewarRoot/${path}`);
    if (node) {
      return new Blob([node.contents.buffer]);
    } else {
      return null;
    }
  }

  function httpPost(url, fields) {
    return new Promise((resolve, reject) => {
      const formData = prepareFormData(JSON.parse(fields));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.onload = handleLoad;
      xhr.onerror = handleError;
      xhr.send(formData);

      // Async call, so return generated jobId first, then fake a notification
      // to all listeners once ajax request returns a result.
      const jobId = generateId();
      resolve(jobId);

      function handleLoad() {
        if (xhr.status === 200) {
          coreInterface.emit('httpPostResult', jobId, true, JSON.parse(xhr.response));
        } else {
          coreInterface.emit('httpPostResult', jobId, false, xhr.statusText);
          console.error('httpPost error', xhr.statusText);
        }
      }

      function handleError() {
        for(let callback of coreInterface._callbacks.$httpPostResult) {
          callback(jobId, false, xhr.statusText);
        }
        console.error('httpPost error', xhr.statusText);
      }
    });
  }

  function prepareFormData(fields) {
    const {FormData} = window;

    const formData = new FormData();

    if (typeof fields === 'string') {
      fields.replace(
          new RegExp("([^?=&]+)(=([^&]*))?", "g"),
          function($0, $1, $2, $3) {
            formData.append($1, resolveValue($3))
          }
      );
    } else {
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, resolveValue(value))
      });
    }
    return formData;
  }

  function getFile(rawPath) {
    const {File} = window;

    const filename = rawPath.match(/[^/]+$/)[0] || rawPath;
    const relativePath = rawPath.replace(/^@/, '');

    return new File([getBlob(relativePath)], filename);
  }

  function resolveValue(value) {
    if (isCurlFilePath(value)) {
      return getFile(value);
    } else {
      return value;
    }
  }

  function isCurlFilePath(value) {
    return typeof value === 'string' && value[0] === '@';
  }

  function addProgressFeedback(module) {
    module.readAsync = function readAsync(url, onLoad, onError) {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";

      xhr.onprogress = function (event) {
        if (event.lengthComputable) {
          const percentComplete = event.loaded / event.total * 100;
          coreInterface.emit('transferProgress', '', '', '', percentComplete);
        } else {
          console.log('TransferProgress not computable!');
        }
      };

      xhr.onload = function () {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          coreInterface.emit('transferProgress', '', '', '', 100);
          onLoad(xhr.response);
        } else {
          onError();
        }
      };

      xhr.onerror = onError;

      xhr.send(null);
    };
  }

}
