export default function createLedCheck({ viewarApi, ledConfig }) {

  let interval;

  const _getColorDistance = (a, b) =>
    Math.sqrt((b[0]-a[0]) ** 2 + (b[1]-a[1]) ** 2 + (b[2]-a[2]) ** 2)

  //for green
  const _isInRange = (range, groundTruth, rgb) => {
    //const distance = _getColorDistance(rgb, groundTruth)
    const isGreenMax = rgb.indexOf(Math.max(...rgb)) === 1;
    console.log(groundTruth[1] - rgb[1], groundTruth, rgb)
    return isGreenMax && Math.abs(groundTruth[1] - rgb[1]) <= range;
  }

  async function checkLeds() {

    const cameraColors = await Promise.all(ledConfig.map(led => {
      const { x, y, z} = led.coordinates;
      // debug return [72, 156, 73 ];
      return viewarApi.coreInterface.call('getCameraColorAtWorldPosition', `[${x},${y},${z}]`, 10)
    }));

    const results = cameraColors.map((result, i) => {
      const ok = _isInRange(70, ledConfig[i].optimal, result)
      return Object.assign(ledConfig[i], { ok });
    });

    const criticalResults = results.filter(({ ok }) => !ok);


    //TODO publish as event
    criticalResults.map(res => console.warn(res.errorMessage));
  }

  function start(frequency = 5000) {
    checkLeds()
    interval = setInterval(checkLeds, frequency);
  }

  function stop() {
    interval && interval.clearInterval();
  }

  return {
    start,
    stop,
    checkLeds
  };
}