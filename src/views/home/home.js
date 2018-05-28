import './styles.css';
import View from '../../lib/View';

import logo from '../../../assets/Cisco_logo.svg';

export default class HomeView extends View {

  constructor({ offline, routingService, callService, socketConnection }){
    super();
    this.routingService = routingService;
    this.callService = callService;
    this.socketConnection = socketConnection;
    this.offline = offline

    const troubleShootingButton = document.getElementById('home_troubleShootingButton');
    const instructionsButton = document.getElementById('home_instructionsButton');
    const adminButton = document.getElementById('home_adminButton');

    troubleShootingButton.onclick = () => this.troubleShootingButtonHandler();
    instructionsButton.onclick = () => this.instructionsButtonHandler();
    adminButton.onclick = () => this.adminButtonHandler();

    if (!offline) {
      this.incomingCallSub = this.callService.incomingCall$.subscribe((id) => this.incomingCallHandler(id));
    }

  }

  static html(offline){
    return(`
      <div class="home-container">
        <video class="background-video" autoplay playsinline webkit-playsinline loop muted >
          <source src="http://test2.3.viewar.com/linksys/assets/intro.mp4" />
        </video>
        <img class="logo" src=${logo} alt="cisco logo white">
        <button class="button-active button button-big red ${offline && 'hidden'}" id="home_adminButton">Admin Mode</button>
        <div class="offline-message ${!offline && 'hidden'}">Offline</div>
        <div class="button-bar bottom-right">
          <button class="button-active button button-big" id="home_instructionsButton">Installation Guide</button>
          <button class="button-active button button-big" id="home_troubleShootingButton">Trouble Shooting</button>
        </div>
      </div>
  `)
  }

  troubleShootingButtonHandler() {
    this.routingService.showView('troubleshooting-view');
  }

  instructionsButtonHandler() {
    this.routingService.showView('instructions-view');
  }

  async incomingCallHandler(id) {
    if(confirm(`Incoming call. Do you want to answer?`)){
      await this.callService.answerCall();
      this.socketConnection.setClientData({ status: 'busy' });
      this.routingService.showView('instructions-view', { callStatus: 'active' });
    }else{
      await this.callService.refuseCall();
    }
  }

  adminButtonHandler() {
    if (this.offline) {
      alert('Admin mode not available when offline.')
    } else {

      const name = prompt('Please enter your username', 'Admin');
      if (!name) return;

      this.socketConnection.setClientData({name, role: 'Admin'});
    }
  }
}
