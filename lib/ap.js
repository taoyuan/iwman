"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _childProcessPromise = require('child-process-promise');

var _child_process = require('child_process');

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CMD_CREATE_AP = __dirname + '/../create_ap/create_ap';

var AP = function (_EventEmitter) {
  _inherits(AP, _EventEmitter);

  _createClass(AP, null, [{
    key: 'stop',
    value: function stop(intf) {
      intf = intf || 'wlan0';
      return (0, _childProcessPromise.exec)('bash ' + CMD_CREATE_AP + ' --stop ' + intf);
    }
  }]);

  function AP(name, options) {
    _classCallCheck(this, AP);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AP).call(this));

    _this._process = null;
    _this._killing = false;

    _this._create(name, options);
    return _this;
  }

  _createClass(AP, [{
    key: '_create',
    value: function _create(name, options) {
      var _this2 = this;

      (0, _assert2.default)(name, '"name" is required');
      (0, _assert2.default)(_fs2.default.existsSync(CMD_CREATE_AP), '"create_ap" has not been found in ' + CMD_CREATE_AP);
      options = _extends({
        wifiInterface: 'wlan0',
        gateway: '192.168.1.1'
      }, options);
      var _options = options;
      var gateway = _options.gateway;
      var wifiInterface = _options.wifiInterface;
      var inetInterface = _options.inetInterface;
      var password = _options.password;


      var args = [CMD_CREATE_AP, '-n', '--no-virt'];
      if (gateway) args.push.apply(args, ['-g', gateway]);
      //...

      // wifi-interface
      args.push(wifiInterface);

      // interface-with-internet
      if (inetInterface) args.push(inetInterface);

      // access-point-name
      args.push(name);

      // password
      if (password) args.push(password);

      var p = this._process = (0, _child_process.spawn)('bash', args);
      p.on('close', function () {
        _this2._killing = false;
        _this2._process = null;
        _this2.emit('close');
      });
      p.stdout.on('data', function (data) {
        if (Buffer.isBuffer(data)) {
          data = data.toString('utf-8');
        }
        _this2.emit('stdout', data);
      });

      p.stderr.on('data', function (data) {
        if (Buffer.isBuffer(data)) {
          data = data.toString('utf-8');
        }
        _this2.emit('stderr', data);
      });
    }
  }, {
    key: 'isKilling',
    value: function isKilling() {
      return this._killing;
    }
  }, {
    key: 'isKilled',
    value: function isKilled() {
      return !this._process;
    }
  }, {
    key: 'kill',
    value: function kill() {
      if (this._process && !this._killing) {
        this._killing = true;
        this._process.kill();
        return true;
      }
    }
  }]);

  return AP;
}(_events2.default);

exports.default = AP;
module.exports = exports['default'];