'use strict';

const watch = require('node-watch');
const minimist = require('minimist');
const exec = require('child_process').exec;

const argv = minimist(process.argv.slice(2));

//======================================================================================================================
// CONSTANTS
//======================================================================================================================

const WATCHER_DELAY = 300;

const PATH_SEPARATOR = '/';
const APP_ROOT = '.';

const BUILD_DIR = createPath(APP_ROOT, 'build');
const DEV_DIR = createPath(APP_ROOT, 'bundle', 'dev');
const BUNDLE_FILENAME = 'bundle.zip';

const BUNDLE_PATH = createPath(DEV_DIR, BUNDLE_FILENAME);

//======================================================================================================================
// CONSTANTS
//======================================================================================================================

exec(`mkdir -p ${DEV_DIR}`);

const startWatcher = !!argv.watch;

require('events').EventEmitter.prototype._maxListeners = 100;


let scheduled = false;
if (startWatcher) {
  watch(BUILD_DIR, { recursive: true, followSymLinks: true }, function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(zip, WATCHER_DELAY);
    }
  });
} else {
  scheduled = true;
  zip();
}

//======================================================================================================================
// HELPER FUNCTIONS
//======================================================================================================================

function createPath(...parts) {
  return parts.join(PATH_SEPARATOR);
}

function zip() {
  exec(`cd ${BUILD_DIR}; zip -r -q ../${BUNDLE_PATH} . -x \*.hot-update.js\* \*.hot-update.json\*; cd ..`);
  console.log('Bundle ready.');
  scheduled = false;
}


