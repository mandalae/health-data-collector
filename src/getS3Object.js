const aws = require('aws-sdk');

module.exports = fileName => {
    aws.config.update(
        {
          "accessKeyId": process.env.AWS_ACCESS_KEY_ID,
          "secretAccessKey": process.env.AWS_SECRET_ACCESS_KEY,
          "region": process.env.AWS_REGION
        }
    );
    const s3 = new aws.S3();
    const options = {
        Bucket : 'health-data-bucket',
        Key : fileName
    };

    return s3.getObject(options).createReadStream();
}
