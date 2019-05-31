const awsConfig = {
    "accessKeyId": process.env.AWS_ACCESS_KEY_ID,
    "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY,
    "region": process.env.AWS_REGION
}

const fs = require('fs');
const XmlStream = require('xml-stream');
const DynamoDB = require('dynamo-node')(process.env.AWS_REGION, awsConfig);
const captureMetric = require('./src/captureMetric');
const getS3Object = require('./src/getS3Object');

exports.handler = event => {
    const healthDataTable = DynamoDB.select('health-data');

    // Select the one value we store
    healthDataTable.get({'id':'1'}).then(item => {
        const startTimeSince = new Date(item.collect_since);
        let newStartTimeSince = new Date(0);

        const stream = getS3Object('export.xml');
        var xml = new XmlStream(stream);

        xml.preserve('Workout', true)
        xml.preserve('Record', true);
        xml.collect('subitem');
        xml.on('endElement: Workout', function(item) {
            const workoutType = item.$.workoutActivityType.replace('HKWorkoutActivityType', '');
            const startTime = new Date(item.$.startDate);

            if (startTime > startTimeSince){
                captureMetric('workout_data,workoutType=' + workoutType + ' totalCaloriesBurned=' + item.$.totalEnergyBurned + ',duration_minutes=' + item.$.duration + ' ' + startTime.getTime()).then(result => {
                    console.log(result);
                });
            }

            if (newStartTimeSince < startTime){
                newStartTimeSince = startTime;
            }
        });

        let metricLines = [];
        xml.on('endElement: Record', function(item) {

            if (item.$.type === 'HKQuantityTypeIdentifierHeartRate'){
                const startTime = new Date(item.$.startDate);

                if (startTime > startTimeSince){
                    metricLines.push('HeartRate value=' + item.$.value + ' ' + startTime.getTime());
                }

                if (newStartTimeSince < startTime){
                    newStartTimeSince = startTime;
                }
            }

            if (item.$.type === 'HKQuantityTypeIdentifierStepCount'){
                const startTime = new Date(item.$.startDate);

                if (startTime > startTimeSince){
                    metricLines.push('StepCount value=' + item.$.value + ' ' + startTime.getTime());
                }

                if (newStartTimeSince < startTime){
                    newStartTimeSince = startTime;
                }
            }

            if (metricLines.length === 1000){
                captureMetric(metricLines.join("\n")).then(result => {
                    console.log('Metric inserted');
                });
                metricLines = [];
            }
        });

        xml.on('end', () => {
            // Get the last metrics inserted
            captureMetric(metricLines.join("\n")).then(result => {
                console.log('Metric inserted');
            });
            metricLines = [];

            updateHealthDataTimestamp(newStartTimeSince.getTime());
        });
    }).catch(e => {
        console.error(e);
    });
};

function updateHealthDataTimestamp(newTimestamp) {
    healthDataTable.update({ 'id': '1' }, {
        collect_since: newTimestamp
    }).then(console.log).catch(e => {
        console.error(e);
    });
}
