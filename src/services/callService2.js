import { Observable } from 'rxjs/Observable';

export const ACTIVE = 0;
export const INCOMING = 1;
export const CONNECTING = 2;

// roles for startStreaming core call
const SENDER = 'sender';
const RECEIVER = 'receiver';

// prefixed messageTypes for socketConnection
const INCOMING_CALL = '@@CALLSERVICE_INCOMING_CALL';
const CALL_ACCEPTED = '@@CALLSERVICE_CALL_ACCEPTED';
const CALL_REFUSED = '@@CALLSERVICE_CALL_REFUSED';
const BUSY = '@@CALLSERVICE_BUSY';
const END_CALL = '@@CALLSERVICE_END_CALL';


export const createCallservice = ({ socketConnection, viewar }) => {

  const currentCall = {};

  // Factory

  const callService = {
    init,

    call: () => console.warn('not initialized yet. use init() method!'),
    answerCall: () => console.warn('not initialized yet. use init() method!'),
    endCall: () => console.warn('not initialized yet. use init() method!'),
    refuseCall: () => console.warn('not initialized yet. use init() method!'),
    sendData: () => console.warn('not initialized yet. use init() method!'),
    getData: () => console.warn('not initialized yet. use init() method!'),

    incomingCall$: null,
    callAccepted$: null,
    callEnded$: null,
    lineBusy$: null,
    callRefused$: null,

    currentCall: null
  };

  return callService;

  function init() {
    const incomingCall$ = new Observable(observer => {

      const incomingCallHandler = ({ id, sessionId, sceneState, calleeRole = RECEIVER }) => {
        if(currentCall.status) {
          socketConnection.send({ room: sessionId, messageType: BUSY, data: {} });
          return;
        }

        Object.assign(currentCall, {
          oppositeId: id,
          sessionId,
          sceneState,
          calleeRole,
          ownRole: calleeRole === RECEIVER ? SENDER : RECEIVER,
          callStatus: INCOMING,
        });

        observer.next(sessionId);
      };

      socketConnection.getData(INCOMING_CALL).subscribe(incomingCallHandler);

    });

    const callAccepted$ = new Observable(observer => {

      const callAcceptedHandler = async (sceneState) => {
        const { sessionId, calleeRole, ownRole } = currentCall;

        if(sceneState) await viewar.sceneManager.setSceneState(sceneState);
        if(calleeRole === RECEIVER) await viewar.cameras.augmentedRealityCamera.activate();
        viewar.coreInterface.call('startStreaming', sessionId, ownRole);

        Object.assign(currentCall, {
          callStatus: ACTIVE,
        });

        observer.next(sessionId);
      };

      socketConnection.getData(CALL_ACCEPTED).subscribe(callAcceptedHandler);
    });


    const callEnded$ = new Observable(observer => {
      socketConnection.getData(END_CALL).subscribe(() => endCallHandler(observer));
    });

    const lineBusy$ = new Observable(observer => {
      socketConnection.getData(BUSY).subscribe(() => {
        clearCurrentCall()
        observer.next();
      });
    });

    const callRefused$ = new Observable(observer => {
      socketConnection.getData(CALL_REFUSED).subscribe(() => {
        clearCurrentCall()
        observer.next();
      });
    });

    Object.assign(callService, {
      incomingCall$,
      callAccepted$,
      callEnded$,
      lineBusy$,
      callRefused$,
      call,
      answerCall,
      endCall,
      refuseCall,
      sendData,
      currentCall,
    });
  }


  /** send a new incoming call request.
   *
   * @param id an socket-id in the room)
   * @param calleeRole the desired role of the other side
   * @param withSceneState if the sceneState should be transmitted
   *        (should be used, when the other side does not use the same app, or if the scene is manipulated after initialisation)
   */
  async function call({id, calleeRole = RECEIVER, withSceneState}) {
    const { callStatus } = currentCall;

    if(callStatus) throw new Error('already an active or connecting call, end or refuse the call to start a new call');
    const sessionId = socketConnection.socket.id; //the id for the stream transmission

    let sceneState;
    if(withSceneState) {
      sceneState = await viewar.sceneManager.getSceneStateSafe();
    }
    socketConnection.send({ room: id, messageType: INCOMING_CALL, data: { id: sessionId, sessionId, sceneState, calleeRole } });

    Object.assign(currentCall, {
      oppositeId: id,
      sessionId,
      sceneState,
      calleeRole,
      ownRole: calleeRole === RECEIVER ? SENDER : RECEIVER,
      callStatus: CONNECTING
    });
  }


  /** answers a call request
   *
   * @param withSceneState if the sceneState should be transmitted
   *         (should be used, when the other side does not use the same app, or if the scene is manipulated after initialisation and if the callee is also the sender of the stream)
   */
  async function answerCall({ withSceneState } = {}) {
    const { sceneState, sessionId, oppositeId, calleeRole, callStatus } = currentCall;

    if(callStatus !== CONNECTING) throw new Error('no incoming call to answer');

    if(sceneState) await viewar.sceneManager.setSceneState(sceneState);

    let ownSceneState;
    if(withSceneState) {
      ownSceneState = await viewar.sceneManager.getSceneStateSafe();
    }

    socketConnection.send({ room: oppositeId, messageType: CALL_ACCEPTED, data: { sceneState: ownSceneState } });

    if(calleeRole === RECEIVER) {
      await viewar.cameras.augmentedRealityCamera.activate();
      viewar.coreInterface.call('switchTracker', 'Remote');
    }
    viewar.coreInterface.call('startStreaming', sessionId, calleeRole);

    Object.assign(currentCall, {
      callStatus: ACTIVE
    });
  }


  /**
   * ends the active call
   */
  async function endCall () {
    const { oppositeId, callStatus } = currentCall;
    if(callStatus !== CONNECTING && callStatus !== ACTIVE ) throw new Error('no pending or active call to end');

    socketConnection.send({ room: oppositeId, messageType: END_CALL, data: {} });
    endCallHandler();
  }

  /**
   * refuses the incoming call
   */
  async function refuseCall() {
    const { oppositeId, callStatus } = currentCall;
    if(callStatus !== CONNECTING) throw new Error('no connecting incoming call to refuse');

    socketConnection.send({ room: oppositeId, messageType: CALL_REFUSED, data: {} });
    clearCurrentCall()
  }

  /**
   * send data via the socketConnection (the other side needs to subscribe to getData(key) in order to receive the data)
   * @param key
   * @param data
   */
  function sendData(key, data) {
    const { callStatus } = currentCall;

    if(callStatus !== ACTIVE) throw new Error('no active call');
    socketConnection.send({ room: oppositeId, messageType: key, data });
  }

  /**
   * subscribe to data sent by the other side (the other side needs to use sendData(key, data))
   * @param key
   * @return {Observable}
   */
  function getData(key) {
    const { callStatus } = currentCall;

    if(callStatus !== ACTIVE) throw new Error('no active call');
    return socketConnection.getData(key)
  }


  /// PRIVATE ///

  function endCallHandler(observer) {
    const { sessionId, calleeRole } = currentCall;

    viewar.coreInterface.call('stopStreaming', sessionId);
    if(calleeRole === RECEIVER) viewar.coreInterface.call('switchTracker', Object.keys(viewar.trackers).find(tracker => tracker !== 'Remote'));

    observer && observer.next();
    clearCurrentCall();
  }

  function clearCurrentCall() {
    Object.assign(currentCall, {
      oppositeId: undefined,
      sessionId: undefined,
      sceneState: undefined,
      calleeRole: undefined,
      ownRole: undefined,
      callStatus: undefined,
    });
  }
};