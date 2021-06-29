class TelemetryManager {
    constructor(server, fullcode = '0000') {
		this.server = server;
		this.telemetryLog = [];
		this.dt = new Date();
		this.csvDelim = ",";
        this.logToConsole = true;
        this.startTime = null;
		this.fullcode = fullcode;
		this.logName = "";
		this.telemetryActive = false;
		this.sessionNum = 0;
        
		this.logFlushTimer = null;
		this.logFlushInterval = 60000;
		this.lastLogLength = 0;
    }
	GetLogName() {
		return `${this.fullcode}-${this.sessionNum}-${this.startTime}.log`;
	}
	GetTimestamp() {
		this.dt = new Date();
		let month = this.dt.getUTCMonth() + 1;
		return `d${month}-${this.dt.getUTCDate()}-${this.dt.getUTCFullYear()}t${this.dt.getUTCHours()}-${this.dt.getUTCMinutes()}-${this.dt.getUTCSeconds()}`;
	}
    Start(sessionNum = 0) {
		this.sessionNum = sessionNum;
		this.telemetryActive = true;
        this.startTime = this.GetTimestamp();
        this.StartLogFlushing();
    }
	MakeEventData(data) {
		let dataObj = {};
		dataObj.SessionID = this.fullcode;
		dataObj.actionString = this.ParseKVSet(data.actionString);

		return dataObj;
    }
	ParseKVSet(data) {
		let parsedInfo = '';
		if(data) {
			let dataKeys = Object.keys(data);
			if(dataKeys.length <= 0) {
				return "";
			}
			parsedInfo = dataKeys[0].toString() + ":" + (data[dataKeys[0]].toString() || " ");
			for(let d = 1; d < dataKeys.length; d++) {
				if(dataKeys[d] && dataKeys[d].trim() !== "" && dataKeys[d] !== 'eventName') {
					parsedInfo += this.csvDelim + dataKeys[d].toString() + ":" + (data[dataKeys[d]].toString() || " ");
				}
			}
		}
		return parsedInfo;
    }
	Log(data = { eventType: "Session", actionType: "Test", actionString: {} }, forceLog = false) {
		if(this.telemetryActive || forceLog === true) {
			this.telemetryLog.push({ 
				timeStamp: this.GetTimestamp(), 
				eventType: data.eventType, 
				actionType: data.actionType, 
				actionString: this.MakeEventData(data) 
			});
		}
    }
	DataToCSV(data) {
		let dataKeys = Object.keys(data);
		let result = dataKeys[0] + ":" + data[dataKeys[0]];
		for (let d = 1; d < dataKeys.length; d++) {
			result += this.csvDelim + dataKeys[d] + ":" + data[dataKeys[d]];
		}
        return result;
    }
	SerializeToCSV() {
		let result = "";
		result += "Time Stamp,Event Name,Event Data";
		for (let i = 0; i < this.telemetryLog.length; i++) {
			result += `${this.telemetryLog[i].timeStamp},${this.telemetryLog[i].eventType},${this.telemetryLog[i].actionType},${this.DataToCSV(this.telemetryLog[i].actionString)}\n`;
		}
		return result;
    }
	UploadLogToS3() {
		let logName = this.GetLogName();
		let logTxt = this.SerializeToCSV();

		this.server.awsManager.UploadTelemetry(this.fullcode, logName, logTxt);
	}
	StartLogFlushing() {
		this.StopLogFlushing();
		if(this.telemetryActive) {
			this.logFlushTimer = setInterval(() => { 
				this.FlushLog(); 
			}, this.logFlushInterval);
		}
	}
	FlushLog() {
		if(this.telemetryLog.length > this.lastLogLength) {
			this.lastLogLength = this.telemetryLog.length;
			this.UploadLogToS3();
		}
	}
	StopLogFlushing() {
		if(this.logFlushTimer) {
			clearInterval(this.logFlushTimer);
			this.logFlushTimer = null;
		}
	}
	Reset(restart = true, sessionNum = 0) {
		this.telemetryLog = [];

		if(restart) {
			this.Start(sessionNum);
		}
	}
}

exports.TelemetryManager = TelemetryManager;