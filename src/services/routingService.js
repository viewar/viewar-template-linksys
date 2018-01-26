export default function RoutingService(viewarApi) {

  return {
    viewarApi,
    register,
    showView,
    injectViews,
    views: {},
  }

  function register(id, view) {
    this.views[id] = view;
  }

  function injectViews(wrapper, views) {
    views.forEach(view => {
      wrapper.innerHTML += `<div class="hidden ${view.id}">${view.container.html()}</div>`;
      return setTimeout(() => {
        const viewObj = new view.container(view.props || {});
        this.register(view.id, viewObj);
      }, 0);
    });
  }

  function showView(viewId, props){

    // terminate if the view is already active
    if(this.activeView === viewId) return;

    // trigger unmount hook on active view
    this.activeView && this.views[this.activeView].viewDidUnmount();

    const views = document.getElementById('views');

    Array.from(views.children).forEach(child => {
      if(child.classList.contains(viewId)){
        child.classList.remove('hidden');
        this.activeView = viewId;
        // trigger mount hook on active view
        this.views[viewId].viewDidMount(props);
      } else {
        child.classList.add('hidden');
      }
    });
  }

}