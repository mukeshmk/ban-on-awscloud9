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
    rl.question('Enter device name to send the message to:\r\n', (destinationDeviceName) => {
        if(destinationDeviceName == 'temp') {
            destinationDeviceName = 'body-temperature-sensor'
        }
        pubTopic = 'scalable/sink/' + destinationDeviceName;
        readMessage();
    });
}

// Recursive function reading console input for message
function readMessage() {
    rl.question('Enter a message to send to ' + pubTopic + ':\r\n', function (message) {
        // Calling function to publish to IoT Topic
        publishToIoTTopic(pubTopic, message);
        readConsoleInput();
    });
}

// Function to publish payload to IoT topic
function publishToIoTTopic(topic, payload) {
    // Publish to specified IoT topic using device object that you created
    device.publish(topic, payload);
}

device.on('connect', function() {
    // Start reading from the console
    readConsoleInput();
});