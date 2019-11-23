// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');
const sensor = require('./sensor.js');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

// Fetch the deviceName from the folder name
const deviceName = __dirname.split('/').pop();

// Create the thingShadow object with argument data
const device = awsIoT.device({
    keyPath: 'private.pem.key',
    certPath: 'certificate.pem.crt',
    caPath: '/home/ec2-user/environment/root-CA.crt',
    clientId: deviceName,
    host: endpointFile.endpointAddress
});

var battery;
var status;
var isCharging = false;
var isUnplugged = false;
var isKilled = false;
var isTimeOutOverridden = false;

// Function that gets executed when the connection to IoT is established
device.on('connect', function () {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    status = 'active';

    // subscribing to 'scalable/sink/body-temperature-sensor' for charger notifications.
    device.subscribe(sensor.sinkTopic + deviceName);
    // subscribing to 'scalable/body-temperature-sensor/dump' for notficiation about which node to dump too.
    device.subscribe(sensor.scalable + deviceName + sensor.dump);
    // subscribing to 'scalable/body-temperature-sensor/dump/receive' for notficiation about being the dump node.
    device.subscribe(sensor.scalable + deviceName + sensor.dumprev);
    // subscribing to 'scalable/server/body-temperature-sensor' for info about the routing.
    device.subscribe(sensor.serverTopic + deviceName);
    // subscribing to 'scalable/cmd/body-temperature-sensor' for interaction with the command line interface.
    device.subscribe(sensor.cmdTopic + deviceName);

    // Start the publish loop
    sensor.infiniteLoopPublish(device, deviceName, status, battery, isCharging);
});

device.on('message', function (topic, message) {
    console.log("Message Received on Topic: " + topic + ": " + message);
    if (sensor.sinkTopic + deviceName == topic) {
        if (message == 'true') {
            isCharging = true;
            isUnplugged = false;
        } else if (message == 'false') {
            isCharging = false;
            isUnplugged = false;
        } else {
            console.log('Unknown value for charger status! not modifying the exisiting value!');
        }
    } else if (sensor.scalable + deviceName + sensor.dump == topic) {
        console.log('Battery about to die dumping local data to nearest node!: ' + message);
        sensor.publishToTopic(device, sensor.scalable + message + sensor.dumprev, deviceName);
    } else if (sensor.scalable + deviceName + sensor.dumprev == topic) {
        console.log('Recived data dump from ' + message + ' as it\'s battery is about to die');
    } else if (sensor.serverTopic + deviceName == topic) {
        var jMessage = JSON.parse(message);
        var route = jMessage['route'];
        var srcSensor = jMessage['src-sensor'];
        var destSensor = jMessage['dest-sensor'];
        if (status == 'active' || status == 'awake') {
            console.log('Sending sensor telemetry data to BAN\'s ' + destSensor + ' for ' + srcSensor + ' via: ' + route);
        }
    } else if (sensor.cmdTopic + deviceName == topic) {
        switch(message.toString()) {
            case 'kill':
                console.log('killing node ' + deviceName + '!');
                battery = -1;
                status = 'dead';
                isKilled = true;
                break;
            case 'restart':
                console.log('restarting the node ' + deviceName + '!');
                battery = 100;
                status = 'active';
                isKilled = false;
                break;
            case 'pause':
                console.log('putting the ' + deviceName + ' to deep sleep');
                status = 'sleep';
                isKilled = true;
                break;
            case 'start':
                console.log('waking the ' + deviceName + ' from deep sleep');
                status = 'active';
                isKilled = false;
                break;
            case 'emergency':
                console.log('updating the duty cycle of ' + deviceName + ' to send constant updates');
                isTimeOutOverridden = true;
                break;
            case 'normal':
                console.log('updating the duty cycle of ' + deviceName + ' to work as usual');
                isTimeOutOverridden = false;
                break;
            case 'plugin':
                console.log('hard charging the ' + deviceName);
                isCharging = true;
                isUnplugged = false;
                break;
            case 'unplug':
                console.log('unplugging the ' + deviceName +' from charging');
                isUnplugged = true;
                isCharging = false;
                break;
            default:
                console.log('incorrect cmd please enter again!');
                break;
        }
    }
});
