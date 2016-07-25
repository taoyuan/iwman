"use strict";

import assert from 'assert';
import fs from 'fs';
import {exec} from 'child-process-promise';
import {spawn} from 'child_process';
import EventEmitter from 'events';
import Promise from 'bluebird';

const CMD_CREATE_AP = `${__dirname}/../create_ap/create_ap`;

class AP extends EventEmitter {

  _process = null;
  _killing = false;
  _started = false;

  static stop(iface) {
    iface = iface || 'wlan0';
    return exec(`bash ${CMD_CREATE_AP} --stop ${iface}`);
  }

  constructor(name, options) {
    super();
    this._create(name, options);
  }

  _create(name, options) {
    assert(name, '"name" is required');
    assert(fs.existsSync(CMD_CREATE_AP), '"create_ap" has not been found in ' + CMD_CREATE_AP);
    options = {
      wifiInterface: 'wlan0',
      gateway: '192.168.1.1',
      ...options
    };
    const {gateway, wifiInterface, inetInterface, password} = options;

    const args = [CMD_CREATE_AP, '-n', '--no-virt'];
    if (gateway) args.push(...['-g', gateway]);
    //...

    // wifi-interface
    args.push(wifiInterface);

    // interface-with-internet
    if (inetInterface) args.push(inetInterface);

    // access-point-name
    args.push(name);

    // password
    if (password) args.push(password);

    const p = this._process = spawn('bash', args);

    p.on('close', () => {
      this._started = false;
      this._killing = false;
      this._process = null;
      this.emit('close');
    });

    p.stdout.on('data', (data) => {
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf-8');
      }
      this.emit('stdout', data);
      if (/AP-ENABLED/.test(data)) {
        this._started = true;
        this.emit('started');
      }
    });

    p.stderr.on('data', (data) => {
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf-8');
      }
      this.emit('stderr', data);
    });
  }

  isStarted() {
    return this._started;
  }

  isKilling() {
    return this._killing;
  }

  isKilled() {
    return !this._process;
  }

  kill() {
    if (this._process && !this._killing) {
      return new Promise(resolve => {
        this.once('close', () => resolve());
        this._killing = true;
        this._process.kill();
      });
    }
    return Promise.resolve();
  }

}

export default AP;
