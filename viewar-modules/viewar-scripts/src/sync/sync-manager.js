import { SyncManager } from '../dependencies';

import mixinEmitter from 'component-emitter';
import deepEquals from 'lodash/isEqual';
import deepCopy from 'lodash/cloneDeep';

import { injector, Date, Config, Http, Logger } from '../dependencies';
import { DEFAULT_SYNC_URL } from '../constants';

injector.register(SyncManager, createSyncManager, {config: Config, Date: Date, http: Http, logger: Logger});

export { SyncManager } from '../dependencies';

/**
 * Synchronizes arbitrary state between two or more ViewAR SL instances. Instances can both send and receive arbitrary
 * payloads to/from one another. Payloads must be serializable to JSON. Uses a centralized client-server architecture.
 *
 * @namespace syncManager
 * @extends ProtectedEmitter
 */

/**
 * @private
 * @returns {syncManager}
 */
export function createSyncManager({config, Date, http, logger}) {
  /** @private */
  const syncUrl = config.syncUrl || DEFAULT_SYNC_URL;
  const noop = () => {};

  let syncId = null;
  let syncing = false;
  let properties = {};

  const syncManager = mixinEmitter({
    register,
    unregister,

    startLiveSync,
    stopLiveSync,

    /**
     * Sync id of the active sync. Null if sync is currently not active.
     * @type {string|null}
     * @memberof syncManager#
     */
    get syncId() { return syncId; }
  });

  return syncManager;

  /**
   * Registers a state property for synchronization. The only mandatory thing is that the getter returns a value, either
   * plain or wrapped in a promise. Other than that, getters and setters are free to do any computation and data
   * manipulation required. Sync manager will wait for all getters to return before sending the data, and all setters to
   * return before being called again.
   *
   * To avoid unexpected behavior this method should not be called while sync is running.
   *
   * @param {string} propertyName - name of the property
   * @param {Function?} getter - function that retrieves the local value of the property. Can be either sync or async.
   * @param {Function?} setter - function that updates the local value of the property. Can be either sync or async.
   * @memberof syncManager#
   */
  function register(propertyName, getter = noop, setter = noop) {
    properties[propertyName] = {
      getValue: () => Promise.resolve().then(getter),
      setValue: value => Promise.resolve(value).then(setter),
      timestamp: 0
    };
  }

  /**
   * Unregisters a registered state property.
   * To avoid unexpected behavior this method should not be called while sync is running.
   *
   * @param {string} propertyName - name of the property
   * @memberOf! SyncManager#
   */
  function unregister(propertyName) {
    delete properties[propertyName];
  }

  /**
   * Connects to the server and starts polling for changes using the given sync id. Other ViewAR SL instances that need
   * to communicate with this one must use the same sync session id.
   *
   * Stops the running sync session before initializing the new one.
   *
   * @method
   * @param {string} syncSessionId - name of the property
   * @param {SyncParams?} params - parameters of the sync session
   * @memberOf! SyncManager#
   */
  async function startLiveSync(sessionId, params = {}) {
    const syncParams = { pollInterval: 33, send: true, receive: true, ...deepCopy(params) };

    if (syncing) {
      stopLiveSync();
    }

    syncId = sessionId;
    syncing = true;

    logger.log(`Sync connected to channel "${syncId}".`);
    syncManager.emit('syncStarted', {id : syncId});

    syncParams.initial = true;

    let emitConnectionIssuesEvent = true;
    while (syncing) {
      let success = await Promise.all([sync(syncParams), Promise.delay(syncParams.pollInterval)]);
      if (success) {
        syncParams.initial = false;
        emitConnectionIssuesEvent = true;
      } else {
        logger.log(`Sync connection issues on channel "${syncId}".`);
        syncManager.emit('connectionIssues', {id : syncId});
        emitConnectionIssuesEvent = false;
      }
    }
  }

  /**
   * Stops running state synchronization. This function will prevent sending further data to the server but may not
   * prevent the executions of setters that have begun executing.
   *
   * @memberof syncManager#
   */
  function stopLiveSync() {
    logger.log(`Sync disconnected from channel "${syncId}".`);
    syncManager.emit('syncStopped', {id : syncId});

    syncId = null;
    syncing = false;
  }

  /** @private */
  function getValues() {
    return Promise.all(Object.entries(properties)
        .map(([name, property]) => property.getValue()
            .then(value => [name, value])))
            .then(promises => promises.reduce((object, [name, value]) => Object.assign(object, {[name]: value}), {}));
  }

  /** @private */
  function setValues(values) {
    return Promise.all(Object.entries(values).map(([name, value]) => properties[name].setValue(deepCopy(value))));
  }

  /** @private */
  function sync({send, receive, initial}) {
    return getValues().then(function (newValues) {
      const now = Math.round(Date.now() / 1000);
      const payload = {};

      Object.entries(newValues).forEach(function ([name, newValue]) {
        const property = properties[name];

        const updated = !initial && (property.value === undefined || !deepEquals(newValue, property.value));

        if (updated) {
          property.value = newValue;
          property.timestamp = now;
        }

        payload[name] = {
          data: send && updated ? deepCopy(property.value, roundFloats) : undefined,
          timestamp: property.timestamp
        };
      });

      return syncing && http.post(syncUrl, {
            sync_id: syncId,
            data: JSON.stringify(payload)
          });

    }).then(JSON.parse).then(function (receivedPayload) {
      const values = {};

      if (syncing && receive) {
        Object.entries(receivedPayload).forEach(function ([name, {data: newValue, timestamp}]) {
          let property = properties[name];

          if (property.timestamp < timestamp && newValue !== undefined) {
            property.value = newValue;
            property.timestamp = timestamp;
            values[name] = newValue;
          }

        });
      }

      return setValues(values).then(() => true);
    }).catch(function (error) {
      logger.error(error);
      return false;
    });
  }

  /** @private */
  function roundFloats(_, value) {
    // necessary until the backend floating point precision is fixed
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return Math.round(value * 100000) / 100000;
    } else {
      return value;
    }
  }

}

/**
 * @typedef SyncParams
 * @type {object}
 * @property {number?} pollInterval - polling interval in ms. Sync manager will wait at least this long between pollings
 * @property {boolean?} send - whether this instance should send payloads or not
 * @property {boolean?} receive - whether this instance should receive payloads or not
 */
