var obj = {
    'scalable': 'scalable/', 
    'sinkTopic': 'scalable/' + 'sink/',
    'serverTopic': 'scalable/' + 'server/',
    'dump': '/dump',
    'dumprev': '/dump' + '/receive',
    'cmdTopic': '/scalable' + 'cmd/',
    
    // Function to update battery status
    'updateBatteryStatus': function (battery, status, dischargeRate, isCharging) {
        if (isCharging) {
            if (battery >= 100.0) {
                battery = 100;
                console.log('battery fully charged!');
            } else {
                status = 'active';
                battery += 1.0;
            }
        } else {
            if (status == 'dead' || isKilled) {
                return;
            }

            if (battery <= 0.0) {
                battery = 0;
                status = 'dead';
                console.log('battery fully discharged! shutting down device!');
            } else if (battery <= 50.0) {
                if (status == 'sleep') {
                    status = 'awake';
                } else {
                    status = 'sleep';
                }
                battery -= dischargeRate / 2;
            } else {
                status = 'active';
                battery -= dischargeRate;
            }
        }
        return battery, status
    },

    // Function sending sensor telemetry data every 5 seconds
    'infiniteLoopPublish': function (device, deviceName, status, battery, isCharging) {
        var timeOut;
        var dischargeRate;

        if (status == 'dead' || isKilled) {
            obj.publishToTopic(device, obj.sinkTopic, JSON.stringify(obj.getSensorData(deviceName, battery, status)));
            battery, status = obj.updateBatteryStatus(battery, status, 0, isCharging);
            setTimeout(obj.infiniteLoopPublish(device, deviceName, status, battery, isCharging), 2000);
        } else {
            console.log('Battery of ' + deviceName + ' is ' + battery + '%');
            if (status == 'active') {
                timeOut = 5000;
                dischargeRate = 1;
            } else if (status == 'sleep' || status == 'awake') {
                timeOut = 10000;
                dischargeRate = 1;
            } else if (status == 'dead') {
                dischargeRate = 0;
            }

            var data = JSON.stringify(obj.getSensorData(deviceName, battery, status));

            if(isTimeOutOverridden) {
                timeOut = 1000;
                dischargeRate = 0.5;
                isCharging = false;
            }

            // Publish sensor data to scalable/sink topic
            obj.publishToTopic(device, obj.sinkTopic, data);

            battery, status = obj.updateBatteryStatus(battery, status, dischargeRate, isCharging);
            // Start Infinite Loop of Publish every "timeOut" seconds
            setTimeout(obj.infiniteLoopPublish(device, deviceName, status, battery, isCharging), timeOut);
        }
    },

    // Function to create a random float between minValue and maxValue
    'randomIntBetween': function (minValue, maxValue) {
        return parseInt(Math.floor(Math.min(minValue + (Math.random() * (maxValue - minValue)), maxValue)));
    },

    // Generate random sensor data based on the deviceName
    'getSensorData': function (deviceName, battery, status) {
        let message = {
            'temperature': obj.randomIntBetween(94, 106) // less than 97 and more than 101 is bad
        };

        message['x'] = obj.randomIntBetween(30, 40);
        message['y'] = obj.randomIntBetween(30, 40);
        message['status'] = status;
        message['device'] = deviceName;
        message['battery'] = battery;
        message['isunplugged'] = isUnplugged;
        message['iskilled'] = isKilled;
        message['datetime'] = new Date().toISOString().replace(/\..+/, '');

        return message;
    },

    'publishToTopic': function (device, topic, payload) {
        device.publish(topic, payload);
    }

};

module.exports = obj;
