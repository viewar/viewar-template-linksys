import { initViewar } from './lib/index';

import './index.css';
import './spinner.css';

import HomeView from './views/home/home';
import InstructionsView from './views/instructions/instructions';
import TroubleshootingView from './views/troubleshooting/troubleshooting';
import AdminView from './views/admin/admin';

import RoutingService from "./services/routingService";
import SocketConnection from './services/websocket/socket-connection2';
import CallService from './services/callService';
import createLedCheck from './services/ledCheck';

const appId = 'com.viewar.linksysdev';

main();

async function main(){

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
  const viewarApi = await initViewar({ appId });
  const routingService = new RoutingService(viewarApi);

  const ledCheckService = createLedCheck({viewarApi, ledConfig: viewarApi.appConfig.uiConfig.ledConfig } );


  const socketConnection = SocketConnection();
  socketConnection.connect({ host: 'ws://3.viewar.com:3001'}); //


  socketConnection.socket.on('connect_error', alert);
  socketConnection.socket.on('connect', async () => {
    const callService = new CallService(socketConnection, viewarApi);
    callService.init();

    const role = viewarApi.appConfig.uiConfig.isAdmin ? 'Admin' : 'Client';
    const { socketChannel } = viewarApi.appConfig.uiConfig;

    // you can define a prefix, to enable multiple rooms of the same app for development purposes
    await socketConnection.joinSession({
      prefix: 'debug_mat_',
      id: socketChannel,
      role,
    });

    await viewarApi.cameras.augmentedRealityCamera.activate();

    // inserting the router model into the scene
    const routerModel = viewarApi.modelManager.findModelByForeignKey('linksys_router');
    await viewarApi.sceneManager.insertModel(routerModel, { pose:{ position:{ x:0, y:0, z:0 }}});

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
      { id: 'home-view', container: HomeView, props: { viewarApi, routingService, callService, socketConnection}},
      // { id: 'admin-view', container: AdminView, props: { viewarApi, routingService, callService}},
      { id: 'instructions-view', container: InstructionsView, props: { viewarApi, routingService, callService, annotations}},
      { id: 'troubleshooting-view', container: TroubleshootingView, props: { viewarApi, routingService, ledCheckService}},
    ]);

    //route to a specific view according to the role;
    const nextView = role === 'Admin' ? 'admin-view' : 'home-view';
    setTimeout(() => routingService.showView(nextView), 20);

    showLoading(false);
  });

}

function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');

  show ?
    spinner.classList.remove('hidden')
        :
    spinner.classList.add('hidden');
}


