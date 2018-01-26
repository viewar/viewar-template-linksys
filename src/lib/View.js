export default class  View {

  constructor() {
    this.state = {};
  }

  viewDidMount(props){
  }

  viewDidUnmount() {
  }

  setState(part, synced) {
    this.state = Object.assign(this.state, part);
    this.onStateChanged(part, synced);
  }

  onStateChanged(state) {
  }
}