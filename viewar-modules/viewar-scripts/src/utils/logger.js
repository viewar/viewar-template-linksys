import { Logger } from '../dependencies';
import { injector, Config, Http, Window, AppConfig } from '../dependencies';

injector.register(Logger, createLogger, {window: Window, http: Http, config: Config, appConfig: AppConfig});

const logFn = text => {
  window.document.body.appendChild(document.createTextNode(text));
  window.document.body.appendChild(document.createElement('br'));
};

const domOutput = {
  log: logFn,
  error: logFn,
  warn: logFn,
  info: logFn,
};

export { Logger } from '../dependencies';
export function createLogger({window, http, config, appConfig}) {

  const serverOutput = {
    info: () => {},
    warn: () => {},
    log: () => {},
    error(error) {
      return http.post(`${appConfig.host}/api30/log/`, {
        type: 'Exception',
        app: config.appId,
        data: JSON.stringify(error, ['message', 'stack']),
      });
    },
  };

  const outputs = [
    window.console,
    //serverOutput,
    //domOutput,
  ];

  if (Promise.onPossiblyUnhandledRejection) {
    Promise.onPossiblyUnhandledRejection(error);
  }

  window.onerror = (_, __, ___, ____, errorObject) => error(errorObject);

  return {
    error,
    log,
    warn,
    info,
    debug: config.debug && log || (() => {}),

    register,

    time,
    timeEnd,
  };

//======================================================================================================================

  function register(output) {
    outputs.push(output);
  }

  function log(...args) {
    outputs.forEach(output => output.log(...args));
  }

  function warn(...args) {
    outputs.forEach(output => output.warn(...args));
  }

  function error(...args) {
    outputs.forEach(output => output.error(...args));
  }

  function info(...args) {
    outputs.forEach(output => output.info(...args));
  }

  function time(label) {
    outputs.forEach(output => output.time && output.time(label));
  }

  function timeEnd(label) {
    outputs.forEach(output => output.timeEnd && output.timeEnd(label));
  }

}
