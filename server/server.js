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
const scalable = 'scalable/';
const serverTopic = scalable + 'sink/';
const dump = '/dump';

var prevCoord = {
    "sink" : [0, 0, 'active'],
    "blood-pressure-sensor" : [0, 0, 'sleep'],
    "body-temperature-sensor" : [0, 0, 'sleep'],
    "heart-beat-sensor" : [0, 0, 'sleep'],
    "insulin-sensor" : [0, 0, 'sleep'],
    "ph-value-sensor" : [0, 0, 'sleep'],
    "pulse-oximeter-sensor" : [0, 0, 'sleep']
}

// Use the awsIoT library to create device object using the constants created before
const device = awsIoT.device({
   keyPath: keyPath,
  certPath: certPath,
    caPath: caPath,
  clientId: clientId,
      host: host
});

// Function to publish payload to IoT topic
function publishToTopic(topic, payload) {
    // Publish to specified IoT topic using device object that you created
    device.publish(topic, payload);
}

device.on('connect', function() {
    console.log('Connected to AWS IoT as Server!');
    device.subscribe(serverTopic);
});

function nearestNode(device, x, y, status) {
    var nearestPeer = 'sink';
    prevCoord[device] = [x, y, status];
    var dist = 0;
    var minDist = Infinity;
    for(var dev in prevCoord) {
        if(dev != device) {
            if(prevCoord[dev][2] == 'sleep' || prevCoord[dev][2] == 'dead') {
                continue;
            }
            dist = Math.sqrt(Math.pow((prevCoord[dev][0] - x), 2) + Math.pow((prevCoord[dev][1] - y), 2));
            if(minDist > dist) {
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
    var deviceBattery = jMessage['battery'];
    var deviceStatus = jMessage['status'];
    var deviceX = jMessage['x'];
    var deviceY = jMessage['y'];

    var nearestPeer = 'sink';

    if(deviceStatus == 'dead' || deviceStatus == 'sleep') {
        prevCoord[device] = [prevCoord[device][0], prevCoord[device][1], deviceStatus];
        return nearestPeer;
    } else {
        prevCoord[device] = [deviceX, deviceY, deviceStatus];
    }

    if(deviceBattery <= 5) {
        nearestPeer = nearestNode(device, deviceX, deviceY, deviceStatus);
        console.log('Message Recevied from ' + device + ' and nearestNode: ' + nearestPeer);

        publishToTopic(scalable + device + dump, nearestPeer);
    }
});
