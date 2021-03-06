import viewarApi from 'viewar-api';

import './index.css';
import './spinner.css';

import HomeView from './views/home/home';
import InstructionsView from './views/instructions/instructions';
import TroubleshootingView from './views/troubleshooting/troubleshooting';

import RoutingService from "./services/routingService";

import { createCallService } from 'viewar-call';
import { createSocketConnection } from 'viewar-socket';


import createLedCheck from './services/ledCheck';

const ledConfig = [{
    "id": "power",
    "coordinates": {
      "x": -72 ,
      "y": 27.5,
      "z": -77
    },
    "optimal": [254, 220, 127],
    "errorMessage": "Your device is not powered on"
}];

;(async () => {

  const appContainer = document.getElementById('app') || document.getElementById('viewar_app') || window.document.body;
  appContainer.innerHTML = `
    <div id="loadingSpinner" class="spinnerWrapper hidden">
      <div class="loadingSpinner">
        <div class="double-bounce1"></div>
        <div class="double-bounce2"></div>
      </div>
    </div>
    <div id="views"></div>
  `;

  showLoading(true);

  // initializing api and services
  const api = await viewarApi.init({logToScreen: true, waitForDebugger: false});
  window.api = api;

  api.sceneManager.clearScene();
  const socketConnection = createSocketConnection({ host: 'ws://3.viewar.com:3001'});

  // await setupApp(true, socketConnection)

  socketConnection.socket.on('connect_error', async(error) => {
    console.error(error)
    await setupApp(true, socketConnection)
  });
  socketConnection.socket.on('connect', async () => {
    const callService = createCallService(socketConnection, api);

    // you can define a prefix, to enable multiple rooms of the same app for development purposes
    await socketConnection.joinSession({
      prefix: 'debug_mat_',
      id: api.appConfig.uiConfig.socketChannel
    });

    await setupApp(false, socketConnection, callService)
  });

})();

async function setupApp(offline = false, socketConnection, callService) {
  const routingService = new RoutingService(viewarApi, offline);

  const ledCheckService = createLedCheck({viewarApi, ledConfig: ledConfig || api.appConfig.uiConfig.ledConfig } );

  await viewarApi.cameras.augmentedRealityCamera.activate();

  // inserting the router model into the scene
  const routerModel = viewarApi.modelManager.findModelByForeignKey('linksys_router');
  await viewarApi.sceneManager.insertModel(routerModel, { id: 'LinksysRouter', pose:{ position:{ x:0, y:0, z:0 }}});

  // inserting annotation points into the scene
  const annotationModel = await viewarApi.modelManager.getModelFromRepository('45972');
  const ownAnnotationInstance = await viewarApi.sceneManager.insertModel(annotationModel, { visible: false, pose:{ scale: {x: 0.05, y: 0.05, z: 0.05}, position:{ x:0, y:0, z:0 }}});
  await ownAnnotationInstance.setPropertyValues({ color: 'blue'});

  const externalAnnotationInstance = await viewarApi.sceneManager.insertModel(annotationModel, { visible: false, pose:{ scale: {x: 0.05, y: 0.05, z: 0.05}, position:{ x:0, y:0, z:0 }}});
  await externalAnnotationInstance.setPropertyValues({ color: 'red'});

  const annotations = { ownAnnotationInstance, externalAnnotationInstance };

  // injecting views to act as a single page application
  const views = document.getElementById('views');
  routingService.injectViews(views, [
    { id: 'home-view', container: HomeView, props: { viewarApi, offline, routingService, callService, socketConnection }},
    { id: 'instructions-view', container: InstructionsView, props: { viewarApi, offline, routingService, callService, annotations }},
    { id: 'troubleshooting-view', container: TroubleshootingView, props: { viewarApi, routingService, ledCheckService }},
  ]);

  setTimeout(() => routingService.showView('home-view'), 20);

  showLoading(false);
}

function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');

  show ?
    spinner.classList.remove('hidden')
        :
    spinner.classList.add('hidden');
}
