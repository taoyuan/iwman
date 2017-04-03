"use strict";

const assert = require('assert');
const fs = require('fs');
const {spawn} = require('child_process');
const Process = require('./process');

const CMD_CREATE_AP = `${__dirname}/../../create_ap/create_ap`;

/**
 *
 * @param {String|Object} name
 * @param {Object} [options]
 * @return {Process}
 */
function create(name, options) {
  assert(fs.existsSync(CMD_CREATE_AP), '"create_ap" has not been found in ' + CMD_CREATE_AP);
  if (typeof name !== 'string') {
    options = name;
    name = null;
  }
  options = Object.assign({
    wlan: 'wlan0',
    gateway: '10.0.0.1',
  }, options);
  name = name || options.name;
  const {gateway, wlan, eth, password} = options;

  const args = [CMD_CREATE_AP, '-n', '--no-virt'];
  if (gateway) args.push(...['-g', gateway]);
  //...

  // wifi-interface
  args.push(wlan);

  // interface-with-internet
  if (eth) args.push(eth);

  // access-point-name
  args.push(name);

  // password
  if (password) args.push(password);

  return new Process(spawn('bash', args));
}

module.exports = {
  create
};
