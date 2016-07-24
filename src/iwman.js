"use strict";

import EventEmitter from 'events';
import {exec} from 'child-process-promise';
import Promise from 'bluebird';
import iwconfig from 'wireless-tools/iwconfig';
import ifconfig from 'wireless-tools/ifconfig';
import iwlist from 'wireless-tools/iwlist';
import {WPAConf} from 'wpa-supplicant-conf';

import AP from './ap';

const WPA_SUPPLICANT_CONF_FILE = '/etc/wpa_supplicant/wpa_supplicant.conf';

class IWMan extends EventEmitter {

  constructor() {
    super();
  }

  wpa = () => {
    return new WPAConf(WPA_SUPPLICANT_CONF_FILE);
  };

  detect = () => {
    function check(result) {
      const {stdout} = result;

      if (stdout.indexOf('802.11') >= 0) {
        return '802.11';
      } else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
        return 'WLAN';
      }
      return false;
    }

    return Promise.filter(['lsusb', 'iwconfig'], which)
      .then(cmds => {
        return new Promise((resolve) => {
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

  status = (intf) => {
    intf = intf || 'wlan0';
    return Promise.all([
      Promise.fromCallback(cb => iwconfig.status(intf, cb)),
      Promise.fromCallback(cb => ifconfig.status(intf, cb))
    ]).then(results => {
      const status = Object.assign({}, ...results);
      this.emit('status', status);
      return status;
    });
  };

  ifup = (intf) => {
    intf = intf || 'wlan0';
    let cmd = `ifup ${intf} up`;
    return exec(cmd).then(() => {
      this.emit('ifup');
    });
  };

  ifdown = (intf) => {
    intf = intf || 'wlan0';
    return exec(`ifdown ${intf} down`).then(() => {
      this.emit('ifdown');
    });
  };

  ifrestart = (intf) => {
    intf = intf || 'wlan0';
    return this.ifdown(intf).then(() => this.ifup(intf)).then(() => {
      this.emit('ifrestart');
    });
  };

  scan = (options) => {
    options = options || 'wlan0';
    return new Promise.fromCallback(cb => iwlist.scan(options, cb))
      .then((networks) => {
        this.emit('scan', networks);
        return networks;
      })
  };

  supplicants = () => {
    return this.wpa().nets;
  };

  addSupplicant = (creds) => {
    const {
      ssid,
      password,
      auth,
      encryption,
      security,
      hidden,
      ...others
    } = creds;

    const options = {...others};
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

  removeSupplicant = (ssid) => {
    return this.wpa().removeAndSave(ssid);
  };

  createAP = (name, options) => {
    return new AP(name, options);
  };

}

function which(cmd) {
  return exec(`which ${cmd}`).then(result => result.stdout).catch(() => false);
}

export default new IWMan();
export {IWMan};
