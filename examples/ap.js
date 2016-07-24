"use strict";

const iwman = require('..');

const ap = iwman.startAP('WIFI-MAN');

ap.on('stdout', (data) => output(data, console.log));
ap.on('stderr', (data) => output(data, console.error));

ap.on('close', () => {
  console.log('Closed');
});

function output(data, log) {
  data.trim().split(/[\n\r]/).forEach(line => log(`[ap] ${line}`));
}

function cleanup() {
  ap.kill()
;}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
