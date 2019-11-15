// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Require crypto for random numbers generation
const crypto = require('crypto');

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

var battery = 100.0;
// Function that gets executed when the connection to IoT is established
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    // Start the publish loop
    infiniteLoopPublish();
});

// Function sending car telemetry data every 5 seconds
function infiniteLoopPublish() {
    console.log('Sending sensor telemetry data to AWS IoT for ' + deviceName);
    
    // Publish sensor data to edx/telemetry topic with getSensorData
    console.log('Battery of ' + deviceName + ' is ' + battery + '%');
    device.publish("scalable/heart-beat-sensor", JSON.stringify(getSensorData(deviceName)));

    battery-=0.005;
    // Start Infinite Loop of Publish every 5 seconds
    setTimeout(infiniteLoopPublish, 5000);
}

// Function to create a random float between minValue and maxValue
function randomIntBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}

// Generate random car data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        'systole': randomIntBetween(1, 101),
        'distole': randomIntBetween(101, 700),
        'beats': randomIntBetween(65, 75)
    };
    
    const device_data = { 
        'heart-beat-sensor': {
            'latitude':39.122229,
            'longitude':-77.133578
        }
    };
  
    message['battery'] = battery;
    message['latitude'] = device_data[deviceName].latitude;
    message['longitude'] = device_data[deviceName].longitude;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');
    
    return message;
}