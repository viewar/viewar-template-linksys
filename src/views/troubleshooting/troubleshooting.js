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
    this.rgb_debug_value = document.getElementById('rgb_debug_value');

    this.troubleshooting_x = document.getElementById('troubleshooting_x');
    this.troubleshooting_y = document.getElementById('troubleshooting_y');
    this.troubleshooting_z = document.getElementById('troubleshooting_z');





    backButton.onclick = () => this.backButtonHandler();
  }

  static html(){
    return(`
      <div>
        <button class="button-active button button-big" id="troubleshooting_button-back">Back</button>
        Radius: <input id="troubleshooting_radius" min=0 step=1 type="number" value="3" />
        x: <input id="troubleshooting_x" step=0.1 type="number" value="-72" />
        y: <input id="troubleshooting_y" step=0.1 type="number" value="27.5" />
        z: <input id="troubleshooting_z" step=0.1 type="number" value="-77" />

        RGB:<div id="rgb_debug_value"></div>
        <div class="debug_square" id="rgb_debug"></div>
      </div>
    `);
  }

  backButtonHandler() {
    this.routingService.showView('home-view');
  }

  async viewDidMount({ callStatus } = {}){
    const tracker = Object.values(this.viewarApi.trackers)[0];

    const initialState = {
      tracking: false,
      tracker
    };

    this.setState(initialState);

    // //TEMP
    // this.viewarApi.coreInterface.call('switchToMode', 'TouchRay');
    // this.viewarApi.sceneManager.on('sceneTouched', (touches) => this.handleSceneTouch(touches));

    //power
    //const annotationModel = await api.modelManager.getModelFromRepository('45972');
    //await api.sceneManager.insertModel(annotationModel, { pose:{ scale: {x: 0.01, y: 0.01, z: 0.01}, position:{ x:-72, y:27.5, z:-77 }}});

    //upper green
    //window.test = await api.sceneManager.insertModel(annotationModel, { pose:{ scale: {x: 0.01, y: 0.01, z: 0.01}, position:{ x:-71.8, y:28, z:-61 }}});



    //setInterval(() => this.handleSceneTouch(), 1000);
    this.ledCheckService.start(5000);


    tracker && tracker.on('trackingTargetStatusChanged', ({ tracked }) => this.setState({ tracking: tracked }));
    tracker && tracker.activate();
  }

  viewDidUnmount() {
    const { tracker } = this.state;

    this.ledCheckService.stop();


    tracker && tracker.off('trackingTargetStatusChanged', ({ tracked }) => this.setState({ tracking: tracked }));
    tracker && tracker.deactivate();
    // this.viewarApi.sceneManager.off('sceneTouched', (touches) => this.handleSceneTouch(touches));
  }

  async handleSceneTouch(touches) {
    //console.log(touches)
    //const sortedTouches = await sortTouchesByDistance(touches, this.viewarApi);
    //const { x, y, z } = sortedTouches[0].intersection[0];

    const x = this.troubleshooting_x.value;
    const y = this.troubleshooting_y.value;
    const z = this.troubleshooting_z.value;

    // this.ledCheckService.checkLeds();
    const result = await this.viewarApi.coreInterface.call('getCameraColorAtWorldPosition', `[${x},${y},${z}]`, parseInt(this.troubleshooting_radius.value) || 10)
    console.log(result);
    this.rgb_debug.style.backgroundColor = `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
    this.rgb_debug_value.innerText = `${result[0]}, ${result[1]}, ${result[2]}`
  }

}
