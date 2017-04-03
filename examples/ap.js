"use strict";

const iwman = require('..');

const process = iwman.createAP('iwman');

process.on('stdout', data => output(data, console.log));
process.on('stderr', data => output(data, console.error));

process.on('started', () => {
  console.log('-- Started');
});

process.on('close', () => {
  console.log('-- Closed');
});

function output(data, log) {
  data.trim().split(/[\n\r]/).forEach(line => log(`[ap] ${line}`));
}

function cleanup(signal) {
  console.log(signal);
  process.kill();
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('exit', () => cleanup('exit'));
