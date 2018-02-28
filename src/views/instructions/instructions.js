import View from '../../lib/View';
import './styles.css';
import { sortTouchesByDistance } from '../../lib/utils';
import { ACTIVE } from "viewar-call";

export default class InstructionsView extends View {

  constructor({ viewarApi, routingService, callService, annotations }){
    super();
    this.viewarApi = viewarApi;
    this.routingService = routingService;
    this.callService = callService;
    this.annotations = annotations;

    this.router = this.viewarApi.sceneManager.scene.children[0];

    this.backButton = document.getElementById('instructions_button-back');
    this.backButton.onclick = () => this.backButtonHandler();

    this.powerPlugButton = document.getElementById('powerplug_button');
    this.internetButton = document.getElementById('internet_button');
    this.lanButton = document.getElementById('lan_button');
    this.nextButton = document.getElementById('next_button');
    this.callButton = document.getElementById('call_button');
    this.endCallButton = document.getElementById('end_call_button');


    this.infoTextEl = document.getElementById('info-text');
    this.trackingLostMessage = document.getElementById('trackingLost-message');
    this.adminList = document.getElementById('adminList');


    this.adminList.onclick = () => this.handleAdminListClick();


    this.powerPlugButton.onclick = () => this.setState({ step: 0 });
    this.internetButton.onclick = () => this.setState({ step: 1});
    this.lanButton.onclick = () => this.setState({ step: 2});
    this.nextButton.onclick = () => this.setState({ step: ++this.state.step });

    this.callButton.onclick = () => this.callHandler();
    this.endCallButton.onclick = () => this.endCallHandler();

    //this.callService.socketConnection.clientJoined$.subscribe(({ id }) => alert(`user ${id} joined`) );
    this.callService.socketConnection.clientListUpdate$.subscribe(() => this.rerenderAdminList());

    this.callService.getData('stepChanged').subscribe((step) => this.setState({ step }, true));



    this.callService.getData('updateExternalAnnotation')
      .subscribe((externalAnnotationPosition) => this.setState({ externalAnnotationPosition }, true));

    this.callRefusedSub = this.callService.callRefused$.subscribe(() => this.setState({ callStatus: null, message: 'call was refused' }));
    this.callEndedSub = this.callService.callEnded$.subscribe(() => {
      this.setState({ callStatus: null });
      this.callService.socketConnection.setClientData({ status: null });
    });
    this.callAcceptedSub = this.callService.callAccepted$.subscribe(() => this.setState({ callStatus: 'active' }));
    this.lineBusySub = this.callService.lineBusy$.subscribe(() => this.setState({ callStatus: null, message: 'line is busy' }));

    this.viewarApi.coreInterface.call('switchToMode', 'TouchRay');
  }

  static html(){
    return(`
      <div class="instructions-container">
        <div id="trackingLost-message" class="fullscreen-message hidden">Tracking Lost</div>
        <button class="button-active button button-big" id="instructions_button-back">Back</button>
          <div class="assistence">
            <div class="help-text">Still need help with our product?</div>
            <button class="button button-big call_button" id="call_button">Call Assistent</button>
            <button class="button button-big call_button hidden" id="end_call_button">End Call</button>
            <div class="hidden" id="adminList"></div>
          </div>
          <div class="content steps">
            <button class="button-active button button-big" id="powerplug_button">Power Plug</button>
            <button class="button button-big" id="internet_button">Internet</button>
            <button class="button button-big" id="lan_button">LAN</button>
          </div>
          <div class="content instructions">
            <div id="info-text" class="info-text"></div>
            <button class="button-active button button-big" id="next_button">Next Step</button>
          </div>
      </div>
  `)
  }

  viewDidMount({ callStatus } = {}){
    const tracker = Object.values(this.viewarApi.trackers)[0];
    const initialState = {
      step: 0,
      tracking: false,
      tracker,
      callStatus
    };

    this.setState(initialState);

    this.viewarApi.sceneManager.on('sceneTouched', (touches) => this.handleSceneTouch(touches));
    tracker && tracker.on('trackingTargetStatusChanged', ({ tracked }) => this.setState({ tracking: tracked }));
  }

  viewDidUnmount() {
    const { tracker } = this.state;
    tracker && tracker.off('trackingTargetStatusChanged', (tracking) => this.setState({ tracking }));
    this.viewarApi.sceneManager.off('sceneTouched', ({ tracked }) => this.setState({ tracking: tracked }));


    // this.incomingCallSub.unsubscribe();
    // this.callRefusedSub.unsubscribe();
    // this.callEndedSub.unsubscribe();
    // this.callAcceptedSub.unsubscribe();
    // this.lineBusySub.unsubscribe();
  }

  onStateChanged(changes, synced) {
    if(Object.keys(changes).includes('step')) {
      this.stepChangeHandler(changes.step, synced);
    }
    if(Object.keys(changes).includes('tracking') && this.state.tracker) {
      this.trackingStatusHandler(changes.tracking);
    }
    if(Object.keys(changes).includes('callStatus')) {
      this.callStatusHandler(changes.callStatus);
    }
    if(Object.keys(changes).includes('message')) {
      alert(changes.message);
    }
    if(Object.keys(changes).includes('externalAnnotationPosition')) {
      this.annotationHandler(changes.externalAnnotationPosition, this.annotations.externalAnnotationInstance);
    }
    if(Object.keys(changes).includes('annotation')) {
      this.annotationHandler(changes.annotation, this.annotations.ownAnnotationInstance);
    }
  }

  rerenderAdminList() {
    const adminListEl = document.querySelector('#adminList');

    const { clients, socket }  = this.callService.socketConnection;

    const admins = clients.filter(client => client.id !== socket.id && client.role === 'Admin' && client.status !== 'busy');
    adminListEl.innerHTML = admins.map(admin => `<div data-id="${admin.id}" class="adminListItem">${admin.name}</div>`).join('');
  }

  backButtonHandler() {
    this.routingService.showView('home-view');
  }

  stepChangeHandler(step, synced) {

    const messages = [
      '1. Connect the power plug',
      '2. Connect the internet cable',
      '3. Connect lan cables',
    ];

    if(!synced) {
      try{
        this.callService.sendData('stepChanged', step);
      } catch(e) {
        console.warn('no active call');
      }
    }

    this.powerPlugButton.classList.toggle('button-active', step === 0);
    this.internetButton.classList.toggle('button-active', step === 1);
    this.lanButton.classList.toggle('button-active', step === 2);
    this.nextButton.classList.toggle('transparent', step === 2);

    this.infoTextEl.innerText = messages[step];

    const { id, animations } = this.router;

    //remap the animation to be in the right step order
    const remappedAnimations = [
      animations.Electricity,
      animations.Modem,
      animations.Lan,
    ];

    this.playAnimation(id, remappedAnimations[step]);
  }

  trackingStatusHandler(tracking) {
    const contentEls = document.querySelectorAll('.content');
    if(tracking) {
      this.trackingLostMessage.classList.add('hidden');
      Array.from(contentEls).forEach(el => el.classList.remove('hidden'));
    } else {
      this.trackingLostMessage.classList.remove('hidden');
      Array.from(contentEls).forEach(el => el.classList.add('hidden'));
    }
  }

  playAnimation(instanceId, animation, loop = true){

    const { activeAnimation } = this.state;

    this.viewarApi.coreInterface.call('setAnimationStatus', {
      [instanceId]: {
        // stop the active animation
        [activeAnimation]: {
          time: 0,
          enabled: false,
          loop,
        },
        // enable the selected
        [animation.name]: {
          time: 0,
          enabled: true,
          loop,
        }
      }
    });

    this.setState({ activeAnimation: animation.name });
  }

  callHandler () {
    const { clients, socket }  = this.callService.socketConnection;

    const adminIds = clients.filter(client => client.id !== socket.id && client.role === 'Admin').map(({ id }) => id);

    if(!adminIds.length) {
      alert(`We're sorry all support agents are busy now. Would you please try your call again later.`);
      return;
    }

    if(adminIds.length === 1) {
      this.setState({ callStatus: 'pending' });
      return this.callService.call({ id: adminIds[0] });
    } else {
      this.rerenderAdminList();
      this.adminList.classList.remove('hidden');
    }
  }

  async endCallHandler () {
    await this.callService.endCall();
    this.callService.socketConnection.setClientData({ status: null });
    this.setState({ callStatus: null });
  }

  async callStatusHandler(callStatus) {

    if(!callStatus) {
      this.callButton.classList.remove('hidden');
      this.endCallButton.classList.add('hidden');
      this.backButton.classList.remove('hidden');
    } else {
      this.adminList.classList.add('hidden');
      this.callButton.classList.add('hidden');
      this.endCallButton.classList.remove('hidden');
      this.backButton.classList.add('hidden');
    }
  }

  async handleSceneTouch(touches) {
    const { callStatus } = this.callService;
    if(callStatus !== ACTIVE || !touches.length) return;

    const sortedTouches = await sortTouchesByDistance(touches, this.viewarApi);
    const { x, y, z } = sortedTouches[0].intersection[0];

    this.setState({ annotation: { x, y, z }});
    this.callService.sendData('updateExternalAnnotation', { x, y, z});
  }

  async annotationHandler(position, instance) {
    await instance.setPose({ position });
    return instance.setVisible(true);
  }

  handleAdminListClick() {
    if(event.target.classList.contains('adminListItem')){
      const { id } = event.target.dataset;
      this.setState({ callStatus: 'pending' });
      return this.callService.call({ id });
    }
  }

}