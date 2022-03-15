/* eslint prefer-destructuring: ["error", {VariableDeclarator: {array: true}}] */
const hid = require('node-hid');
const fs = require('fs');
const { parser } = require('json-based-conditions-and-rules-logic-evaluator');
const activeWindow = require('active-win');

const ARGS = process.argv.slice(2);
const path = ARGS[0] || './config.json';
let timerID;
let device;

if (!fs.existsSync(path)) {
  console.log('configuration file needed');
  process.exit();
}

const configfile = fs.readFileSync(path);
const config = JSON.parse(configfile);
const {
  PRODUCT,
  USAGEPAGE,
  USAGE,
  TIMERS,
  DEFAULT,
  CONDITIONS,
  RULES
} = config;

const isTargetDevice = function (d) {
  return d.product === PRODUCT && d.usagePage === USAGEPAGE && d.usage === USAGE;
};

function connect() {
  const devices = hid.devices();
  const deviceInfo = devices.find((d) => isTargetDevice(d));
  let was = DEFAULT;
  let wasApp = '';
  let wasTitle = '';
  let wasPlattform = '';
  let output;
  let appData;
  let plattform;
  let titleData;
  let titlePath;

  if (deviceInfo) {
    device = new hid.HID(deviceInfo.path);

    if (device) {
      device.on('data', () => {});

      device.on('error', (err) => {
        console.error('device error:', err);
        device.close();
        clearInterval(timerID);
        connect();
      });

      device.write([DEFAULT]); // default layer code

      setTimeout(() => {
        timerID = setInterval(() => {
          (async () => {
            var activeWin = await activeWindow();
            if (activeWin) {
              const arr = JSON.stringify(activeWin);
              console.log(arr);
              appData = activeWin.owner.name.trim().toLowerCase();
              titleData = activeWin.title.trim().toLowerCase();
              plattform = activeWin.platform.trim().toLowerCase();
              titlePath = activeWin.owner.path.trim().toLowerCase();

              if (wasApp !== appData || wasTitle !== titleData) {
                output = parser({
                  CONDITIONS,
                  RULES,
                  DEFAULT,
                }, {
                  app: appData,
                  title: titleData,
                  path: titlePath,
                });
              }
              // Layer/Platform/Title - Currently not Working, I would like to solve it in QMK
              const result = output;//+'\/'+plattform+'\/'+activeWin.owner.name;
              
              if (output && was !== output) {
                console.log(output);
                device.write([output]);
                was = output;
                wasApp = appData;
                wasTitle = titleData;
                wasPlattform = plattform;
              }
            }
          })();
        }, TIMERS.RUNNER);
      }, TIMERS.LINK);
    }
  } else {
    setTimeout(() => {
      connect();
    }, TIMERS.RELINK);
  }
}

connect();
