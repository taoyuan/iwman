"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.IWMan = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _childProcessPromise = require('child-process-promise');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _iwconfig = require('wireless-tools/iwconfig');

var _iwconfig2 = _interopRequireDefault(_iwconfig);

var _ifconfig = require('wireless-tools/ifconfig');

var _ifconfig2 = _interopRequireDefault(_ifconfig);

var _iwlist = require('wireless-tools/iwlist');

var _iwlist2 = _interopRequireDefault(_iwlist);

var _wpaSupplicantConf = require('wpa-supplicant-conf');

var _ap = require('./ap');

var _ap2 = _interopRequireDefault(_ap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WPA_SUPPLICANT_CONF_FILE = '/etc/wpa_supplicant/wpa_supplicant.conf';

var IWMan = function (_EventEmitter) {
  _inherits(IWMan, _EventEmitter);

  function IWMan() {
    _classCallCheck(this, IWMan);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(IWMan).call(this));

    _this.mode = function (intf) {
      return _this.status(intf).then(function (status) {
        if (status.ipv4_address && status.ssid) {
          return 'wifi';
        } else {
          return 'unknown';
        }
      });
    };

    _this.isWiFiMode = function (intf) {
      return _this.mode(intf).then(function (mode) {
        return mode === 'wifi';
      });
    };

    _this.wpa = function () {
      return new _wpaSupplicantConf.WPAConf(WPA_SUPPLICANT_CONF_FILE);
    };

    _this.detect = function () {
      function check(result) {
        var stdout = result.stdout;


        if (stdout.indexOf('802.11') >= 0) {
          return '802.11';
        } else if (stdout.toUpperCase().indexOf('WLAN') >= 0) {
          return 'WLAN';
        }
        return false;
      }

      return _bluebird2.default.filter(['lsusb', 'iwconfig'], which).then(function (cmds) {
        return new _bluebird2.default(function (resolve) {
          var index = 0;

          function next() {
            var cmd = cmds[index++];
            if (!cmd) {
              return resolve(null);
            }
            (0, _childProcessPromise.exec)(cmd).then(check).then(function (found) {
              if (found) return resolve({ device: found });
              next();
            }).catch(next);
          }

          next();
        });
      }).then(function (data) {
        _this.emit('detect', data);
        return data;
      });
    };

    _this.status = function (intf) {
      intf = intf || 'wlan0';
      return _bluebird2.default.all([_bluebird2.default.fromCallback(function (cb) {
        return _iwconfig2.default.status(intf, cb);
      }), _bluebird2.default.fromCallback(function (cb) {
        return _ifconfig2.default.status(intf, cb);
      })]).then(function (results) {
        var status = Object.assign.apply(Object, [{}].concat(_toConsumableArray(results)));
        _this.emit('status', status);
        return status;
      });
    };

    _this.ifup = function (intf) {
      intf = intf || 'wlan0';
      var cmd = 'ifup ' + intf + ' up';
      return (0, _childProcessPromise.exec)(cmd).then(function () {
        console.log("ifup " + intf + " successful...");
        _this.emit('ifup');
      });
    };

    _this.ifdown = function (intf) {
      intf = intf || 'wlan0';
      return (0, _childProcessPromise.exec)('ifdown ' + intf + ' down').then(function () {
        console.log("ifdown " + intf + " successful...");
        _this.emit('ifdown');
      });
    };

    _this.ifreboot = function (intf) {
      intf = intf || 'wlan0';
      return _this.ifdown(intf).then(function () {
        return _this.ifup(intf);
      }).then(function () {
        console.log("ifreboot " + intf + " successful...");
        _this.emit('ifreboot');
      });
    };

    _this.scan = function (options) {
      options = options || 'wlan0';
      return new _bluebird2.default.fromCallback(function (cb) {
        return _iwlist2.default.scan(options, cb);
      }).then(function (networks) {
        console.log("scan " + intf + " successful...");
        _this.emit('scan', networks);
        return networks;
      });
    };

    _this.supplicants = function () {
      return _this.wpa().nets;
    };

    _this.addSupplicant = function (creds) {
      var ssid = creds.ssid;
      var password = creds.password;
      var auth = creds.auth;
      var encryption = creds.encryption;
      var security = creds.security;
      var hidden = creds.hidden;

      var others = _objectWithoutProperties(creds, ['ssid', 'password', 'auth', 'encryption', 'security', 'hidden']);

      var options = _extends({}, others);
      if (encryption && auth === 'PSK') {
        options.key_mgmt = 'WPA-PSK';
        options.proto = security === 'WPA2' ? 'WPA2' : 'WPA';
      } else {
        options.key_mgmt = 'NONE';
        if (auth === 'WEP' || encryption && !auth) {
          options.wep_tx_keyidx = 0;
          options.wep_key0 = password;
        }
      }
      if (hidden) {
        options.scan_ssid = 1;
      }

      return _this.wpa().addAndSave(ssid, password, options);
    };

    _this.removeSupplicant = function (ssid) {
      return _this.wpa().removeAndSave(ssid);
    };

    _this.startAP = function (name, options) {
      return new _ap2.default(name, options);
    };

    _this.stopAP = function (intf) {
      return _ap2.default.stop(intf);
    };

    return _this;
  }

  return IWMan;
}(_events2.default);

function which(cmd) {
  return (0, _childProcessPromise.exec)('which ' + cmd).then(function (result) {
    return result.stdout;
  }).catch(function () {
    return false;
  });
}

exports.default = new IWMan();
exports.IWMan = IWMan;