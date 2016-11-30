var x10 = require('node-x10-comm');
var comm_name = "COM3";
var house_code = 2; //C
var module_code = 0; //01

x10.listPorts(function (ports) {
  console.log("Available ports:");
  console.log(ports);
}, function (err) {
  console.log("Unable to enumerate available ports");
});

var device = x10.device();
device.open(comm_name, function () {
  device.sendCommand(house_code, module_code, 1, function () {
    console.log("Turned on device C01");
  }, function (err) {
    console.log("Unable to send to device");
  });
}, function (err) {
  console.log(err);
});
