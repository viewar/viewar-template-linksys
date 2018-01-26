import { UPDATE_POPUP_STYLE, UPDATE_POPUP_LABEL_STYLE, CONFIRM_BUTTON_STYLE,
  UPDATE_POPUP_UPDATE_LABEL_STYLE, WAIT_FOR_DEBUGGER_BUTTON_STYLE } from './ui-styles.js';

//======================================================================================================================
// UI
//======================================================================================================================

export function waitForDebugger(window) {
  return Promise.resolve().then(function () {

    const requireMockEngine = !window.engine;
    const document = window.document;
    const appContainer = document.getElementsByTagName('body')[0];
    const element = document.createElement('button');
    element.classList.add('WaitForDebugger');
    Object.assign(element.style, WAIT_FOR_DEBUGGER_BUTTON_STYLE);
    element.innerHTML = 'App debug mode enabled.';

    window.engine = requireMockEngine && {checkClickThrough: () => "Y"} || window.engine;

    appContainer.appendChild(element);

    return new Promise(function (resolve) {
      element.onclick = handleTap;
      element.ontouchstart = handleTap;

      function handleTap(event) {
        if (requireMockEngine) {
          delete window.engine;
        }
        event.stopImmediatePropagation();
        event.preventDefault();
        appContainer.removeChild(element);
        resolve();
      }
    });
  });
}

export function waitForAppUpdate(window, update) {
  const document = window.document;
  const forceUpdate = update === 'forced';
  const updateText = 'New update available!';
  const forceText = 'You need to update the app via your app store to continue.';
  const recommendedText = 'It is recommended to update this app via your app store.';

  const updatePopup = document.createElement('div');
  updatePopup.classList.add('UpdateBundlePopup');
  Object.assign(updatePopup.style, UPDATE_POPUP_STYLE);
  document.body.appendChild(updatePopup);

  const updateLabel = document.createElement('div');
  updateLabel.classList.add('UpdateBundlePopup-label');
  updateLabel.innerHTML = updateText;
  Object.assign(updateLabel.style, UPDATE_POPUP_LABEL_STYLE);
  updatePopup.appendChild(updateLabel);

  const detailLabel = document.createElement('div');
  detailLabel.classList.add('UpdateBundlePopup-label');
  detailLabel.innerHTML = forceUpdate ? forceText : recommendedText;
  Object.assign(detailLabel.style, UPDATE_POPUP_UPDATE_LABEL_STYLE);
  updatePopup.appendChild(detailLabel);

  if (!forceUpdate) {
    const confirmButton = document.createElement('div');
    confirmButton.classList.add('UpdateBundlePopup-button');
    confirmButton.innerHTML = 'OK';
    Object.assign(confirmButton.style, CONFIRM_BUTTON_STYLE);
    updatePopup.appendChild(confirmButton);

    return new Promise(function (resolve) {
      confirmButton.onclick = handleConfirmTap;
      confirmButton.ontouchstart = handleConfirmTap;

      function handleConfirmTap(event) {
        event.stopImmediatePropagation();
        event.preventDefault();
        document.body.removeChild(updatePopup);
        resolve();
      }
    });
  } else {
    return new Promise(() => {});
  }
}

export function showFakedBundleOverlay(window) {
  const document = window.document;
  const appContainer = document.getElementsByTagName('body')[0];
  const element = document.createElement('div');
  const line1 = document.createElement('div');
  const lineWidth = 40;
  Object.assign(element.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    zIndex: '-1',
    width: '1024px',
    height: '768px',
    opacity: '0.2',
    pointerEvents: 'none',
    transform: 'scale(' + lineWidth + ')'
  });
  Object.assign(line1.style, {
    position: 'absolute',
    width: '1280px',
    height: '1px',
    borderBottom: '1px solid red',
    transform: 'translate(-50%, -50%) rotate(37deg)',
    left: '50%',
    top: '50%'
  });
  const line2 = line1.cloneNode();
  Object.assign(line2.style, {
    transform: 'translate(-50%, -50%) rotate(-37deg)'
  });
  element.appendChild(line1);
  element.appendChild(line2);
  //appContainer.appendChild(element); //For now we wont add an overlay to faked app.
}

export function waitForSwitchBundleId(window, coreInterface, bundleId) {
  return Promise.resolve().then(function () {
    const document = window.document;
    const appContainer = document.getElementsByTagName('body')[0];
    const bundlePopup = document.createElement('div');
    const bundlePopupButtons = document.createElement('div');
    const inputLabel = document.createElement('label');
    const input = document.createElement('input');
    const confirmButton = document.createElement('div');

    Object.assign(bundlePopup.style, {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.5)',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '15px',
      textAlign: 'center',
      padding: '40px 40px 90px 45px',
      borderRadius: '5px',
      zIndex: '1000000'
    });

    Object.assign(inputLabel.style, {
      fontSize: '1em',
      lineHeight: '1em',
      paddingRight: '20px',
      color: 'white'
    });
    inputLabel.innerHTML = 'You are testing the bundle \"' + bundleId + '\"';

    Object.assign(input.style, {
      height: '1.2em',
      display: 'none',
      width: '200px',
      marginTop: '25px'
    });
    input.type = 'text';
    input.value = '';

    Object.assign(bundlePopupButtons.style, {
      transform: 'translateX(-50%)',
      left: '50%',
      position: 'absolute',
      margin: '15px 0',
      display: 'flex'
    });

    Object.assign(confirmButton.style, {
      display: 'block',
      padding: '10px 20px',
      margin: '0 5px',
      borderRadius: '5px',
      color: 'black',
      background: 'white',
      fontSize: '0.8em',
      float: 'left',
      whiteSpace: 'nowrap'
    });
    confirmButton.innerHTML = 'OK';

    const switchButton = confirmButton.cloneNode();
    switchButton.innerHTML = 'Switch bundle';

    bundlePopup.appendChild(inputLabel);
    bundlePopup.appendChild(input);
    bundlePopup.appendChild(bundlePopupButtons);
    bundlePopupButtons.appendChild(confirmButton);
    bundlePopupButtons.appendChild(switchButton);
    appContainer.appendChild(bundlePopup);

    return new Promise(function (resolve) {
      let switchBundle = false;
      confirmButton.onclick = handleConfirmTap;
      confirmButton.ontouchstart = handleConfirmTap;

      switchButton.onclick = handleSwitchTap;
      switchButton.ontouchstart = handleSwitchTap;

      function handleConfirmTap(event) {
        event.stopImmediatePropagation();
        event.preventDefault();
        if (switchBundle) {
          coreInterface.call('setBundleId', input.value).then(() => {
            confirmButton.onclick = null;
            confirmButton.ontouchstart = null;
            confirmButton.style.display = 'none';
            input.blur();
            input.style.display = 'none';
            inputLabel.innerHTML = 'Bundle ID set. Please restart app to take effect.';
          });
        } else {
          appContainer.removeChild(bundlePopup);
          resolve();
        }
      }

      function handleSwitchTap(event) {
        event.stopImmediatePropagation();
        event.preventDefault();
        switchBundle = true;
        switchButton.onclick = null;
        switchButton.ontouchstart = null;
        switchButton.style.display = 'none';
        inputLabel.innerHTML = 'Enter bundle ID:';
        input.style.display = 'block';
      }
    });
  });
}
