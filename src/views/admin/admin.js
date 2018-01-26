import View from '../../lib/View';

export default class AdminView extends View {

  constructor({ viewarApi, routingService }){
    super();
    this.viewarApi = viewarApi;
    this.routingService = routingService;
  }

  static html(){
    return(`
      <div>
        <div>Waiting for Call</div>
      </div>
    `);
  }
}