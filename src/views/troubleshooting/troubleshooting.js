import View from '../../lib/View';
import { sortTouchesByDistance } from '../../lib/utils';

export default class TroubleshootingView extends View {

  constructor({ viewarApi, routingService, ledCheckService }){
    super();
    this.viewarApi = viewarApi;
    this.routingService = routingService;
    this.ledCheckService = ledCheckService;

    const backButton = document.getElementById('troubleshooting_button-back');

    //debug
    this.troubleshooting_radius = document.getElementById('troubleshooting_radius');
    this.rgb_debug = document.getElementById('rgb_debug');
    this.bgr_debug = document.getElementById('bgr_debug');



    backButton.onclick = () => this.backButtonHandler();
  }

  static html(){
    return(`
      <div>
        <button class="button-active button button-big" id="troubleshooting_button-back">Back</button>
        <input id="troubleshooting_radius" min=0 step=1 type="number" value="10" />
        <div class="debug_square" id="rgb_debug"></div>
        <div class="debug_square" id="bgr_debug"></div>
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

    //TEMP
    this.viewarApi.coreInterface.call('switchToMode', 'TouchRay');
    this.viewarApi.sceneManager.on('sceneTouched', (touches) => this.handleSceneTouch(touches));


    //this.ledCheckService.start(5000);


    tracker && tracker.on('trackingTargetStatusChanged', ({ tracked }) => this.setState({ tracking: tracked }));
  }

  viewDidUnmount() {
    const { tracker } = this.state;

    //this.ledCheckService.stop();


    tracker && tracker.off('trackingTargetStatusChanged', (tracking) => this.setState({ tracking }));
    this.viewarApi.sceneManager.off('sceneTouched', (touches) => this.handleSceneTouch(touches));
  }

  async handleSceneTouch(touches) {
    console.log(touches)
    const sortedTouches = await sortTouchesByDistance(touches, this.viewarApi);
    const { x, y, z } = sortedTouches[0].intersection[0];

    // this.ledCheckService.checkLeds();
    const result = await this.viewarApi.coreInterface.call('getCameraColorAtWorldPosition', `[${x},${y},${z}]`, parseInt(this.troubleshooting_radius.value) || 10)
    console.log(result);
    this.rgb_debug.style.backgroundColor = `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
    this.bgr_debug.style.backgroundColor = `rgb(${result[2]}, ${result[1]}, ${result[0]})`;

  }

}