// Configurations
var textVizConfig = {
	isAudio: false,
	lang: "en",
	type: Phaser.CANVAS,
	scale: {
	width: 400,
	height: 410,
		zoom: Phaser.Scale.NO_ZOOM,
		mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
		autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
		min: {
			width: 175,
			height: 200
		},
		max: {
			width: 400,
			height: 410
		}
	},
	input: {
		touch: false,
		gamepad: false
	},
	disableContextMenu: false,
	transparent: true,
	dom: {
		createContainer: true,
	},
	scene: [TextViz]
};

class VisualizationManager {
	constructor(code, slot) {
		this.username = "teacher"; // always 'teacher'
		this.classcode = code;
		this.slot = slot;

		this.textVizBox = null;
		this.convoBox = null;
		this.isPFlagged = false;
		console.log("VM", this.classcode, this.slot);
		this.slotTags = ['0', 'A', 'B', 'C'];
		this.playerNames = ['', '', '', '', 'Teacher'];
		this.players = [];

        this.msgTypes = {
			'DEFAULT': 0,
			'INIT': 1,
			'START_TALK': 2,
			'STOP_TALK': 3,
			'VOICE_DATA': 4,
			'VTHE': 5,
			'VTES': 6,
			'CUPC': 7,
            'CANCEL_LOGIN': 8,
			'PAUSE_SESS': 10,
			'UNPAUSE_SESS': 11,
			'END_SESS': 12,
			'REJOIN': 13,
			'SESS_END': 14,
			'SLOT_NUM': 15,
			'TELEM_EVENT': 16,
			'SESS_START': 17,
			'PLAYER_JOIN': 18,
			'SEND_STATS': 19,
			'SESS_CONT': 20,
            'REJECTED_CONNECT': 21,
            'VTESO': 22,
			'SINGLE_DROP': 23,
            'DUAL_DROP': 24,
			'DROPCANCEL': 25,
			'PREV_CONVO': 26,
            'NEXT_CONVO': 27,
            'PREV_STATS': 28,
            'NEXT_STATS': 29,
            'PIP': 30,
            'VOICE_CHUNK': 31
		};
		
		this.address = '<URL or IP address of server/domain goes here>';
		this.port = 9701;
		this.serverSocket = null;
		this.isRunning = false;

		this.curSession = 0;

		this.Initialize();
	}
	Initialize() {
		this.Connect();
	}
	Connect() {
		let address = `${this.address}:${this.port}/?cc=${this.classcode}&un=${this.username}&dash=1`;
		console.log("Connecting...", address);
		this.serverSocket = null;
		this.serverSocket = new WebSocket(address);
		this.serverSocket.parent = this;
		this.serverSocket.onopen = this.OnOpenCB;
		this.serverSocket.onclose = this.OnCloseCB;
		this.serverSocket.onerror = this.OnErrorCB;
		this.serverSocket.onmessage = this.OnMessageCB;
		this.isRunning = true;

		if(this.successCallback !== null && typeof this.successCallback === 'function') {
			this.successCallback();
		}
	}
	OnOpenCB() {
		console.log('Connected Successfully.');
		this.parent.CreateTextViz();
	}
	OnCloseCB() {
		console.log("Connection closed.");
	}
	OnErrorCB(err) {
		console.error("Socket Error:", err);
	}
	OnMessageCB(msg) {
		this.parent.RouteMessage(JSON.parse(msg.data));
	}
	SendEvent(data = {}, evtType = this.msgTypes.DEFAULT) {
		if(!data.type || data.type === undefined) {
			data.type = evtType;
		}
		this.serverSocket.send(JSON.stringify(data));
	}
	CreateTextViz() {
		// Set up text viz
		let name = `cofSlot${this.slot}ConvoViz`;
		let config = textVizConfig;
		config.scale.parent = document.getElementById(name);
		config.scale.initSlot = this.slot;
		this.textVizBox = new Phaser.Game(textVizConfig);
		let slotName = `#cofSlot${this.slot}`;
		$(slotName).css("display", "grid");
	}
	ViewPrevTextViz() {
		this.textVizBox.scene.scenes[0].PrevViz();
	}
	ViewNextTextViz() {
		this.textVizBox.scene.scenes[0].NextViz();
	}
	SetPlayerName(slot, name = '') {
		$(`#textVizPlayer${this.slotTags[slot]}Name${this.slot}`).text(name);
	}
	ExportTextVizImage() {
		return this.textVizBox.canvas.getSourceImage(0).toBlob(function(blob){
			var link = document.createElement("a");
			link.download = `textViz${this.slot}.png`;
			link.href = URL.createObjectURL(blob);
			console.log(blob);
			console.log(link.href); // this line should be here
			link.click();

			window.location.reload();
		},'image/png');
	}
	PauseSession() {
		this.SendEvent({}, this.msgTypes.PAUSE_SESS );
	}
	UnpauseSession() {
		this.SendEvent({}, this.msgTypes.UNPAUSE_SESS );
	}
	EndSession() {
		this.SendEvent({}, this.msgTypes.END_SESS );
	}
	RouteMessage(data) {
		switch (data.type) {
			case this.msgTypes.INIT:
				this.SendEvent({ type: this.msgTypes.INIT, classcode: this.classcode, username: this.username });
				break;
			case this.msgTypes.REJECTED_CONNECT:
				console.error("Connection Rejected");
				break;
			case this.msgTypes.SESS_START:
				this.players = data.players;
				this.curSession = data.sessionNum;
				this.players[0] = {};
				this.players[0].name = 'All';
				$(`#cofSlot${this.slot}Active`).addClass('COConvoActiveLightOn');
				if(data.sessionNum) {
					$(`#cofSlot${this.slot}Session`).text(`- ${data.sessionNum + 1}`);
				} else {
					$(`#cofSlot${this.slot}Session`).text(`- 1`);
				}
				break;
			case this.msgTypes.SESS_END:
				$(`#cofSlot${this.slot}Active`).removeClass('COConvoActiveLightOn');
				break;
			case this.msgTypes.PLAYER_JOIN:
				this.players[+data.slot] = {};
				this.players[+data.slot].slot = +data.slot;
				this.players[+data.slot].name = data.name;
				this.SetPlayerName(data.slot, data.name); 
				break;
			case this.msgTypes.SEND_STATS:
				this.textVizBox.scene.scenes[0].ReceiveStats(data);
				break;
			case this.msgTypes.PIP:
				this.textVizBox.scene.scenes[0].CreatePip(data.teamNumber, true);
				break;
			case '':
			default:
				break;
		}
	}
}