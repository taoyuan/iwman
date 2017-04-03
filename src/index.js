"use strict";

const _ = require('lodash');
const EventEmitter = require('events');
const {exec} = require('child-process-promise');
const PromiseA = require('bluebird');
const iwconfig = require('wireless-tools/iwconfig');
const ifconfig = require('wireless-tools/ifconfig');
const iwlist = require('wireless-tools/iwlist');
const {WPAConf} = require('wpa-supplicant-conf');

const ap = require('./ap');

const WPA_SUPPLICANT_CONF_FILE = '/etc/wpa_supplicant/wpa_supplicant.conf';

class IWMan extends EventEmitter {

  constructor() {
    super();
  }

  mode(iface) {
    return this.status(iface).then(status => {
      if (status.ipv4_address && status.ssid) {
        return 'wifi';
      } else {
        return 'unknown'
      }
    });
  };

  isWiFiMode(iface) {
    return this.mode(iface).then(mode => mode === 'wifi');
  };

  wpa() {
    return new WPAConf(WPA_SUPPLICANT_CONF_FILE);
  };

  detect() {
    function check(result) {
      const {stdout} = result;

      if (stdout.indexOf('802.11') >= 0) {
        return '802.11';
      } else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
        return 'WLAN';
      }
      return false;
    }

    return PromiseA.filter(['lsusb', 'iwconfig'], which)
      .then(cmds => {
        return new PromiseA((resolve) => {
          let index = 0;

          function next() {
            const cmd = cmds[index++];
            if (!cmd) {
              return resolve(null);
            }
            exec(cmd)
              .then(check)
              .then(found => {
                if (found) return resolve({device: found});
                next();
              })
              .catch(next);
          }

          next();
        });
      })
      .then(data => {
        this.emit('detect', data);
        return data;
      })
  };

  status(iface) {
    iface = iface || 'wlan0';
    return PromiseA.all([
      PromiseA.fromCallback(cb => iwconfig.status(iface, cb)),
      PromiseA.fromCallback(cb => ifconfig.status(iface, cb))
    ]).then(results => {
      const status = Object.assign({}, ...results);
      this.emit('status', status);
      return status;
    });
  };

  ifup(iface) {
    iface = iface || 'wlan0';
    return PromiseA.try(() => exec(`ifup ${iface} up`))
      .then(exec(`ifconfig ${iface} up`))
      .then(() => {
        console.log("ifup " + iface + " successful...");
        this.emit('ifup');
      });
  };

  ifdown(iface) {
    iface = iface || 'wlan0';
    return PromiseA.try(() => exec(`ifdown ${iface} down`))
      .then(exec(`ifconfig ${iface} down`))
      .then(() => {
        console.log("ifdown " + iface + " successful...");
        this.emit('ifdown');
      });
  };

  ifreboot(iface, delay = 1000) {
    iface = iface || 'wlan0';
    return this.ifdown(iface)
      .delay(delay)
      .then(() => this.ifup(iface)).then(() => {
        console.log("ifreboot " + iface + " successful...");
        this.emit('ifreboot');
      });
  };

  scan(options) {
    options = options || 'wlan0';
    const iface = typeof options === 'string' ? options : options.iface;
    return new PromiseA.fromCallback(cb => iwlist.scan(options, cb))
      .then((networks) => {
        console.log("scan " + iface + " successful...");
        this.emit('scan', networks);
        return networks;
      })
  };

  supplicants() {
    return this.wpa().nets;
  };

  addSupplicant(creds) {
    const {
      ssid,
      password,
      auth,
      encryption,
      security,
      hidden,
    } = creds;
    const options = _.omit(creds, ['ssid', 'password', 'encryption', 'security', 'hidden']);
    if (encryption && auth === 'PSK') {
      options.key_mgmt = 'WPA-PSK';
      options.proto = security === 'WPA2' ? 'WPA2' : 'WPA';
    } else {
      options.key_mgmt = 'NONE';
      if (auth === 'WEP' || (encryption && !auth)) {
        options.wep_tx_keyidx = 0;
        options.wep_key0 = password;
      }
    }
    if (hidden) {
      options.scan_ssid = 1;
    }

    return this.wpa().addAndSave(ssid, password, options);
  };

  removeSupplicant(ssid) {
    return this.wpa().removeAndSave(ssid);
  };

  /**
   *
   * @param name
   * @param options
   * @return {Process}
   */
  createAP(name, options) {
    return ap.create(name, options);
  };
}

function which(cmd) {
  return exec(`which ${cmd}`).then(result => result.stdout).catch(() => false);
}

exports = module.exports = new IWMan();
exports.IWMan = IWMan;
