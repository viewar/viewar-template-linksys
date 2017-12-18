import View from '../../lib/View';
import { sortTouchesByDistance } from '../../lib/utils';

export default class TroubleshootingView extends View {

  constructor({ viewarApi, routingService }){
    super();
    this.viewarApi = viewarApi;
    this.routingService = routingService;

    const backButton = document.getElementById('troubleshooting_button-back');
    backButton.onclick = () => this.backButtonHandler();
  }

  static html(){
    return(`
      <div>
        <button class="button-active button button-big" id="troubleshooting_button-back">Back</button>
        <div>Troubleshooting Screen</div>
      </div>
    `);
  }

  backButtonHandler() {
    this.routingService.showView('home-view');
  }

  viewDidMount({ callStatus } = {}){
    const tracker = Object.values(this.viewarApi.trackers)[0];

    const initialState = {
      tracking: false,
      tracker
    };

    this.setState(initialState);

    this.viewarApi.coreInterface.call('switchToMode', 'TouchRay');

    this.viewarApi.sceneManager.on('sceneTouched', (touches) => this.handleSceneTouch(touches));
    tracker && tracker.on('trackingTargetStatusChanged', ({ tracked }) => this.setState({ tracking: tracked }));
  }

  viewDidUnmount() {
    const { tracker } = this.state;
    tracker && tracker.off('trackingTargetStatusChanged', (tracking) => this.setState({ tracking }));
    this.viewarApi.sceneManager.off('sceneTouched', (touches) => this.handleSceneTouch(touches));
  }

  async handleSceneTouch(touches) {
    console.log(touches)
    const sortedTouches = await sortTouchesByDistance(touches, this.viewarApi);
    const { x, y, z } = sortedTouches[0].intersection[0];

    console.log( x, y, z);
    const result = await this.viewarApi.coreInterface.call('getCameraColorAtWorldPosition', `[${x},${y},${z}]`, 10)
    console.log(result);
  }
}


const ledCheck = () => {

  const leds = {
    power: {
      coordinates: { x: 200, y: 200, z: 300},
      optimal: { r: 100, g: 100, b: 100},
      errorMessage: 'enter message for power here',
    },
    dmz: {
      coordinates: { x: 200, y: 200, z: 300},
      optimal: { r: 100, g: 100, b: 100},
      errorMessage: 'enter message for dmz here',
    },
    wlan: {
      coordinates: { x: 200, y: 200, z: 300},
      optimal: { r: 100, g: 100, b: 100},
      errorMessage: 'enter message for wlan here',
    },
  }


}