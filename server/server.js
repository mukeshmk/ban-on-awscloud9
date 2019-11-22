// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

const dijkstra = require('./dijkstras.js');

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
const serverTopic = scalable + 'server/';
const sinkTopic = scalable + 'sink/';
const nearestSensor = 'nearestSensor/';

var topology = {};
topology['sink'] = {};
topology['blood-pressure-sensor'] = {};
topology['body-temperature-sensor'] = {};
topology['heart-beat-sensor'] = {};
topology['insulin-sensor'] = {};
topology['ph-value-sensor'] = {};
topology['pulse-oximeter-sensor'] = {};
topology['ecg-sensor'] = {};
topology['lactic-acid-sensor'] = {};
topology['respirratory-monitor-sensor'] = {};

var prevCoord = {
    "sink": [0, 0, 'active'],
    "blood-pressure-sensor": [0, 0, 'active'],
    "ecg-sensor": [0, 0, 'active'],
    "body-temperature-sensor": [0, 0, 'active'],
    "heart-beat-sensor": [0, 0, 'active'],
    "insulin-sensor": [0, 0, 'active'],
    "lactic-acid-sensor": [0, 0, 'active'],
    "ph-value-sensor": [0, 0, 'active'],
    "pulse-oximeter-sensor": [0, 0, 'active'],
    "respirratory-monitor-sensor": [0, 0, 'active']
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

device.on('connect', function () {
    console.log('Connected to AWS IoT as Server!');
    device.subscribe(serverTopic);
    device.subscribe(serverTopic + nearestSensor);
});


function constructGrapgh(device, x, y, status) {
    prevCoord[device] = [x, y, status];
    var dist = 0;
    for (var dev in prevCoord) {
        if (dev != device) {
            if (prevCoord[dev][2] == 'sleep' || prevCoord[dev][2] == 'dead') {
                continue;
            }
            dist = Math.sqrt(Math.pow((prevCoord[dev][0] - x), 2) + Math.pow((prevCoord[dev][1] - y), 2));
            topology[dev][device] = dist;
        }
    }
}

function nearestNode(device, x, y, status) {
    var nearestPeer = 'sink';
    prevCoord[device] = [x, y, status];
    var dist = 0;
    var minDist = Infinity;
    for (var dev in prevCoord) {
        if (dev != device) {
            if (prevCoord[dev][2] == 'sleep' || prevCoord[dev][2] == 'dead') {
                continue;
            }
            dist = Math.sqrt(Math.pow((prevCoord[dev][0] - x), 2) + Math.pow((prevCoord[dev][1] - y), 2));
            if (minDist > dist) {
                minDist = dist;
                nearestPeer = dev;
            }
        }
    }
    return nearestPeer;
}

device.on('message', function (topic, message) {
    var jMessage = JSON.parse(message);

    var device = jMessage['device'];
    var deviceStatus = jMessage['status'];
    var deviceX = jMessage['x'];
    var deviceY = jMessage['y'];

    var nearestPeer = 'sink';

    if (deviceStatus == 'dead' || deviceStatus == 'sleep') {
        prevCoord[device] = [prevCoord[device][0], prevCoord[device][1], deviceStatus];
        return nearestPeer;
    } else {
        prevCoord[device] = [deviceX, deviceY, deviceStatus];
    }

    if (serverTopic + nearestSensor == topic) {
        nearestPeer = nearestNode(device, deviceX, deviceY, deviceStatus);
        let msg = {};
        msg['src-sensor'] = device;
        msg['dest-sensor'] = nearestPeer;

        var jmsg = JSON.stringify(msg);
        publishToTopic(sinkTopic + nearestSensor, jmsg);
    } else if (serverTopic == topic) {
        constructGrapgh('sink', 0, 0, 'active');
        constructGrapgh(device, deviceX, deviceY, deviceStatus);

        var graph = dijkstra.findPath(topology, device);
        var route;
        if (graph['sink'] === undefined) {
            route = 'sink';
        } else {
            route = graph['sink'].toString().split(',');
        }

        let msg = {};
        msg['route'] = route;
        msg['src-sensor'] = device;
        msg['dest-sensor'] = 'sink';

        console.log('src-sensor: ' + device + ' dest-sensor: sink route: ' + route);

        publishToTopic(serverTopic + device, JSON.stringify(msg));
    }
});
