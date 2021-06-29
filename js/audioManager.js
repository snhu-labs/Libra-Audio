class AudioManager {
    constructor(main = null) {
        this.main = main;
        this.netMgr = null;

		this.audioSourceBuffer = null;
		this.audioSrcBuffers = [];
        this.audioContext = null;
        this.audioRecorder = null;
        this.audioChunks = [];
        this.audioSnippet = [];
		this.finalizeRecording = false;
		this.sliceFrameIdx = 0;
		this.recordingSliceFramesMS = [100, 250, 500, 750, 1000];
        this.recordingDataSliceMS = 250;
        this.recordingSliceTimeMS = 1000;
        this.recordingSliceDelayMS = 75;
		this.sourceBuffer = null;

        this.mimeType = 'audio/webm;codecs=pcm';
        this.recorderOptions = { 
			audio: true,
			mimeType: this.mimeType
		};
		this.CodecOptions = {
			mimeType: this.mimeType
		};

        // Finally, set that global
        audioManager = this;
    }
	// Recorder
    Initialize() {
		this.netMgr = this.main.networkManager;
		this.GetMediaDevices();
		this.SetupAudioContext();
	}
    GetMediaDevices() {
		if (navigator.mediaDevices === undefined) {
			navigator.mediaDevices = {};
		}

		if (navigator.mediaDevices.getUserMedia === undefined) {
			navigator.mediaDevices.getUserMedia = function(constraints) {
				let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

				if (!getUserMedia) {
					return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
				}

				return new Promise(function(resolve, reject) {
					getUserMedia.call(navigator, constraints, resolve, reject);
				});
			}
		}
	}
	SetupAudioContext() {
		let AudioContext = window.AudioContext || window.webkitAudioContext;
		this.audioContext = new AudioContext();
		this.StartRecording(false);
	}
    StartRecording(startRecording = false) {
		navigator.mediaDevices.getUserMedia({audio: true, mimeType: audioManager.mimeType }).then(stream => {
			audioManager.audioRecorder = new MediaRecorder(stream);
			audioManager.audioRecorder.ondataavailable = audioManager.BufferAudioData;
			audioManager.audioRecorder.onstop = audioManager.MergeChunks;
			
			if(startRecording) {
				audioManager.audioRecorder.start();
				window.setTimeout(() => {
					audioManager.StopRecording(true);
				}, audioManager.recordingSliceFramesMS[audioManager.sliceFrameIdx]);
			}
		}).catch(err => {
			console.error(err);
		});
	}
	BufferAudioData(e) {
		if(e.data.size > 0) {
            audioManager.audioChunks.push(e.data);
			audioManager.netMgr.SendAudio(audioManager.audioChunks[audioManager.audioChunks.length-1]);

			if(audioManager.finalizeRecording) {
				window.setTimeout(() => {
					audioManager.audioRecorder.ondataavailable = null;
					audioManager.sliceFrameIdx = 0;
					audioManager.MergeChunks();
				}, this.recordingSliceTimeMS + (this.recordingSliceTimeMS * 0.2));
			}
		}
	}
	MergeChunks() {
		if(audioManager.audioChunks.length > 0) {
			let blob = new Blob(audioManager.audioChunks.flat(), { mimeType: audioManager.mimeType });
			audioManager.audioChunks = [];
			blob.arrayBuffer().then(arrBuff => {
				let acx = new (AudioContext || webkitAudioContext)();
				acx.decodeAudioData(arrBuff).then(buffer => {
					audioManager.audioSnippet.push(buffer);
					if(audioManager.finalizeRecording) {
						audioManager.FinalizeSnippet();
					}
				}).catch(err => {
					console.warn("Recorder decode error:", err);
				});
			}).catch(err => {
				console.warn("Error", err);
			});
		}
	}
    StopRecording(continueRecording = false) {
		if(audioManager.audioRecorder && audioManager.audioRecorder.state !== 'inactive') {
			audioManager.audioRecorder.stop();

			if(continueRecording) {
				if(audioManager.sliceFrameIdx >= 4) {
					audioManager.sliceFrameIdx = 4;
				} else {
					audioManager.sliceFrameIdx++;
				}

				audioManager.MergeChunks();
				audioManager.StartRecording(true);
			} else {
				audioManager.finalizeRecording = true;
			}
		}
	}
    GetTotalAudioDuration() {
		let duration = 0;
		for(let d = 0; d < audioManager.audioSnippet.length; d++) {
			duration += audioManager.audioSnippet[d].duration;
		}
		return duration;
    }
	AppendBuffer(buffer1, buffer2) {
		let acx = new (window.AudioContext || window.webkitAudioContext)(); 
		let numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
		let tmp = acx.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
		for(let i=0; i<numberOfChannels; i++) {
			let channel = tmp.getChannelData(i);
			channel.set( buffer1.getChannelData(i), 0);
			channel.set( buffer2.getChannelData(i), buffer1.length);
		}
		return tmp;
	}
    ConcatAudioBuffers() {
		if(audioManager.audioSnippet.length === 1) {
            return audioManager.audioSnippet[0];
        }
		return audioManager.audioSnippet.reduce((a,b) => {
			return audioManager.AppendBuffer(a, b);
		});
    }
    FinalizeSnippet() {
		audioManager.finalizeRecording = false;
		if(audioManager.audioSnippet.length > 0) {
			let dur = audioManager.GetTotalAudioDuration(); 
			let cbuffs = audioManager.ConcatAudioBuffers();
			let offlineAudioCtx = new OfflineAudioContext({
				numberOfChannels: 2,
				length: 44100 * dur,
				sampleRate: 44100,
			});

			let soundSource = offlineAudioCtx.createBufferSource();
			soundSource.buffer = cbuffs;
			soundSource.connect(offlineAudioCtx.destination);
			soundSource.start();

			offlineAudioCtx.startRendering().then(renderedBuffer => {
				let abuff = audioManager.BufferToWav(renderedBuffer, offlineAudioCtx.length);
				audioManager.SendAudioChunk(abuff);
				audioManager.audioSnippet = [];
			});
		}
	}
	ArrayBufferToBase64(buffer) {
		let binary = '';
		let bytes = new Uint8Array(buffer);
		let len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary);
	}
	SendAudioChunk(buffer) {
		audioManager.netMgr.SendEvent({ msgNum: this.main.currentMsgNum, clip: this.ArrayBufferToBase64(buffer)  }, audioManager.netMgr.msgTypes.VOICE_CHUNK);
	}
    BufferToWav(abuffer, len) {
		let numOfChan = abuffer.numberOfChannels;
		let length = len * numOfChan * 2 + 44;
		let buffer = new ArrayBuffer(length);
		let view = new DataView(buffer);
		let channels = [];
        let sample = 0;
		let offset = 0;
		let pos = 0;

		// write WAVE header
		SetUint32(0x46464952); // "RIFF"
		SetUint32(length - 8); // file length - 8
		SetUint32(0x45564157); // "WAVE"

		SetUint32(0x20746d66); // "fmt " chunk
		SetUint32(16); // length = 16
		SetUint16(1); // PCM (uncompressed)
		SetUint16(numOfChan);
		SetUint32(abuffer.sampleRate);
		SetUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
		SetUint16(numOfChan * 2); // block-align
		SetUint16(16); // 16-bit (hardcoded here)

		SetUint32(0x61746164); // "data" - chunk
		SetUint32(length - pos - 4); // chunk length

		// write interleaved data
		for(let i = 0; i < abuffer.numberOfChannels; i++) {
			channels.push(abuffer.getChannelData(i));
        }

		let i = 0;
		while(pos < length) {
            // interleave channels
			for(i = 0; i < numOfChan; i++) { 
				sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                // scale to 16-bit signed int
				sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
				view.setInt16(pos, sample, true); // write 16-bit sample
				pos += 2;
			}
			offset++; // next source sample
		}
	
		// create Blob
		return buffer;

		function SetUint16(data) {
			view.setUint16(pos, data, true);
			pos += 2;
		}
		function SetUint32(data) {
			view.setUint32(pos, data, true);
			pos += 4;
		}
	}
	TestPlay(buffer) {
		try {
		let acx = new (window.AudioContext || window.webkitAudioContext)(); 
		let song = acx.createBufferSource();
		let b = buffer;
		song.buffer = b;
		song.connect(acx.destination);
		song.start();
		} catch(err) {
			console.warn("TestPlay:", err);
		};
	}
	// Player
	ClearSourceBuffers() {
		window.setTimeout(() => {
			audioManager.audioSrcBuffers = [];
		}, audioManager.recordingSliceTimeMS + (audioManager.recordingSliceTimeMS * 0.2));
	}
	ReceiveAudio(data) {
		if(!data || data.byteLength < 250) {
			console.warn("invalid audio chunk");
			return;
		}
		audioManager.audioSrcBuffers.push(audioManager.audioContext.createBufferSource());

		audioManager.audioContext.decodeAudioData(data).then((audioBuffer) => {
			audioManager.SetAudioChunk(audioBuffer);
		}).catch((err) => {
			console.warn("Decode Error:", err, data.byteLength);
		});
	} 
	SetAudioChunk(audioBuffer) {
		let len = audioManager.audioSrcBuffers.length-1;
		audioManager.audioSrcBuffers[len].buffer = audioBuffer;
		audioManager.audioSrcBuffers[len].connect(audioManager.audioContext.destination);
		audioManager.audioSrcBuffers[len].start();
	}
}