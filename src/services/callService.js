import { Observable } from 'rxjs/Observable';

export const ACTIVE = 0;
export const INCOMING = 1;
export const CONNECTING = 2;

export default function CallService(socketConnection, viewarApi) {

  return {
    viewarApi,
    socketConnection,
    init,
    call,
    answerCall,
    endCall,
    refuseCall,
    endCallHandler,
    sendData,
  }

  function init() {

    this.incomingCall$ = new Observable(observer => {
      this.socketConnection.getData('incomingCall').subscribe(async ({ sessionId, sceneState, calleeRole = 'receiver' }) => {

        if(this.callStatus) {
          socketConnection.send({ room: sessionId, messageType: 'busy', data: {} });
          return;
        }

        this.currentCall = {
          oppositeId: sessionId,
          sessionId,
          sceneState,
          calleeRole,
          caller: false,
        };

        this.callStatus = INCOMING;
        observer.next(sessionId);
      });
    });

    this.callAccepted$ = new Observable(observer => {
      this.socketConnection.getData('callAccepted').subscribe(async (sceneState) => {

        const { viewarApi } = this;

        if(sceneState) await viewarApi.sceneManager.setSceneState(sceneState);

        const {sessionId, calleeRole} = this.currentCall;

        const role = calleeRole === 'receiver' ? 'sender' : 'receiver';

        if(calleeRole === 'receiver') await viewarApi.cameras.augmentedRealityCamera.activate();

        viewarApi.coreInterface.call('startStreaming', sessionId, role);
        this.callStatus = ACTIVE;
        observer.next();
      });
    });

    this.callEnded$ = new Observable(observer => {
      this.socketConnection.getData('endCall').subscribe(async () => {
        this.endCallHandler(observer);
      });
    });

    this.lineBusy$ = new Observable(observer => {
      this.socketConnection.getData('busy').subscribe(async () => {
        this.callStatus = null;
        this.currentCall = null;
        observer.next();
      });
    });

    this.callRefused$ = new Observable(observer => {
      this.socketConnection.getData('callRefused').subscribe(async () => {
        this.callStatus = null;
        this.currentCall = null;
        observer.next();
      });
    });
  }

  /** send a new incoming call request.
   *
   * @param id an socket-id in the room)
   * @param calleeRole the desired role of the other side
   * @param withSceneState if the sceneState should be transmitted
   *        (should be used, when the other side does not use the same app, or if the scene is manipulated after initialisation)
   * @return {Promise.<void>}
   */
  async function call({id, calleeRole = 'receiver', withSceneState}) {
    const { viewarApi, socketConnection } = this;

    const sessionId = socketConnection.socket.id; //the id for the stream transmission

    let sceneState;
    if(withSceneState) {
       sceneState = await viewarApi.sceneManager.getSceneStateSafe();
    }
    socketConnection.send({ room: id, messageType: 'incomingCall', data: { sessionId, sceneState, calleeRole } });

    this.currentCall = {
      oppositeId: id,
      sessionId,
      sceneState,
      calleeRole,
      caller: true,
    };

    this.callStatus = CONNECTING;
  }

  /** answers a call request
   *
   * @param withSceneState if the sceneState should be transmitted
   *         (should be used, when the other side does not use the same app, or if the scene is manipulated after initialisation and if the callee is also the sender of the stream)
   * @return {Promise.<void>}
   */
  async function answerCall({ withSceneState } = {}) {
    const { viewarApi, socketConnection } = this;

    const { sceneState, sessionId, oppositeId, calleeRole } = this.currentCall;
    if(sceneState) await viewarApi.sceneManager.setSceneState(sceneState);

    let ownSceneState;
    if(withSceneState) {
      ownSceneState = await viewarApi.sceneManager.getSceneStateSafe();
    }

    socketConnection.send({ room: oppositeId, messageType: 'callAccepted', data: { sceneState: ownSceneState } });

    if(calleeRole === 'receiver') {
      await viewarApi.cameras.augmentedRealityCamera.activate();
      viewarApi.coreInterface.call('switchTracker', 'Remote');
    }
    viewarApi.coreInterface.call('startStreaming', sessionId, calleeRole);

    this.callStatus = ACTIVE;
  }

  /**
   * ends the active call
   * @return {Promise.<void>}
   */
  async function endCall () {
    const { oppositeId } = this.currentCall;

    this.socketConnection.send({ room: oppositeId, messageType: 'endCall', data: {} });
    this.endCallHandler();
  }

  async function refuseCall() {
    const { oppositeId } = this.currentCall;

    this.socketConnection.send({ room: oppositeId, messageType: 'callRefused', data: {} });

    this.callStatus = null;
    this.currentCall = null;
  }

  function endCallHandler(observer) {
    const { viewarApi } = this;
    const { sessionId, calleeRole } = this.currentCall;

    viewarApi.coreInterface.call('stopStreaming', sessionId);
    if(calleeRole === 'receiver') viewarApi.coreInterface.call('switchTracker', Object.keys(viewarApi.trackers).find(tracker => tracker !== 'Remote'));

    observer && observer.next();

    this.callStatus = null;
    this.currentCall = null;
  }

  function sendData(key, data) {
    const { oppositeId } = this.currentCall;

    if(!oppositeId) throw new Error('no active connection');
    this.socketConnection.send({ room: oppositeId, messageType: key, data });
  }

}