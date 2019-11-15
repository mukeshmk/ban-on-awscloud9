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

var battery;
var isCharging = false;
// Function that gets executed when the connection to IoT is established
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    // Start the publish loop
    infiniteLoopPublish();
});

// Function to update battery status
function updateBatteryStatus(dischargeRate, isCharging) {
    if(isCharging) {
        battery+=1.0;
    } else {
        battery-=dischargeRate;
    }
}

// Function sending sensor telemetry data every 5 seconds
function infiniteLoopPublish() {
    var timeOut;
    var topic = "scalable/body-temperature-sensor";
    console.log('Sending sensor telemetry data to AWS IoT for ' + deviceName);
    // Publish sensor data to scalable/body-temperature-sensor topic with getSensorData
    console.log('Battery of ' + deviceName + ' is ' + battery + '%');
    if(battery > 25) {
        timeOut = 25000;
    } else if(battery < 25) {
        timeOut = 5000;
    }
    device.publish(topic, JSON.stringify(getSensorData(deviceName)));
    updateBatteryStatus(0.05, isCharging);
    // Start Infinite Loop of Publish every "timeOut" seconds
    setTimeout(infiniteLoopPublish, timeOut);
}

// Function to create a random float between minValue and maxValue
function randomFloatBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}

// Generate random sensor data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        'temperature': randomFloatBetween(1, 101)
    };
    
    const device_data = { 
        'body-temperature-sensor': {
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