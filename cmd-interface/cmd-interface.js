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
const scalable = 'scalable/';
const cmdTopic = scalable + 'cmd/';

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

// Recursive function reading console input for TopicName
function readConsoleInput() {
    var cont = true;
    rl.question('enter device name to send the cmd to:\r\n', (destinationDeviceName) => {
        switch (destinationDeviceName) {
            case 'bp':
                destinationDeviceName = 'blood-pressure-sensor';
                break;
            case 'ecg':
                destinationDeviceName = 'ecg-sensor';
                break;
            case 'temp':
                destinationDeviceName = 'body-temperature-sensor';
                break;
            case 'heart':
                destinationDeviceName = 'heart-beat-sensor';
                break;
            case 'insulin':
                destinationDeviceName = 'insulin-sensor';
                break;
            case 'la':
                destinationDeviceName = 'lactic-acid-sensor';
                break;
            case 'ph':
                destinationDeviceName = 'ph-value-sensor';
                break;
            case 'pulse':
                destinationDeviceName = 'pulse-oximeter-sensor';
                break;
            case 'resp':
                destinationDeviceName = 'respirratory-monitor-sensor';
                break;
            default:
                console.log('incorrect sensor name type again!');
                cont = false;
                break;
        }
        if (cont) {
            readMessage(destinationDeviceName);
        }
    });
}

// Recursive function reading console input for message
function readMessage(destinationDeviceName) {
    var publish = true;
    rl.question('enter the cmd to send to ' + destinationDeviceName + ':\r\n', function (message) {
        // Calling function to publish to IoT Topic
        switch (message) {
            case 'kill':
            case 'stop':
                message = 'kill';
                console.log('killing node ' + destinationDeviceName + '!');
                break;
            case 'restart':
            case 'reset':
                message = 'restart';
                console.log('restarting the node ' + destinationDeviceName + '!');
                break;
            case 'sleep':
            case 'pause':
                message = 'pause';
                console.log('putting the ' + destinationDeviceName + ' to deep sleep / pausing it');
                break;
            case 'start':
            case 'wake':
                message = 'start';
                console.log('starting / waking up the ' + destinationDeviceName + ' from deep sleep');
                break;
            case 'emergency':
            case 'eme':
                message = 'emergency';
                console.log('updating the duty cycle of ' + destinationDeviceName + ' to send constant updates');
                break;
            case 'normal':
                message = 'normal';
                console.log('updating the duty cycle of ' + destinationDeviceName + ' to work as usual');
                break;
            case 'plugin':
            case 'charge':
                message = 'plugin';
                console.log('hard charging the ' + destinationDeviceName);
                break;
            case 'letdie':
            case 'unplug':
            case 'discharge':
                message = 'unplug';
                console.log('setting ' + destinationDeviceName + ' to not charge and die');
                break;
            default:
                console.log('incorrect cmd please enter again!');
                publish = false;
                break;
        }
        if (publish) {
            publishToIoTTopic(cmdTopic + destinationDeviceName, message);
        }
        readConsoleInput();
    });
}

// Function to publish payload to IoT topic
function publishToIoTTopic(topic, payload) {
    // Publish to specified IoT topic using device object that you created
    device.publish(topic, payload);
}

device.on('connect', function () {
    // Start reading from the console
    readConsoleInput();
}); 