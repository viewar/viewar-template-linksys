import { injector, Http } from '../dependencies';
export { Http } from '../dependencies';

import { HTTPS_PROXY_URL } from '../constants';

//======================================================================================================================

function getSecureUrl(url) {
  if (url.startsWith('http://')) {
    return HTTPS_PROXY_URL + url;
  } else {
    return url;
  }
}

const http = function () {

};


Object.assign(http, {
  get(url, ...args) {
    return send('GET', getSecureUrl(url), ...args);
  },
  post(url, ...args) {
    return send('POST', getSecureUrl(url), ...args);
  },
});

injector.register(Http, () => http);

function send(method, url, data, timeout = 10000) {

  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();

    xhr.open(method.toUpperCase(), url, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(xhr.responseText));
        }
      }
    };

    xhr.timeout = timeout;
    xhr.ontimeout = function (e) {
      reject(new Error('XML HTTP request timed out.'));
    };

    xhr.send(Object.entries(data || {}).map(pair => pair.map(encodeURIComponent).join('=')).join('&'));
  });
}
