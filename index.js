var serialport = require("serialport");

var BIT_LENGTH_MS = 1;
var DEVICE_BOOT_TIME_MS = 500;

var HEADER = [1,1,0,1,0,1,0,1, 1,0,1,0,1,0,1,0];
var FOOTER = [1,0,1,0,1,1,0,1];
var HOUSES = [
	[0,1,1,0,0], //A
	[0,1,1,1,0], //B
	[0,1,0,0,0], //C
	[0,1,0,1,0], //D
	[1,0,0,0,0], //E
	[1,0,0,1,0], //F
	[1,0,1,0,0], //G
	[1,0,1,1,0], //H
	[1,1,1,0,0], //I
	[1,1,1,1,0], //J
	[1,1,0,0,0], //K
	[1,1,0,1,0], //L
	[0,0,0,0,0], //M
	[0,0,0,1,0], //N
	[0,0,1,0,0], //O
	[0,0,1,1,0], //P
];
var MODULES = [
	[0,0,0, 0,0,0,0,0,0,0,0], //01
	[0,0,0, 0,0,0,1,0,0,0,0], //02
	[0,0,0, 0,0,0,0,1,0,0,0], //03
	[0,0,0, 0,0,0,1,1,0,0,0], //04
	[0,0,0, 0,1,0,0,0,0,0,0], //05
	[0,0,0, 0,1,0,1,0,0,0,0], //06
	[0,0,0, 0,1,0,0,1,0,0,0], //07
	[0,0,0, 0,1,0,1,1,0,0,0], //08
	[1,0,0, 0,0,0,0,0,0,0,0], //09
	[1,0,0, 0,0,0,1,0,0,0,0], //10
	[1,0,0, 0,0,0,0,1,0,0,0], //11
	[1,0,0, 0,0,0,1,1,0,0,0], //12
	[1,0,0, 0,1,0,0,0,0,0,0], //13
	[1,0,0, 0,1,0,1,0,0,0,0], //14
	[1,0,0, 0,1,0,0,1,0,0,0], //15
	[1,0,0, 0,1,0,1,1,0,0,0], //16
];

exports = {
	listPorts: function(callback, errcallback) {
		serialport.list(function(err, ports) {
			if (err) {
				errcallback(err);
			} else {
				var ret = [];
				ports.forEach(function(port) {
					ret.push({
						comName: port.comName,
						manufacturer: port.manufacturer,
					});
				});				
				callback(ret);
			}
		});
	},
	device: function(comName) {
		var dev = {
			serialport: new serialport.SerialPort(comName, {baudrate: 9600}, false),
			tick: function(bitqueue, callback, errcallback) {
				if (bitqueue.length > 0) {
					var lines;
					if (bitqueue.shift() === 1) {
						lines = {rts: true, dtr: false};
					} else {
						lines = {rts: false, dtr: true};
					}
					dev.serialport.set(lines, function(err, result) {
						if (!err) {
							setTimeout(dev.tock, BIT_LENGTH_MS, bitqueue, callback, errcallback);
						} else {
							errcallback(err);
						}
					});
				} else {
					//Done sending
					callback();
				}
			},
			tock: function(bitqueue, callback, errcallback) {
				dev.serialport.set({rts: true, dtr: true}, function(err, result) {
					if (!err) {
						setTimeout(dev.tick, BIT_LENGTH_MS, bitqueue, callback, errcallback);
					} else {
						errcallback(err);
					}
				});
			},
			open: function(callback, errcallback) {
				dev.serialport.open(function(err) {
					if (err) {
						errcallback(err);
					} else {
						//Give the firecracker 1/2 sec to warm up
						setTimeout(callback, DEVICE_BOOT_TIME_MS);
					}
				});
			},
			sendCommand: function(house, module, onoff, callback, errcallback) {
				var command = HOUSES[house].concat(MODULES[module]);
				if (!onoff) command[10] = 1;
				var bits = HEADER.concat(command).concat(FOOTER);
				dev.tick(bits, callback, errcallback);
			}
		};
		return dev;
	},
};
