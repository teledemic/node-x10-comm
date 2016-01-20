var expect = require("chai").expect;
var mockery = require("mockery");

var VALID_PORT_NAME = "COM2";

var MOCK_PORTS = [
	{ comName: "COM3", manufacturer: "FakeCo" },
	{ comName: "COM2", manufacturer: "FakeCo" }
];

// Weird mockup of a serial port since travis-ci doesn't provide any to test on
// Mostly dumb but tests double opens
var mockserial = {
	openPorts: [],
	list: function (callback) {
		callback(null, MOCK_PORTS);
	},
	SerialPort: function (comName, opts, immediate, callback) {
		var self = this;
		var opened = false;
		self.path = comName;
		self.set = function (options, callback) {
			callback();
		};
		self.close = function (callback) {
			var index = mockserial.openPorts.indexOf(self.path);
			if (index > -1) {
				mockserial.openPorts.splice(index, 1);
			}
			self.opened = false;
			self.path = null;
			callback();
		};
		self.open = function (callback) {
			if (!self.opened) {
				var conflict = false;
				mockserial.openPorts.forEach(function (port) {
					if (port === self.path) {
						conflict = true;
					}
				});
				if (!conflict) {
					MOCK_PORTS.forEach(function (port) {
						if (port.comName === self.path) {
							self.opened = true;
						}
					});
					if (self.opened) {
						mockserial.openPorts.push(self.path);
						callback();
					} else {
						callback(new Error(self.path + " is not in the list of available ports"));
					}
				} else {
					callback(new Error(self.path + " is already open"));
				}
			} else {
				callback(new Error("Tried to reopen a device that is already open"));
			}
		};
		if (immediate) {
			process.nextTick(function () {
				self.open(callback);
			});
		}
	}
};

var x10;

describe("node-x10-comm", function () {
	// Detect if the test system has any serial port hardware. If it doesn't, use a mocked port
	before(function (done) {
		var serialport = require("serialport");
		mockery.registerMock("serialport", mockserial);
		mockery.registerAllowable("../index.js");
		serialport.list(function (err, ports) {
			if (err || !ports || ports.length === 0 || !ports[0].comName) {
				mockery.enable();
				console.log("No comm ports detected - using mocked serial port");
			} else {
				VALID_PORT_NAME = ports[0].comName;
				console.log("Comm ports detected - using " + VALID_PORT_NAME);
			}
			x10 = require("../index.js");
			done();
		});
	});

	after(function (){
		mockery.disable();
	});

	this.timeout(5000);
	describe("#listPorts()", function () {
		it("should return an array of ports", function (done) {
			this.slow(300);
			x10.listPorts(function (ports) {
				expect(ports).to.be.an("array");
				if (ports.length > 0) {
					expect(ports[0]).to.have.property("comName")
						.that.is.a("string");
					expect(ports[0]).to.have.property("manufacturer")
						.that.is.a("string");
				}
				done();
			}, done);
		});
	});
	describe("#device()", function () {
		describe("#close()", function () {
			it("should free up port", function (done) {
				this.slow(1100);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.close(function () {
						device.open(VALID_PORT_NAME, function () {
							device.close(function () {
								done();
							}, done);
						}, done);
					}, done);
				}, done);
			});
		});
		describe("#open()", function () {
			it("should fail on invalid port name", function (done) {
				var device = x10.device();
				device.open("my_bad_portname", function () {
					done("open succeeded on bad port name");
				}, function (err) {
					done();
				});
			});
			it("should succeed on valid port name", function (done) {
				this.slow(600);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.close(function () {
						done();
					}, done);
				}, done);
			});
			it("should auto-close old port before opening new", function (done) {
				this.slow(1100);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.open(VALID_PORT_NAME, function () {
						device.close(function () {
							done();
						}, done);
					}, done);
				}, done);
			});
		});
		describe("#sendCommand()", function () {
			it("should be able to turn on & off all house-codes and modules", function (done) {
				this.slow(3200);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					function incrementCommand(counter) {
						if (counter === 16) {
							device.close(function () {
								done();
							}, done);
						} else {
							device.sendCommand(counter, counter, 1, function () {
								device.sendCommand(counter, counter, 0, function () {
									counter++;
									incrementCommand(counter);
								}, done);
							}, done);
						}
					}
					incrementCommand(0);
				}, done);
			});
			it("should fail on invalid parameters", function (done) {
				this.slow(600);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.sendCommand(16, 0, 1, function () {
						done("sent with invalid house");
					}, function (err) {
						device.sendCommand(0, 16, 1, function () {
							done("sent with invalid module");
						}, function (err) {
							done();
						});
					});
				}, done);
			});
		});
	});
});
