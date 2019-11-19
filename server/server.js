// Require readline for input from the console
const readline = require('readline');

// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

// Fetch the deviceName from the current folder name
const deviceName = __dirname.split('/').pop();

// Build constants
const keyPath = 'private.pem.key';
const certPath = 'certificate.pem.crt';
const caPath = '/home/ec2-user/environment/root-CA.crt';
const clientId = deviceName;
const host = endpointFile.endpointAddress;

// publish topic name
var pubTopic = '';
const scalable = 'scalable/';
const serverTopic = scalable + 'sink/';

var prevCoord = {
    "body-temperature-sensor" : [0, 0, 'active'],
    "heart-beat-sensor" : [0, 0, 'dead'],
    "insulin-sensor" : [0, 0, 'sleep']
}

// Use the awsIoT library to create device object using the constants created before
const device = awsIoT.device({
   keyPath: keyPath,
  certPath: certPath,
    caPath: caPath,
  clientId: clientId,
      host: host
});

// Interface for console input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to publish payload to IoT topic
function publishToSensorTopic(topic, payload) {
    // Publish to specified IoT topic using device object that you created
    device.publish(topic, payload);
}

device.on('connect', function() {
    console.log('Connected to AWS IoT as Server!');
    device.subscribe(serverTopic);
});

function nearestNode(device, x, y, status) {
    var nearestPeer = 'none';
    prevCoord[device] = [x, y, status];
    var dist = 0;
    var minDist = 0;
    for(var dev in prevCoord) {
        if(dev != device) {
            if(prevCoord[dev][2] != 'active') {
                continue;
            }
            dist = Math.pow((prevCoord[dev][0] - x), 2) + Math.pow((prevCoord[dev][1] - y), 2);
            if(minDist < dist) {
                minDist = dist;
                nearestPeer = dev;
            }
        }
    }
    return nearestPeer;
}

device.on('message', function(topic, message) {
    var jMessage = JSON.parse(message);

    var device = jMessage['device'];
    var deviceStatus = jMessage['status'];
    var deviceX = jMessage['x'];
    var deviceY = jMessage['y'];

    var nearestPeer = 'none';

    if(deviceStatus == 'dead') {
        prevCoord[device] = [prevCoord[device][0], prevCoord[device][1], deviceStatus];
        return nearestPeer;
    }

    if(device == 'body-temperature-sensor') {
        nearestPeer = nearestNode(device, deviceX, deviceY, deviceStatus);
    } else if(device == 'heart-beat-sensor') {
        nearestPeer = nearestNode(device, deviceX, deviceY, deviceStatus);
    } else if(device == 'insulin-sensor') {
        nearestPeer = nearestNode(device, deviceX, deviceY, deviceStatus);
    }
    console.log('Message Recevied from ' + device + ' and nearestNode: ' + nearestPeer);
});
