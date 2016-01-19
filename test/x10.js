var x10 = require("../index.js");
var expect = require("chai").expect;

var VALID_PORT_NAME = "COM1";

describe("x10", function () {
	this.timeout(5000);
	describe("#listPorts()", function () {
		it("should return an array of ports", function (done) {
			this.slow(300);
			x10.listPorts(function(ports) {
				console.log(ports);
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
					device.close(function() {
						device.open(VALID_PORT_NAME, function () {
							device.close(function() {
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
				}, function(err) {
					done();
				});
			});
			it("should succeed on valid port name", function (done) {
				this.slow(600);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.close(function() {
						done();
					}, done);
				}, done);
			});
			it("should auto-close old port before opening new", function (done) {
				this.slow(1100);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					device.open(VALID_PORT_NAME, function () {
						device.close(function() {
							done();
						}, done);
					}, done);
				}, done);
			});
		});
		describe("#sendCommand()", function () {
			it("should be able to turn on & off all house-codes and modules", function (done) {
				this.slow(3100);
				var device = x10.device();
				device.open(VALID_PORT_NAME, function () {
					function incrementCommand(counter) {
						if (counter === 16) {
							device.close(function() {
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
