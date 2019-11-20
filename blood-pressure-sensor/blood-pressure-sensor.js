// Require AWS IoT Device SDK
const awsIoT = require('aws-iot-device-sdk');

// Load the endpoint from file
const endpointFile = require('/home/ec2-user/environment/endpoint.json');

// Fetch the deviceName from the folder name
const deviceName = __dirname.split('/').pop();

// Topic names to subscribe too.
const scalable = 'scalable/';
const sinkTopic = scalable + 'sink/';
const dump = '/dump';
const dumprev = dump + '/receive';

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

// Function that gets executed when the connection to IoT is established
device.on('connect', function() {
    console.log('Connected to AWS IoT');
    battery = 100.0;
    status = 'active';

    // subscribing to 'scalable/sink/blood-pressure-sensor' for charger notifications.
    device.subscribe(sinkTopic + deviceName);
    // subscribling to 'scalable/blood-pressure-sensor/dump' for notficiation about which node to dump too.
    device.subscribe(scalable + deviceName + dump);
    // subscribling to 'scalable/blood-pressure-sensor/dump/receive' for notficiation about being the dump node.
    device.subscribe(scalable + deviceName + dumprev);

    // Start the publish loop
    infiniteLoopPublish();
});

// Function to update battery status
function updateBatteryStatus(dischargeRate, isCharging) {
    if(isCharging) {
        if(battery >= 100.0) {
            battery = 100;
            console.log('battery fully charged!');
        } else {
            status = 'active';
            battery+=1.0;
        }
    } else {
        if(status == 'dead') {
            return;
        }

        if(battery <= 0.0) {
            battery = 0;
            status = 'dead';
            console.log('battery fully discharged! shutting down device!');
        } else if(battery <= 50.0) {
            if(status == 'sleep') {
                status = 'awake';
            } else {
                status = 'sleep';
            }
            battery-=dischargeRate/2;
        } else {
            status = 'active';
            battery-=dischargeRate;
        }
    }
}

// Function sending sensor telemetry data every 5 seconds
function infiniteLoopPublish() {
    var timeOut;
    var dischargeRate;

    if(status == 'dead') {
        publishToTopic(sinkTopic, JSON.stringify(getSensorData(deviceName)));
        updateBatteryStatus(0, isCharging);
        setTimeout(infiniteLoopPublish, 2000);
    } else {
        console.log('Battery of ' + deviceName + ' is ' + battery + '%');
        if(status == 'active') {
            timeOut = 5000;
            dischargeRate = 1;
        } else if(status == 'sleep' || status == 'awake') {
            timeOut = 10000;
            dischargeRate = 1;
        } else if(status == 'dead') {
            dischargeRate = 0;
        }

        var data = JSON.stringify(getSensorData(deviceName));

        if(status == 'active' || status == 'awake') {
            console.log('Sending sensor telemetry data to BAN\'s Sink for ' + deviceName);
        }
        // Publish sensor data to scalable/sink topic
        publishToTopic(sinkTopic, data);

        updateBatteryStatus(dischargeRate, isCharging);
        // Start Infinite Loop of Publish every "timeOut" seconds
        setTimeout(infiniteLoopPublish, timeOut);
    }
}

// Function to create a random float between minValue and maxValue
function randomIntBetween(minValue,maxValue){
    return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)),maxValue)));
}

// Generate random sensor data based on the deviceName
function getSensorData(deviceName) {
    let message = {
        // 'systole': randomIntBetween(90,120),
        // 'diastole': randomIntBetween(60,80),
        'blood-pressure' : randomIntBetween(90,120) + '/' + randomIntBetween(60,80)
    };

    
    const device_data = { 
        'blood-pressure-sensor': {
            'x': randomIntBetween(40, 50),
            'y': randomIntBetween(40, 50)
        }
    };
  
    message['battery'] = battery;
    message['x'] = device_data[deviceName].x;
    message['y'] = device_data[deviceName].y;
    message['status'] = status;
    message['device'] = deviceName;
    message['datetime'] = new Date().toISOString().replace(/\..+/, '');
    
    return message;
}

// currently only recives charger related information
device.on('message', function(topic, message) {
    console.log("Message Received on Topic: " + topic + ": " + message);
    if(sinkTopic + deviceName == topic) {
        if(message == 'true') {
            isCharging = true;
        } else if (message == 'false') {
            isCharging = false;
        } else {
            console.log('Unknown value for charger status! not modifying the exisiting value!');
        }
    } else if(scalable + deviceName + dump == topic) {
        console.log('Battery about to die dumping local data to nearest node!: ' + message);
        publishToTopic(scalable + message + dumprev, deviceName);
    } else if(scalable + deviceName + dumprev == topic) {
        console.log('Recived data dump from ' + message + ' as it\'s battery is about to die');
    }
});

function publishToTopic(topic, payload) {
    device.publish(topic, payload);
}
