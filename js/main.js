class Main extends Phaser.Scene {
    constructor() {
        super('Main');
        this.networkManager = null;
        this.appContent = null;

		this.teamNumber = -1;
		this.players = [null, null, null, null];
		this.playerAName = "Player A";
		this.playerBName = "Player B";
		this.playerCName = "Player C";
		this.playerTags = ['', 'A', 'B', 'C'];

		this.sessionStates = {
			'titleMenu': 0,
			'waitingForPlayers': 1,
			'inSession': 2,
			'resultsMenu': 3,
			'canceling': 4
		};
		this.currentState = this.sessionStates['titleMenu'];
		this.dropDelayTimer = 60;
		this.endSessionCountdownTimer = null;
		this.endSessionTimer = null;
		this.notificationTimer = null;
		this.notificationTabInterval = 1500;
		this.notificationTitle = "You Have A Message!";
		this.pauseMessage = "";
		this.menu = "";
		this.iecdFrom = 0;
		this.endSessionTimerTN = -1;

		this.maxArcWidth = 20;
        this.maxTriWidth = 15;
		this.colors = {
			AllActive: '#BFBFBF',
			All: '#AAAAAA',
			AActive: '#ffc300',
			A: '#7A6D2D',
			B: '#296A93',
			BActive: '#36bcff',
			C: '#75434E',
			CActive: '#f25a52',
			AllDull: '#848484',
			ADull: '#626649',
			BDull: '#395870',
			CDull: '#565363',
			G: '#88ff88'
		};
		this.minEdgeWidth = 2;
		this.maxEdgeWidth = 30;
        this.edgeWidths = {
			AB: this.minEdgeWidth,
			AC: this.minEdgeWidth,
			BA: this.minEdgeWidth,
			BC: this.minEdgeWidth,
			CA: this.minEdgeWidth,
			CB: this.minEdgeWidth
		};
		this.totalMsgs = 0;
		this.sessionTimeSec = 0;
		this.sessionPlayerTimes = [0,0,0,0];
		this.playerMsg = [];
		this.playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.playerMsg[3] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.textVizPct = {
			A: 0,
			B: 0,
			C: 0,
			N: 0
		};
		
		this.playerTalkTimers = [null, null, null, null];
		this.talkTimerMS = 30000;
		this.talkTimeElapsed = 0;
		this.talkTimeLimit = 30000;
		this.fillDepletionIntervalMS = 250;
		this.fillIncrement = 110 / (this.talkTimerMS / this.fillDepletionIntervalMS);
		this.fillArcs = [
			{ x: 335, y: 365, ir: 205, or: 225, mr: 215, start: 0, end: 0, cur: 0 },
			{ x: 335, y: 365, ir: 205, or: 225, mr: 215, start: 245, end: 355, cur: 245 },
			{ x: 335, y: 365, ir: 205, or: 225, mr: 215, start: 5, end: 115, cur: 5 },
			{ x: 335, y: 365, ir: 205, or: 225, mr: 215, start: 125, end: 235, cur: 125 }
		];

		this.pips = []; 
		this.pipNum = 0;
		this.pipShiftThreshold = 114;
		this.tempPipTimer = null;

		this.channelEnabled = [true, true, true];
		this.currentChannel = 0;
		this.channelLockDelayMS = 2000;
		this.currentMsgNum = 0;

		// This will set up its own global
		new AudioManager(this);
    }
    preload() {
		this.load.html('appContent', "js/content.html");
		this.load.audio('cowbell', "audio/CowbellLoud.mp3");
    }
    create() {
		this.appContent = this.add.dom(0, 0).createFromCache('appContent');
		this.networkManager = new NetworkManager(this);
		ValidateAppSize();
		this.notificationSound = this.sound.add('cowbell');

		this.GoToTitleScreen();
	}
	update() {
		ValidateAppSize();
	}
	IsCurrentState(state) {
		return this.currentState === this.sessionStates[state];
	}
	SetCurrentState(state) {
		if(this.sessionStates[state]) {
			this.currentState = this.sessionStates[state];
		}
	}
	SetSlot(slot) {
		this.teamNumber = slot;
	}
	PlayerJoined(slot, name) {
		$(`#titlePlayer${this.playerTags[slot]}Joined`).attr("class", `player${this.playerTags[slot]}Dot`);
		if(name === this.networkManager.username) {
			$("#titleTriangle").attr("class", `libraTitleTriangle${this.playerTags[slot]}`);
		}
	}
	TruncateText(text, length = 28) {
		if(!text ||
			text.trim() === "" || 
			text.length <= length) {
			return text;
		} else {
			return text.substring(0, length-1) + "...";
		}
	}
	GetPlayerName(teamNumber = 1, len = 28) {
		return this.TruncateText(this.players[teamNumber].name, len);
    }
	GoToTitleScreen() {
        $("#titleMenu").css('display', 'block');
        $("#mainFrame").css('display', 'none');
		$("#resultsMenu").css('display', 'none');
		$("#reportDownloadModal").css('display', 'none');
		this.SetCurrentState('titleMenu');

		let cc = GetQueryVariable("roomCode");
		if(cc) cc = cc.replace(/%20/g, " ");
		let n = GetQueryVariable("name");
		if(n) n = n.replace(/%20/g, " ");
		
		if(cc && cc.trim() !== "" && n && n.trim() !== "") {
			$("#titleUsernameInputBox").val(n);
			$("#titleClasscodeInputBox").val(cc);
			this.ValidateTitleInput();
		}

	}
	ValidateTitleInput(e) {
		if(e !== null && e !== undefined && e.keyCode === 13) {
			this.LogIn();
		}
		this.classCode = $("#titleClasscodeInputBox").val().trim();
		if (this.classCode.length > 4) {
			$("#titleClasscodeInputBox").val($("#titleClasscodeInputBox").val().trim().slice(0,4)); 
		}
		if($("#titleUsernameInputBox").val().trim() !== "" && 
			this.classCode !== "" &&
			this.classCode.length === 4 &&
			!Number.isNaN(this.classCode)) {
				$("#titleTriangle").removeClass('libraTitleTriangleNormal');
				$("#titleTriangle").addClass('libraTitleTriangleReady');
				$("#titleClasscodeInputBox").removeClass('libraTitleClasscodeInputNormal');
				$("#titleClasscodeInputBox").addClass('libraTitleClasscodeInputReady');
				$("#titleStartRoomBtn").removeClass('libraStartRoomBtnNormal');
				$("#titleStartRoomBtn").addClass('libraStartRoomBtnReady');
		} else {
			$("#titleTriangle").removeClass('libraTitleTriangleReady');
			$("#titleTriangle").addClass('libraTitleTriangleNormal');
			$("#titleClasscodeInputBox").removeClass('libraTitleClasscodeInputReady');
			$("#titleClasscodeInputBox").addClass('libraTitleClasscodeInputNormal');
			$("#titleStartRoomBtn").removeClass('libraStartRoomBtnReady');
			$("#titleStartRoomBtn").addClass('libraStartRoomBtnNormal');
		}
	}
	LogIn() {
		audioManager.Initialize();
		console.warn("LOGIN!");
		this.classCode = $("#titleClasscodeInputBox").val().trim();
		if($("#titleUsernameInputBox").val().trim() !== "" && 
		this.classCode !== "" &&
		this.classCode.length === 4 &&
		!Number.isNaN(this.classCode)) {
			$("#titleStartRoomBtn").hide();
			$("#titleCancelJoinBtn").show();
			$("#titleWaitingText").show();
			$("#titlePlayerAJoined").show();
			$("#titlePlayerBJoined").show();
			$("#titlePlayerCJoined").show();

			this.networkManager.Initialize(this.classCode, $("#titleUsernameInputBox").val().trim(), () => {
				console.log("connected");
			});
		}
	}
	CancelLogin(sendNetMsg = true) {
		if(sendNetMsg === true) {
			this.SetCurrentState('canceling');
			this.networkManager.CancelLogin();
		}

		$("#titleStartRoomBtn").show();
		$("#titleCancelJoinBtn").hide();
		$("#titleWaitingText").hide();
		$("#titlePlayerAJoined").hide();
		$("#titlePlayerBJoined").hide();
		$("#titlePlayerCJoined").hide();
		$("#titleTriangle").attr("class", "libraTitleTriangleReady");

		window.setTimeout(() => {
			this.SetCurrentState('titleMenu');
		}, 1000);
	}
	StartSession(playersInfo, sessionNum) {
		this.sessionNum = sessionNum;
		this.players = [];
		for(let p = 0; p < playersInfo.length; p++) {
			this.players[playersInfo[p].slot] = {};
			this.players[playersInfo[p].slot] = playersInfo[p];
		}
		this.SetTeamTabs();

		let aLabel, bLabel, cLabel;
		this.players[1] ? aLabel = this.GetPlayerName(1) : aLabel = "";
		this.players[2] ? bLabel = this.GetPlayerName(2) : bLabel = "";
		this.players[3] ? cLabel = this.GetPlayerName(3) : cLabel = "";

		$("#playerALabel").text(aLabel);
		$("#finalPlayerA").text(aLabel);
		if(aLabel.length >= 18) {
			$("#playerALabel").css("font-size", "16px");
			$("#finalPlayerA").css("font-size", "16px");
		}

		$("#playerBLabel").text(bLabel);
		$("#finalPlayerB").text(bLabel);
		if(bLabel.length >= 18) {
			$("#playerBLabel").css("font-size", "16px");
			$("#finalPlayerB").css("font-size", "16px");
		}

		$("#playerCLabel").text(cLabel);
		$("#finalPlayerC").text(cLabel);
		if(cLabel.length >= 18) {
			$("#playerCLabel").css("font-size", "16px");
			$("#finalPlayerC").css("font-size", "16px");
		}
		
		this.GoToMainScreen();

		this.startTime = this.GetTimestamp();
	}
	SetTeamTabs() {
		this.tab1Slot = this.teamNumber;
		switch(this.teamNumber) {
			case 1: 
				this.tab2Slot = 2;
				this.tab3Slot = 3;
				$(`#pttTwoButton`).addClass(`pttBlue`);
				$(`#pttThreeButton`).addClass(`pttRed`);
				break;
			case 2:
				this.tab2Slot = 1;
				this.tab3Slot = 3;
				$(`#pttTwoButton`).addClass(`pttYellow`);
				$(`#pttThreeButton`).addClass(`pttRed`);
				break;
			case 3:
				this.tab2Slot = 1;
				this.tab3Slot = 2;
				$(`#pttTwoButton`).addClass(`pttYellow`);
				$(`#pttThreeButton`).addClass(`pttBlue`);
				break;
		}
	}
	GetTimestamp() {
		this.dt = new Date();
		let month = this.dt.getMonth() + 1;
		return "d" + month + "-" + this.dt.getDate() + "-" + this.dt.getFullYear() + "t" + this.dt.getHours() + "-" + this.dt.getMinutes() + "-" + this.dt.getSeconds() + "-" + this.dt.getMilliseconds();
	}
	ReceiveStats(data) {
		this.sessionTimeSec = data.stats.sessionTimeSec;
		this.sessionPlayerTimes = data.stats.sessionPlayerTimes;
		this.totalMsgs = data.stats.totalMsg
		this.playerMsg = data.stats.playerMsg;
		this.UpdateViz();
	}
    GoToMainScreen() {
        $("#titleMenu").css('display', 'none');
        $("#mainFrame").css('display', 'block');
		$("#resultsMenu").css('display', 'none');
		$("#reportDownloadModal").css('display', 'none');

		this.UpdateViz();
	}
	GoToResultsScreen() {
        $("#endChatHolder").css('display', 'none');
        $("#titleMenu").css('display', 'none');
		$("#resultsMenu").css('display', 'block');
		$("#reportDownloadModal").css('display', 'none');
		this.UpdateViz(true);
		this.DrawOrderedMessageViz(true);
	}
	PTTAll() {
		this.Unhighlight();
		this.currentChannel = 0;
		this.networkManager.SendEvent({ teamNumber: this.teamNumber, toTeam: 0 }, this.networkManager.msgTypes.START_TALK);
	}
	PTTCancelAll(e) {
		this.PTTCancel(e, 0);
	}
	PTTTwo() {
		this.Unhighlight();
		this.currentChannel = this.tab2Slot;
		this.networkManager.SendEvent({ teamNumber: this.teamNumber, toTeam: this.tab2Slot }, this.networkManager.msgTypes.START_TALK);
	}
	PTTCancelTwo(e) {
		this.PTTCancel(e, this.tab2Slot);
	}
	PTTThree() {
		this.Unhighlight();
		this.currentChannel = this.tab3Slot;
		this.networkManager.SendEvent({ teamNumber: this.teamNumber, toTeam: this.tab3Slot }, this.networkManager.msgTypes.START_TALK);
	}
	PTTCancelThree(e) {
		this.PTTCancel(e, this.tab3Slot);
	}
	PTTCancel(e, toTeam = 0) {
		if(e) {
			e.preventDefault();
			e.stopPropagation();
		}
		audioManager.StopRecording(false);
		this.networkManager.SendEvent({ teamNumber: this.teamNumber, toTeam: toTeam }, this.networkManager.msgTypes.STOP_TALK);
	}
	StartTalking(teamNum, msgNum) {
		this.ClearTalkTimers();
		if(teamNum === this.teamNumber) {
			this.currentMsgNum = msgNum;
			audioManager.StartRecording(true);
		}
		this.SetTeamTalking(teamNum, true);
		this.SetSpeakIconActive(teamNum);
	}
	SetSpeakIconActive(teamNum) {
		this.SetSpeakIconsInactive();
		if(teamNum === 1) {
			$(`#tab1SlotSpeakIcon`).addClass(`playerASpeakIconActive`);
		} else if(teamNum === 2) {
			$(`#tab2SlotSpeakIcon`).addClass(`playerBSpeakIconActive`);
		} else if(teamNum === 3) {
			$(`#tab3SlotSpeakIcon`).addClass(`playerCSpeakIconActive`);
		}
	}
	SetSpeakIconsInactive() {
		$('#tab1SlotSpeakIcon').removeClass(`playerASpeakIconActive`);
		$('#tab2SlotSpeakIcon').removeClass(`playerBSpeakIconActive`);
		$('#tab3SlotSpeakIcon').removeClass(`playerCSpeakIconActive`);
	}
	StopTalking(teamNum) {
		this.SetTeamTalking(teamNum, false);
		if(teamNum === this.teamNumber) {
			audioManager.StopRecording(false);
		} else {
			audioManager.ClearSourceBuffers();
		}
		this.talkTimeElapsed = 0;
		this.SetSpeakIconsInactive();
		this.UpdateViz();
	}
	ClearTalkTimers() {
		window.clearInterval(this.playerTalkTimers[0]);
		window.clearInterval(this.playerTalkTimers[1]);
		window.clearInterval(this.playerTalkTimers[2]);
		window.clearInterval(this.playerTalkTimers[3]);
		this.playerTalkTimers = [null, null, null, null];
	}
	SetTeamTalking(teamNum, isTalking = false) {
		this.fillArcs[teamNum].cur = this.fillArcs[teamNum].start;
		if(isTalking === false) {
			this.ClearTalkTimers();
			this.playerTalkTimers[teamNum] = null;
			this.Unhighlight();
			$(`#Fill${this.playerTags[teamNum]}`).attr("d", this.DrawArc(this.fillArcs[teamNum].x, this.fillArcs[teamNum].y, this.fillArcs[teamNum].mr, this.fillArcs[teamNum].start, this.fillArcs[teamNum].end));
		} else {
			this.HighlightOnly(teamNum);
			$(`#Fill${this.playerTags[teamNum]}`).attr("stroke", this.colors[`${this.playerTags[teamNum]}Active`]);
			this.playerTalkTimers[teamNum] = window.setInterval(() => {
				this.talkTimeElapsed += this.fillDepletionIntervalMS;
				this.TeamTalkFillDepletion(teamNum);
			}, this.fillDepletionIntervalMS, this);
		}
	}
	HighlightOnly(teamNum, highlightAll = false) {
		$(`#ArcA`).attr("stroke", this.colors[`A`]);
		$(`#ArcB`).attr("stroke", this.colors[`B`]);
		$(`#ArcC`).attr("stroke", this.colors[`C`]);
		$(`#ArcAB`).attr("stroke", this.colors[`A`]);
		$(`#TriAB`).attr("stroke", this.colors[`A`]);
		$(`#ArcAC`).attr("stroke", this.colors[`A`]);
		$(`#TriAC`).attr("stroke", this.colors[`A`]);
		$(`#ArcBA`).attr("stroke", this.colors[`B`]);
		$(`#TriBA`).attr("stroke", this.colors[`B`]);
		$(`#ArcBC`).attr("stroke", this.colors[`B`]);
		$(`#TriBC`).attr("stroke", this.colors[`B`]);
		$(`#ArcCA`).attr("stroke", this.colors[`C`]);
		$(`#TriCA`).attr("stroke", this.colors[`C`]);
		$(`#ArcCB`).attr("stroke", this.colors[`C`]);
		$(`#TriCB`).attr("stroke", this.colors[`C`]);

		$(`#Arc${this.playerTags[teamNum]}`).attr("stroke", this.colors[`${this.playerTags[teamNum]}Active`]);
		if(highlightAll) {
			$(`.playerALabel`).css('color', this.colors[`A`]);
			$(`.playerBLabel`).css('color', this.colors[`B`]);
			$(`.playerCLabel`).css('color', this.colors[`C`]);
			$(`.pipA`).css('backgroundColor', this.colors[`A`]);
			$(`.pipB`).css('backgroundColor', this.colors[`B`]);
			$(`.pipC`).css('backgroundColor', this.colors[`C`]);
			$(`.horizontalVizPlayerA`).css('backgroundColor', this.colors[`A`]);
			$(`.horizontalVizPlayerB`).css('backgroundColor', this.colors[`B`]);
			$(`.horizontalVizPlayerC`).css('backgroundColor', this.colors[`C`]);
			$(`.horizontalLabelPlayerA`).css('color', this.colors[`A`]);
			$(`.horizontalLabelPlayerB`).css('color', this.colors[`B`]);
			$(`.horizontalLabelPlayerC`).css('color', this.colors[`C`]);
			$(`.textVizPlayerA`).css('color', this.colors['A']);
			$(`.textVizPlayerB`).css('color', this.colors['B']);
			$(`.textVizPlayerC`).css('color', this.colors['C']);
		}

		switch(teamNum) {
			case 1:
				$(`#ArcAB`).attr("stroke", this.colors[`AActive`]);
				$(`#TriAB`).attr("stroke", this.colors[`AActive`]);
				$(`#ArcAC`).attr("stroke", this.colors[`AActive`]);
				$(`#TriAC`).attr("stroke", this.colors[`AActive`]);
				if(highlightAll) {
					$(`.playerALabel`).css('color', this.colors[`AActive`]);
					$(`.pipA`).css('backgroundColor', this.colors[`AActive`]);
					$(`.horizontalVizPlayerA`).css('backgroundColor', this.colors[`AActive`]);
					$(`.horizontalLabelPlayerA`).css('color', this.colors[`AActive`]);
					$(`.textVizPlayerA`).css('color', this.colors['AActive']);
				}
				break;
			case 2:
				$(`#ArcBA`).attr("stroke", this.colors[`BActive`]);
				$(`#TriBA`).attr("stroke", this.colors[`BActive`]);
				$(`#ArcBC`).attr("stroke", this.colors[`BActive`]);
				$(`#TriBC`).attr("stroke", this.colors[`BActive`]);
				if(highlightAll) {
					$(`.playerBLabel`).css('color', this.colors[`BActive`]);
					$(`.pipB`).css('backgroundColor', this.colors[`BActive`]);
					$(`.horizontalVizPlayerB`).css('backgroundColor', this.colors[`BActive`]);
					$(`.horizontalLabelPlayerB`).css('color', this.colors[`BActive`]);
					$(`.textVizPlayerB`).css('color', this.colors['BActive']);
				}
				break;
			case 3: 
				$(`#ArcCA`).attr("stroke", this.colors[`CActive`]);
				$(`#TriCA`).attr("stroke", this.colors[`CActive`]);
				$(`#ArcCB`).attr("stroke", this.colors[`CActive`]);
				$(`#TriCB`).attr("stroke", this.colors[`CActive`]);
				if(highlightAll) {
					$(`.playerCLabel`).css('color', this.colors[`CActive`]);
					$(`.pipC`).css('backgroundColor', this.colors[`CActive`]);
					$(`.horizontalVizPlayerC`).css('backgroundColor', this.colors[`CActive`]);
					$(`.horizontalLabelPlayerC`).css('color', this.colors[`CActive`]);
					$(`.textVizPlayerC`).css('color', this.colors['CActive']);
				}
				break;
		}
	}
	Unhighlight() {
		$(`#ArcA`).attr("stroke", this.colors[`AActive`]);
		$(`#ArcB`).attr("stroke", this.colors[`BActive`]);
		$(`#ArcC`).attr("stroke", this.colors[`CActive`]);
		$(`#FillA`).attr("stroke", this.colors[`A`]);
		$(`#FillB`).attr("stroke", this.colors[`B`]);
		$(`#FillC`).attr("stroke", this.colors[`C`]);
		$(`#ArcAB`).attr("stroke", this.colors[`AActive`]);
		$(`#TriAB`).attr("stroke", this.colors[`AActive`]);
		$(`#ArcAC`).attr("stroke", this.colors[`AActive`]);
		$(`#TriAC`).attr("stroke", this.colors[`AActive`]);
		$(`#ArcBA`).attr("stroke", this.colors[`BActive`]);
		$(`#TriBA`).attr("stroke", this.colors[`BActive`]);
		$(`#ArcBC`).attr("stroke", this.colors[`BActive`]);
		$(`#TriBC`).attr("stroke", this.colors[`BActive`]);
		$(`#ArcCA`).attr("stroke", this.colors[`CActive`]);
		$(`#TriCA`).attr("stroke", this.colors[`CActive`]);
		$(`#ArcCB`).attr("stroke", this.colors[`CActive`]);
		$(`#TriCB`).attr("stroke", this.colors[`CActive`]);

		$(`.playerALabel`).css('color', this.colors[`AActive`]);
		$(`.playerBLabel`).css('color', this.colors[`BActive`]);
		$(`.playerCLabel`).css('color', this.colors[`CActive`]);
		$(`.pipA`).css('backgroundColor', this.colors[`AActive`]);
		$(`.pipB`).css('backgroundColor', this.colors[`BActive`]);
		$(`.pipC`).css('backgroundColor', this.colors[`CActive`]);
		$(`.horizontalVizPlayerA`).css('backgroundColor', this.colors[`AActive`]);
		$(`.horizontalVizPlayerB`).css('backgroundColor', this.colors[`BActive`]);
		$(`.horizontalVizPlayerC`).css('backgroundColor', this.colors[`CActive`]);
		$(`.horizontalLabelPlayerA`).css('color', this.colors[`AActive`]);
		$(`.horizontalLabelPlayerB`).css('color', this.colors[`BActive`]);
		$(`.horizontalLabelPlayerC`).css('color', this.colors[`CActive`]);
		$(`.textVizPlayerA`).css('color', this.colors['AActive']);
		$(`.textVizPlayerB`).css('color', this.colors['BActive']);
		$(`.textVizPlayerC`).css('color', this.colors['CActive']);
	}
	TogglePlayerHighlight(player) {
		switch(player) {
			case 1:
				this.HighlightOnly(1, true);
				break;
			case 2:
				this.HighlightOnly(2, true);
				break;
			case 3:
				this.HighlightOnly(3, true);
				break;
		}
	}
	TeamTalkFillDepletion(teamNum) {
		if(this.talkTimeElapsed < this.talkTimeLimit) {
			this.fillArcs[teamNum].cur += this.fillIncrement;
			$(`#Fill${this.playerTags[teamNum]}`).attr("d", this.DrawArc(this.fillArcs[teamNum].x, this.fillArcs[teamNum].y, this.fillArcs[teamNum].mr, this.fillArcs[teamNum].start, this.fillArcs[teamNum].cur));
		}
	}
	CalculateEdgeWidths() {
		if (this.playerMsg && this.playerMsg.length > 0) {
			// Add all messages from/to each player
			if (this.totalMsgs > 0) {
				// Divide 100 by that total to get % rep of each message
				let msgPct = 1 / this.totalMsgs;
				let timePct = 100 / this.sessionTimeSec;
				// Multiply each arc # by %
				this.edgeWidths["AB"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[1].msgToB * msgPct)));
				this.edgeWidths["AC"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[1].msgToC * msgPct)));
				this.edgeWidths["BA"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[2].msgToA * msgPct)));
				this.edgeWidths["BC"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[2].msgToC * msgPct)));
				this.edgeWidths["CA"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[3].msgToA * msgPct)));
				this.edgeWidths["CB"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.playerMsg[3].msgToB * msgPct)));
				this.textVizPct["A"] = ((timePct * this.sessionPlayerTimes[1])).toFixed(1);
				this.textVizPct["B"] = ((timePct * this.sessionPlayerTimes[2])).toFixed(1);
				this.textVizPct["C"] = ((timePct * this.sessionPlayerTimes[3])).toFixed(1);
				this.textVizPct["N"] = (100.0 - (+this.textVizPct["A"] + +this.textVizPct["B"] + +this.textVizPct["C"])).toFixed(1);
			} else {
				this.edgeWidths["AB"] = this.minEdgeWidth;
				this.edgeWidths["AC"] = this.minEdgeWidth;
				this.edgeWidths["BA"] = this.minEdgeWidth;
				this.edgeWidths["BC"] = this.minEdgeWidth;
				this.edgeWidths["CA"] = this.minEdgeWidth;
				this.edgeWidths["CB"] = this.minEdgeWidth;
				this.textVizPct["A"] = 0;
				this.textVizPct["B"] = 0;
				this.textVizPct["C"] = 0;
				this.textVizPct["N"] = 0;
			}
		} else {
			this.edgeWidths["AB"] = this.minEdgeWidth;
			this.edgeWidths["AC"] = this.minEdgeWidth;
			this.edgeWidths["BA"] = this.minEdgeWidth;
			this.edgeWidths["BC"] = this.minEdgeWidth;
			this.edgeWidths["CA"] = this.minEdgeWidth;
			this.edgeWidths["CB"] = this.minEdgeWidth;
			this.textVizPct["A"] = 0;
			this.textVizPct["B"] = 0;
			this.textVizPct["C"] = 0;
			this.textVizPct["N"] = 0;
		}
	}
	GetEdgeWidth(name) {
		return this.edgeWidths[name];
	}
    SetArcWidth(arcName, width, final = false) {
		let prefix = '';
		if(final === true) {
			prefix = 'final';
		}
        if(width > 0) {
            let aw = width < this.maxArcWidth ? width : this.maxArcWidth;
            let tw = width < this.maxTriWidth ? width : this.maxTriWidth;

			$(`#${prefix}Arc${arcName}`).attr("stroke-width", aw);
			$(`#${prefix}Tri${arcName}`).attr("stroke-width", tw);
		}
	}
	PolarToCartesian(centerX, centerY, radius, angleInDegrees) {
		let angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	}
	DrawArcOutline(x, y, innerRadius, outerRadius, startAngle, endAngle){
		let starti = this.PolarToCartesian(x, y, innerRadius, endAngle);
		let endi = this.PolarToCartesian(x, y, innerRadius, startAngle);
		let starto = this.PolarToCartesian(x, y, outerRadius, endAngle);
		let endo = this.PolarToCartesian(x, y, outerRadius, startAngle);
		let arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
		return `M ${starti.x} ${starti.y} A ${innerRadius} ${innerRadius} 0 ${arcSweep} 0 ${endi.x} ${endi.y} L ${endo.x} ${endo.y} M ${starto.x} ${starto.y} L ${starti.x} ${starti.y} M ${starto.x} ${starto.y} A ${outerRadius} ${outerRadius} 0 ${arcSweep} 0 ${endo.x} ${endo.y}`;
	}
	DrawArc(x, y, radius, startAngle, endAngle){
		let start = this.PolarToCartesian(x, y, radius, endAngle);
		let end = this.PolarToCartesian(x, y, radius, startAngle);
		let arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
		return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${arcSweep} 0 ${end.x} ${end.y}`;
	}
	DrawArcs(final = false) {
		let prefix = '';
		if(final === true) {
			prefix = 'final';
		}
		$(`#${prefix}BaseA`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[1].start, this.fillArcs[1].end));
		$(`#${prefix}FillA`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[1].start, this.fillArcs[1].cur));
		$(`#${prefix}ArcA`).attr("d", this.DrawArcOutline(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].ir, this.fillArcs[1].or, this.fillArcs[1].start, this.fillArcs[1].end));

		$(`#${prefix}BaseB`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[2].start, this.fillArcs[2].end));
		$(`#${prefix}FillB`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[2].start, this.fillArcs[2].cur));
		$(`#${prefix}ArcB`).attr("d", this.DrawArcOutline(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].ir, this.fillArcs[1].or, this.fillArcs[2].start, this.fillArcs[2].end));

		$(`#${prefix}BaseC`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[3].start, this.fillArcs[3].end));
		$(`#${prefix}FillC`).attr("d", this.DrawArc(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].mr, this.fillArcs[3].start, this.fillArcs[3].cur));
		$(`#${prefix}ArcC`).attr("d", this.DrawArcOutline(this.fillArcs[1].x, this.fillArcs[1].y, this.fillArcs[1].ir, this.fillArcs[1].or, this.fillArcs[3].start, this.fillArcs[3].end));

		this.CalculateEdgeWidths();

		this.SetArcWidth("AB", this.GetEdgeWidth("AB"), final);
        this.SetArcWidth("AC", this.GetEdgeWidth("AC"), final);
        this.SetArcWidth("BA", this.GetEdgeWidth("BA"), final);
        this.SetArcWidth("BC", this.GetEdgeWidth("BC"), final);
        this.SetArcWidth("CA", this.GetEdgeWidth("CA"), final);
		this.SetArcWidth("CB", this.GetEdgeWidth("CB"), final);
	}
	DrawOrderedMessageViz(final = false) {
		let obhName = 'orderBarHolder';
		let prefix = '';
		if(final === true) {
			obhName = 'finalOrderBarHolder';
			prefix = 'final';
		}
		$(`#${obhName}`).empty();
		let start = 0;
		if(this.pips.length >= this.pipShiftThreshold) {
			start = this.pips.length - this.pipShiftThreshold;
		}
		let idx = 0;
		let pips = '';
		for(let p = start; p < this.pips.length; p++) {
			pips += `<div id="${prefix}orderPip${p}" class="pip${this.playerTags[this.pips[p]]}" ></div>`;
			idx++;
		}
		$(`#${obhName}`).append(pips);
	}
	CreatePip(teamNum, drawViz = true) {
		if(teamNum > 0) {
			this.pips.push(teamNum);

			if(drawViz === true) {
				this.DrawOrderedMessageViz();
			}
		}
	}
	UpdatePctViz() {
		$("#finalPlayerAName").text(this.players[1]?.name || '');
		$("#finalPlayerBName").text(this.players[2]?.name || '');
		$("#finalPlayerCName").text(this.players[3]?.name || '');

		$("#textVizPlayerACount").text(this.playerMsg[1].numMsg);
		$("#finalPlayerACount").text(this.playerMsg[1].numMsg);
		$("#textVizPlayerBCount").text(this.playerMsg[2].numMsg);
		$("#finalPlayerBCount").text(this.playerMsg[2].numMsg);
		$("#textVizPlayerCCount").text(this.playerMsg[3].numMsg);
		$("#finalPlayerCCount").text(this.playerMsg[3].numMsg);

		let apct = this.textVizPct['A'];
		let bpct = this.textVizPct['B'];
		let cpct = this.textVizPct['C'];
		let npct = this.textVizPct['N'];

		if(this.totalMsgs > 0) {
			if(apct > 0) {
				$("#horizontalLabelPlayerA").css("width", `${apct}%`);
				$("#horizontalLabelPlayerA").text(`${apct}%`);
				$("#horizontalVizPlayerA").css("width", `${apct}%`);
				$("#horizontalVizPlayerA").show();

				$("#finalHorizontalLabelPlayerA").css("width", `${apct}%`);
				$("#finalHorizontalLabelPlayerA").text(`${apct}%`);
				$("#finalHorizontalVizPlayerA").css("width", `${apct}%`);
				$("#finalHorizontalVizPlayerA").show();
			} else {
				$("#horizontalLabelPlayerA").css("width", `${apct}%`);
				$("#horizontalLabelPlayerA").text('');
				$("#horizontalVizPlayerA").css("width", `${apct}%`);
				$("#horizontalVizPlayerA").hide();

				$("#finalHorizontalLabelPlayerA").css("width", `${apct}%`);
				$("#finalHorizontalLabelPlayerA").text('');
				$("#finalHorizontalVizPlayerA").css("width", `${apct}%`);
				$("#finalHorizontalVizPlayerA").hide();
			}
			if(bpct > 0) {
				$("#horizontalLabelPlayerB").css("width", `${bpct}%`);
				$("#horizontalLabelPlayerB").text(`${bpct}%`);
				$("#horizontalVizPlayerB").css("width", `${bpct}%`);
				$("#horizontalVizPlayerB").show();

				$("#finalHorizontalLabelPlayerB").css("width", `${bpct}%`);
				$("#finalHorizontalLabelPlayerB").text(`${bpct}%`);
				$("#finalHorizontalVizPlayerB").css("width", `${bpct}%`);
				$("#finalHorizontalVizPlayerB").show();
			} else {
				$("#horizontalLabelPlayerB").css("width", `${bpct}%`);
				$("#horizontalLabelPlayerB").text('');
				$("#horizontalVizPlayerB").css("width", `${bpct}%`);
				$("#horizontalVizPlayerB").hide();

				$("#finalHorizontalLabelPlayerB").css("width", `${bpct}%`);
				$("#finalHorizontalLabelPlayerB").text('');
				$("#finalHorizontalVizPlayerB").css("width", `${bpct}%`);
				$("#finalHorizontalVizPlayerB").hide();
			}
			if(cpct > 0) {
				$("#horizontalLabelPlayerC").css("width", `${cpct}%`);
				$("#horizontalLabelPlayerC").text(`${cpct}%`);
				$("#horizontalVizPlayerC").css("width", `${cpct}%`);
				$("#horizontalVizPlayerC").show();

				$("#finalHorizontalLabelPlayerC").css("width", `${cpct}%`);
				$("#finalHorizontalLabelPlayerC").text(`${cpct}%`);
				$("#finalHorizontalVizPlayerC").css("width", `${cpct}%`);
				$("#finalHorizontalVizPlayerC").show();
			} else {
				$("#horizontalLabelPlayerC").css("width", `${cpct}%`);
				$("#horizontalLabelPlayerC").text('');
				$("#horizontalVizPlayerC").css("width", `${cpct}%`);
				$("#horizontalVizPlayerC").hide();

				$("#finalHorizontalLabelPlayerC").css("width", `${cpct}%`);
				$("#finalHorizontalLabelPlayerC").text('');
				$("#finalHorizontalVizPlayerC").css("width", `${cpct}%`);
				$("#finalHorizontalVizPlayerC").hide();
			}
			if(npct > 0) {
				$("#horizontalLabelNone").css("width", `${npct}%`);
				$("#horizontalLabelNone").text(`${npct}%`);
				$("#horizontalVizNone").css("width", `${npct}%`);
				$("#horizontalVizNone").show();

				$("#finalHorizontalLabelNone").css("width", `${npct}%`);
				$("#finalHorizontalLabelNone").text(`${npct}%`);
				$("#finalHorizontalVizNone").css("width", `${npct}%`);
				$("#finalHorizontalVizNone").show();
			} else {
				$("#horizontalLabelNone").css("width", `${npct}%`);
				$("#horizontalLabelNone").text('');
				$("#horizontalVizNone").css("width", `${npct}%`);
				$("#horizontalVizNone").hide();

				$("#finalHorizontalLabelNone").css("width", `${npct}%`);
				$("#finalHorizontalLabelNone").text('');
				$("#finalHorizontalVizNone").css("width", `${npct}%`);
				$("#finalHorizontalVizNone").hide();
			}
		}
	}
	UpdateViz(final) {
		this.DrawArcs(final);
		this.UpdatePctViz();
		this.DrawOrderedMessageViz(true);
	}
	EndChatClicked() {
		this.networkManager.SendEvent({ teamNumber: this.teamNumber }, this.networkManager.msgTypes.VTESO);
	}
	ResumeTimerMessage() {
		$("#endChatBtn").attr("onclick", "app.scene.scenes[0].EndChatClicked();");
		$("#endChatYesBtn").attr("onclick", "app.scene.scenes[0].EndChatVoteYes();");
		$("#endChatNoBtn").attr("onclick", "app.scene.scenes[0].EndChatVoteNo();");

		$("#endChatBtnHolder").hide();
		$("#endChatTimer").show();
	}
	DoImmediateEndSession() {
		$("#endChatBtn").attr("onclick", "app.scene.scenes[0].EndChatClicked();");
		$("#endChatYesBtn").attr("onclick", "app.scene.scenes[0].EndChatVoteYes();");
		$("#endChatNoBtn").attr("onclick", "app.scene.scenes[0].EndChatVoteNo();");

		$("#endChatBtnHolder").hide();
		$("#endChatHolder").css('display', 'none');

		this.vtesSent = true;
		this.networkManager.SendEvent({}, this.networkManager.msgTypes.VTHE);

		this.CancelEndSessionCountdownTimer();
		this.EndSession();
	}
	Show5SecondMessage() {
		$("#PlayerAVote").hide();
		$("#PlayerBVote").hide();
		$("#PlayerCVote").hide();
		$("#endChatPrompt").html('Both partners have lost connection, session is ending...');
		$("#endChatNotification").show();
		$("#endChatPrompt").show();
		$("#endChatBtnHolder").hide();
		$("#endChatTimer").hide();
	}
	CancelEndSessionCountdownTimer() {
		if(this.endSessionCountdownTimer) {
			window.clearInterval(this.endSessionCountdownTimer);
			this.endSessionCountdownTimer = null;
		}
		if(this.endSessionTimer) {
			window.clearTimeout(this.endSessionTimer);
			this.endSessionTimer = null;
		}
	}
	ShowTimerMessage(from = 0, delayTime = 59, doUpdate = true) {
		$("#PlayerAVote").hide();
		$("#PlayerBVote").hide();
		$("#PlayerCVote").hide();
		$("#endChatPrompt").html(`Player <span id='endChatRequestor'>Player</span> has disconnected. Session will end if they are unable to rejoin.`);
		$("#endChatRequestor").css("color", this.colors[`${this.playerTags[from]}Active`]);
		$("#endChatRequestor").text(this.TruncateText(this.players[from].name, 18));
		$("#endChatNotification").show();
		$("#endChatPrompt").show();
		$("#endChatBtnHolder").hide();
		$("#endChatTimer").show();
		if(doUpdate === true) {
			this.UpdateTimerMessage(from, delayTime);
		}
		this.menu = "STM";
	}
	UpdateTimerMessage(from, delayTime) {
		let timeLabel = ":";
		delayTime--;
		if(parseInt(delayTime) >= 10)
			timeLabel += delayTime;
		else
			timeLabel += "0" + delayTime;
		timeLabel += " until end of session.";
		$("#endChatTimer").text(timeLabel);
		this.CancelEndSessionCountdownTimer();
		if(delayTime <= 0) {
			this.endSessionTimerTN = -1;
			this.CancelEndSessionCountdownTimer();
			this.EndSession();
		} else {
			this.endSessionCountdownTimer = window.setInterval((from, delayTime) => {
				this.UpdateTimerMessage(from, delayTime);
			}, 1000, from, delayTime);
		}
	}
	InitEndChatDialog(from = 0, players) {
		this.menu = "IECD";
		this.iecdFrom = from;
		$("#endChatBtn").attr("onclick", "");
		$("#PlayerAVote").hide();
		$("#PlayerBVote").hide();
		$("#PlayerCVote").hide();
		$("#endChatPrompt").html(`Player <span id='endChatRequestor'>Player</span> has requested to end the chat and get the results. If everyone agrees, the chat will end.  Would you like to end the chat?`);
		$("#endChatRequestor").css("color", this.colors[`${this.playerTags[from]}Active`]);
		$("#endChatRequestor").text(this.TruncateText(this.players[from].name, 18));
		$("#endChatNotification").show();
		$("#endChatPrompt").show();
		$("#endChatBtnHolder").show();
		$("#endChatTimer").hide();
		$("#endChatHolder").css('display', 'block');
	}
	UpdateEndChatPlayer(teamNum, players = this.players) {
		$("#endChatBtn").attr("onclick", "");
		let elTag = `#Player${this.playerTags[teamNum]}Vote`;
		if(players[teamNum]) {
			let col = this.colors[`${this.playerTags[teamNum]}Active`];
			let name = this.TruncateText(players[teamNum].name, 18);
			let dotLeft = '10px';

			if(this.teamNumber !== teamNum) {
				if(players[teamNum].votedToEndSession === true) {
					$(elTag).html(`<div style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></div><div style='left: 160px;'>Player <span style='color: ${col};'>${name}</span> agreed to end the chat.</div>`);
				} else if(players[teamNum].votedToEndSession === false) {
					$(elTag).html(`<div style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></div><div style='left: 160px;'>Player <span style='color: ${col};'>${name}</span> does not want to end the chat.</div>`);
				} else if(players[teamNum].votedToEndSession === null) {
					$(elTag).html(`<div style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></div><div style='left: 160px;'>Waiting for <span style='color: ${col};'>${name}</span>.</div>`);
				}
			} else {
				if(players[this.teamNumber].vtesSent === true) {
					$(elTag).html(`<div style='left: 160px;'><span style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></span><span style='color: ${col};'>You</span> have requested to end the chat and get the results.  If everyone agrees, the chat will end.</div>`);
				} else if(players[this.teamNumber].votedToEndSession === true) {
					$(elTag).html(`<div style='left: 160px;'><span style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></span><span style='color: ${col};'>You</span> agreed to end the chat.</div>`);
				} else if(players[this.teamNumber].votedToEndSession === false) {
					$(elTag).html(`<div style='left: 160px;'><span style='left: ${dotLeft}; width: 16px; height: 16px; border-radius: 100%; background-color: ${col}; position: absolute; margin-right: 10px;'></span><span style='color: ${col};'>You</span> do not want to end the chat.</div>`);
				}
			}
		} else {
			$(elTag).html('');
		}
	}
	UpdateEndChatDialog() {
		this.menu = "UECP";
		$("#endChatNotification").show();
		$("#endChatPrompt").hide();
		$("#endChatBtnHolder").hide();
		$("#endChatHolder").css('display', 'block');

		this.UpdateEndChatPlayer(1, this.players);
		this.UpdateEndChatPlayer(2, this.players);
		this.UpdateEndChatPlayer(3, this.players);

		$("#PlayerAVote").show();
		$("#PlayerBVote").show();
		$("#PlayerCVote").show();
	}
	EndChatVoteYes(id) {
		$(`#vt${id}Y`).hide();
		$(`#vt${id}N`).hide();
		this.networkManager.SendEvent({ vote: true }, this.networkManager.msgTypes.VTES);
	}
	EndChatVoteNo(id) {
		$(`#vt${id}Y`).hide();
		$(`#vt${id}N`).hide();
		this.networkManager.SendEvent({ vote: false }, this.networkManager.msgTypes.VTES);
	}
	SetEndChatToReset(msg = "") {
		$("#endChatBtn").attr("onclick", "");
		$("#endChatPrompt").html(msg);
		$("#endChatPrompt").show();
		$("#endChatBtnHolder").hide();
		$("#endChatTimer").hide();
		$("#PlayerAVote").hide();
		$("#PlayerBVote").hide();
		$("#PlayerCVote").hide();
	}
	ResetEndChat() {
		this.menu = "";
		this.iecdFrom = 0;
		$("#endChatBtn").attr("onclick", "app.scene.scenes[0].EndChatClicked();");
		this.vtesSent = false;
		this.VTESVisible = false;
		this.players[1].vtes = false;
		this.players[1].vtesSent = false;
		this.players[1].votedToEndSession = null;
		this.players[2].vtes = false;
		this.players[2].vtesSent = false;
		this.players[2].votedToEndSession = null;
		this.players[3].vtes = false;
		this.players[3].vtesSent = false;
		this.players[3].votedToEndSession = null;
		$("#endChatPrompt").html("");
		$("#endChatPrompt").hide();
		$("#endChatBtnHolder").hide();
		$("#endChatTimer").hide();
		$("#endChatNotification").hide();
		$("#endChatHolder").css('display', 'none');
	}
	EndSession() {
		this.menu = "";
		this.GoToResultsScreen();
	}
	TimedEndSession() {
		this.Show5SecondMessage();
		window.setTimeout(() => {
			this.EndSession();
		}, 5000);
	}
	EndSessionWithTimer(teamNumber) {
		this.endSessionTimerTN = teamNumber;
		this.ShowTimerMessage(teamNumber, this.dropDelayTimer);
		this.endSessionTimer = window.setTimeout(() => {
			this.CancelEndSessionCountdownTimer();
			this.EndSession();
		}, (this.dropDelayTimer * 1000));
	}
	FinalContinueClicked() {
		this.GoToReportDownloadScreen();
	}
	GoToReportDownloadScreen() {
		this.DrawOrderedMessageViz(true);

        $("#titleMenu").css('display', 'none');
        $("#mainFrame").css('display', 'block');
		$("#reportDownloadModal").css('display', 'block');
		$("#resultsContinueBtn").hide();

		let h = `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta http-equiv="content-type" content="text/html; charset=utf-8" />
				<meta charset="utf-8" />
				<title>Libra Text Summary Report</title>
				<meta http-equiv="pragma" content="no-cache" />
				<style>
		.resultsMenu {
			position: absolute; 
			left: 20px;
			top: 20px;
			width: 605px; 
			height: 855px; 
			background-color: #2f4156;
			border-radius: 5px;
			border: 3px solid #8A8D91;
			box-shadow: -8.5px 8.5px 0 0 rgba(18, 77, 107, 0.25);
		}
		.resultsFinalChatText {
			position: absolute;
			top: 15px;
			width: 100%;
			height: 24px;
			opacity: 0.75; 
			font-family: MontserratSemiBold;
			font-size: 24px;
			font-weight: 600;
			text-align: center;
			color: rgba(255, 255, 255, 0.75);
			line-height: 24px;
		}
		.finalCommunicationFeedback {
			position: absolute;
			top: 95px;
			width: 100%;
			font-family: MontserratSemiBold;
			font-size: 24px;
			font-weight: 600;
			text-align: center;
			color: rgba(255, 255, 255, 0.25);
			z-index: 10;
		}
		.directionOfChat {
			position: absolute; 
			left: 20px; 
			top: 145px; 
			font-family: MontserratSemiBold; 
			font-weight: 600;
			font-size: 16px; 
			color: rgba(255, 255, 255, 0.25); 
			z-index: 100;
			line-height: 20px;
			text-align: center;
		}
		.finalPlayerAName {
			position: absolute;
			left: 75px;
			top: 250px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #ffc300;
			width: 50px;
			text-align: center;
		}
		.finalPlayerBName {
			position: absolute;
			left: 465px;
			top: 250px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #19b4ff;
			width: 50px;
			text-align: center;
		}
		.finalPlayerCName {
			position: absolute;
			left: 285px;
			top: 570px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #ff5f57;
			width: 50px;
			text-align: center;
		}
		.finalPlayerACount {
			position: absolute;
			left: 75px;
			top: 275px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #ffc300;
			width: 50px;
			text-align: center;
		}
		.finalPlayerBCount {
			position: absolute;
			left: 465px;
			top: 275px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #19b4ff;
			width: 50px;
			text-align: center;
		}
		.finalPlayerCCount {
			position: absolute;
			left: 285px;
			top: 595px;
			z-index: 100;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: #ff5f57;
			width: 50px;
			text-align: center;
		}
		.vizSVGHolder {
			position: absolute; 
			left: 117px; 
			top: 55px; 
			width: 364px; 
			height: 364px;
		}
		.finalSVGHolder {
			position: absolute; 
			left: 20px; 
			top: 63px; 
			width: 895px; 
			height: 546px; 
			background-color: #253548; 
			border-radius: 10px;
		}
		.finalSVGHolder {
			position: absolute; 
			left: 10px; 
			top: 90px; 
			width: 585px; 
			height: 755px; 
			background-color: #253548; 
			border-radius: 10px;
		}
		.finalHorizontalBarLabels {
			position: absolute;
			display: inline-flex;
			left: 20px;
			top: 800px;
			width: 560px;
			height: 24px;  
		}
		.finalHorizontalLabelPlayerA {
			width: 25%;
			color: #ffc300;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 24px;
		}
		.finalHorizontalLabelPlayerB {
			width: 25%;
			color: #19b4ff;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 24px;
		}
		.finalHorizontalLabelPlayerC {
			width: 25%;
			color: #ff5f57;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 24px;
		}
		.finalHorizontalLabelNone {
			width: 25%;
			color: #2f4156;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 24px;
		}
		.finalHorizontalVizBarHolder {
			position: absolute;
			display: inline-flex;
			left: 20px;
			top: 750px;
			width: 560px;
			height: 48px;
			border-radius: 5px;
		}
		.finalHorizontalVizPlayerA {
			width: 25%;
			background-color: #ffc300;
			border-top-left-radius: 5px;
			border-bottom-left-radius: 5px;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 48px;
		}
		.finalHorizontalVizPlayerB {
			width: 25%;
			background-color: #19b4ff;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 48px;
		}
		.finalHorizontalVizPlayerC {
			width: 25%;
			background-color: #ff5f57;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 48px;
		}
		.finalHorizontalVizNone {
			width: 25%;
			border-top-right-radius: 5px;
			border-bottom-right-radius: 5px;
			background-color: #2f4156;
			font-family: MontserratBold;
			font-size: 16px;
			text-align: center;
			line-height: 24px;
		}
		.finalTextBarVizHolder {
			position: absolute;
			left: 20px;
			top: 627px;
			width: 585px;
			height: 159px;
		}
		.finalOrderLabel {
			position: absolute;
			top: 640px;
			left: 20px;
			font-size: 16px;
			font-family: 'MontserratSemiBold';
			color: rgba(255, 255, 255, 0.25);
		}
		.pipA {
			display: grid;
			border-radius: 2px;
			background-color: #ffc300;
		}
		.pipB {
			display: grid;
			border-radius: 2px;
			background-color: #36bcff;
		}
		.pipC {
			display: grid;
			border-radius: 2px;
			background-color: #f25a52;
		}	
		.finalOrderBarHolder {
			position: absolute;
			display: grid;
			left: 20px;
			top: 665px;
			width: 560px;
			height: 48px;
			background-color: #2f4156;
			border-radius: 5px;
			grid-auto-columns: 4px;
			grid-gap: 1px;
			grid-template-rows: 100%;
			grid-auto-flow: column;
		}
		.finalProportionLabel {
			position: absolute;
			top: 725px;
			left: 20px;
			font-size: 16px;
			font-family: 'MontserratSemiBold';
			color: rgba(255, 255, 255, 0.25);
		}
		.numberOfMessages {
			position: absolute;
			left: 22px;
			top: 19px;
			width: 100%;
			font-family: MontserratSemiBold;
			font-size: 20px;
			color: rgba(255, 255, 255, 0.25);
			line-height: 20px;
		}
		</style>
		</head>
		<body>`;

		let resultsMenu = $('<div>').append($('#resultsMenu').clone()).html();
		h += `${resultsMenu}</body></html>`;

		let blob = new Blob([h], { type: "text/html" });
		let link = document.createElement("a");
		link.download = `report-${this.GetReportName()}.html`;
		link.href = URL.createObjectURL(blob);
		console.log(link.href); // this line should be here
		link.click();

		window.setTimeout(() => {
			window.onbeforeunload = "";
			let oldref = window.location.href.split("?"[0])[0];
			window.location.href = oldref + "?&roomCode=" + this.classCode + "&name=" + this.players[this.teamNumber].name;
		}, 3500);

		$("#resultsMenu").css('display', 'none');
	}
	GetReportName() {
		return this.classCode + "_" + this.startTime;
	}
}