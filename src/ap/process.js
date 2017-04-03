"use strict";

const PromiseA = require('bluebird');
const EventEmitter = require('events');

class Process extends EventEmitter {

  constructor(handler) {
    super();

    this._handler = handler;

    handler.on('close', () => {
      this._started = false;
      this._killing = false;
      this._handler = null;
      this.emit('close');
    });

    handler.stdout.on('data', (data) => {
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf-8');
      }
      this.emit('stdout', data);
      if (/AP-ENABLED/.test(data)) {
        this._started = true;
        this.emit('started');
      }
    });

    handler.stderr.on('data', (data) => {
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf-8');
      }
      this.emit('stderr', data);
    });
  }

  kill() {
    return new PromiseA(resolve => {
      if (this._handler) {
        this.once('close', resolve);
        if (!this._killing) {
          this._killing = true;
          this._handler.kill();
        }
      } else {
        resolve();
      }
    });
  }
}

module.exports = Process;
