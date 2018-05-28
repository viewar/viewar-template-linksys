export default function createLedCheck({ viewarApi, ledConfig }) {

  let interval;
  let started = true

  const _getColorDistance = (a, b) =>
    Math.sqrt((b[0]-a[0]) ** 2 + (b[1]-a[1]) ** 2 + (b[2]-a[2]) ** 2)

  //for green
  const _isInRange = (range, groundTruth, rgb) => {
    if (rgb) {
      const distance = _getColorDistance(rgb, groundTruth)
      return distance <= range;
    } else {
      return false
    }
  }

  async function checkLeds() {
    if (started) {
      const cameraColors = await Promise.all(ledConfig.map(led => {
        const {x, y, z} = led.coordinates;
        return viewarApi.coreInterface.call('getCameraColorAtWorldPosition', `[${x},${y},${z}]`, 3)
      }));

      const results = cameraColors.map((result, i) => {
        const ok = _isInRange(50, ledConfig[i].optimal, result)
        return Object.assign(ledConfig[i], {ok});
      });

      const criticalResults = results.filter(({ok}) => !ok);


      //TODO publish as event
      criticalResults.map(res => alert(res.errorMessage));
    }
  }

  function start(frequency = 5000) {
    started = true
    checkLeds();
    interval = setInterval(checkLeds, frequency);
  }

  function stop() {
    started = false
    interval && clearInterval(interval);
  }

  return {
    start,
    stop,
    checkLeds
  };
}
