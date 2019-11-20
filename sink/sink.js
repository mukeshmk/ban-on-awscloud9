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
const sinkTopic = scalable + 'sink/';

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
    console.log('Connected to AWS IoT as Sink!');
    device.subscribe(sinkTopic);
});

device.on('message', function(topic, message) {
    var jMessage = JSON.parse(message);

    var device = jMessage['device'];
    var deviceBattery = jMessage['battery'];
    var deviceX = jMessage['x'];
    var deviceY = jMessage['y'];
    var deviceDateTime = jMessage['datetime'];

    let msg = {
        'sendMail': true
    };

    var sendMail = false;
    console.log('Message Recevied from ' + device);
    if(device == 'body-temperature-sensor') {
        var temperature = jMessage['temperature'];
        if(temperature > 102) {
            msg['metric'] = 'temperature';
            msg['metricValue'] = temperature.toString();
            msg['device'] = device;
            sendMail = true;
        }
    } else if(device == 'heart-beat-sensor') {
        var systole = jMessage['systole'];
        var distole = jMessage['distole'];
        var beats = jMessage['beats'];
        if(beats > 80) {
            msg['metric'] = 'beats';
            msg['metricValue'] = beats.toString();
            msg['device'] = device;
            sendMail = true;
        }
    } else if(device == 'insulin-sensor') {
        var glucoseLevel = jMessage['glucose-level'];
        if(glucoseLevel > 6.5) {
            msg['metric'] = 'glucose-level';
            msg['metricValue'] = glucoseLevel.toString();
            msg['device'] = device;
            sendMail = true;
        }
    }

    if(deviceBattery <= 25.0) {
        publishToTopic(sinkTopic + device, 'true');
    } else if(deviceBattery >= 100.0) {
        publishToTopic(sinkTopic + device, 'false');
    }

    // dev mode ON!!
    if(sendMail && false) {
        publishToTopic(scalable + 'email', JSON.stringify(msg));
    }
});
