const aws = require('aws-sdk');

const config = require('../config/credits.json');

module.exports = fileName => {
    aws.config.update(
      {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region
      }
    );
    const s3 = new aws.S3();
    const options = {
        Bucket : 'health-data-bucket',
        Key : fileName
    };

    return s3.getObject(options).createReadStream();
}
