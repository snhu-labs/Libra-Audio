class AWSManager {
    constructor(config) {
        this.config = config;
        this.S3Client = require('@aws-sdk/client-s3').S3Client;
        this.PutObjectCommand = require('@aws-sdk/client-s3').PutObjectCommand;
        this.TranscribeClient = require('@aws-sdk/client-transcribe').TranscribeClient;
        this.StartTranscriptionJobCommand = require('@aws-sdk/client-transcribe').StartTranscriptionJobCommand;

        this.months = [
            'Jan', 
            'Feb', 
            'Mar', 
            'Apr', 
            'May', 
            'Jun', 
            'Jul', 
            'Aug', 
            'Sep', 
            'Oct', 
            'Nov', 
            'Dec'
        ];
        let credentials = {
            accessKeyId: this.config.aws.awsID,
            secretAccessKey: this.config.aws.awsSecret
        };
        this.s3 = new this.S3Client({
            credentials,
            region: this.config.aws.awsRegion
        });

        this.transcribeClient = new this.TranscribeClient({
            credentials,
            region: this.config.aws.awsRegion
        });
    }
    DoS3Upload(params, callback = null) {
        let name = params.Key;
        this.s3.send(params, (err, data) => {
            if(err) {
                console.log(`Upload error on ${name}: ${err}`);
                return;
            }
            if(callback) {
                callback(params);
            }
        });
    }
    UploadTelemetry(code, name, text) {
        let folder = this.GetS3Folder(code);
        let bucket = folder.split('/')[0];
        let pth = folder.substring(folder.indexOf('/')+1) + '/';
        let params = {
            Bucket: bucket,
            Key: pth + name,
            Body: text
        };
        let command = new this.PutObjectCommand(params);
        this.s3.send(command).then(resp => {
            return;
        }).catch(err => {
            console.log("Telem err:", err);
        });
    }
	GetS3Folder(code) {
        let dt = new Date();
        let yr = dt.getUTCFullYear();
        let mn = this.months[dt.getUTCMonth()];
        let dy = dt.getUTCDate();
        let tm = this.main.telemetryManager.startTime;

        return `${this.config.aws.awsS3UploadBase}${yr}/${mn}/${dy}/${code}/${tm}`;
	}
    GetFileName(userSlot, msgNum) {
        let dt = new Date();
        return `t${this.main.telemetryManager.startTime}-${dt.getUTCMilliseconds()}-u${userSlot}-n${msgNum}.wav`;
    }
    UploadClip(code, userSlot, msgNum, clip) {
        let folder = this.GetS3Folder(code);
        let name = this.GetFileName(userSlot, msgNum);
        let bucket = folder.split('/')[0];
        let pth = folder.substring(folder.indexOf('/')+1) + '/';
        console.log("Uploading Clip", name);
        let params = {
            Bucket: bucket,
            Key: pth + name,
            Body: new Buffer.from(clip, 'base64'),
            ContentEncoding: 'base64',
            ContentType: `audio/wav`
        };
        let that = this;
        let command = new this.PutObjectCommand(params);
        this.s3.send(command).then(resp => {
            let jobName = name.substr(0, name.length-4);
            let outBucket = bucket;
            let outPath = pth;
            let mediaLocation = `s3://${outBucket}/${pth}${name}`;
            console.log("Clip upload success", jobName);

            that.DoTranscription(jobName, outBucket, outPath, mediaLocation);
        }).catch(err => {
            console.log("Clip err:", err);
        });
    }
    DoTranscription(jobName, outBucket, outPath, mediaLocation) {
        let params = this.MakeNewTranscriptionJobParams(jobName, outBucket, outPath, mediaLocation);
        let cmd = new this.StartTranscriptionJobCommand(params);
        this.transcribeClient.send(cmd).then((data) => {
            console.log("transcription job succeeded");
            return;
        }).catch(err => {
            console.log("Transcription job error:", err);
        });
    }
    MakeNewTranscriptionJobParams(jobName, outBucket, outPath, fileURI) {
        return {
            Media: {
                MediaFileUri: fileURI
            },
            TranscriptionJobName: jobName,
            IdentifyLanguage: false,
            JobExecutionSettings: {
                AllowDeferredExecution: true,
                DataAccessRoleArn: this.config.aws.awsTranscriptArn
            },
            LanguageCode: 'en-US',
            MediaFormat: 'wav',
            MediaSampleRateHertz: 44100,
            OutputBucketName: outBucket,
            OutputKey: outPath,
            Settings: {
                ChannelIdentification: false,
                ShowAlternatives: false,
                ShowSpeakerLabels: false
            }
        };
    }
}

exports.AWSManager = AWSManager;