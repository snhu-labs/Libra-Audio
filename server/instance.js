class InstanceServer {
    constructor(fullcode = '0000', config) {
        this.config = config;
        this.fullcode = fullcode.toString();
        this.classcode = this.fullcode.substr(0, 2);
        this.sesscode = this.fullcode.substr(2, 2);
        let awsm = require('./awsManager').AWSManager;
        this.awsManager = new awsm(this.config);
        this.awsManager.main = this;
        let tlm = require('./telemetryManager').TelemetryManager;
        
        this.sessionStates = {
            'WAITING_FOR_USERS': 1,
            'IN_SESSION': 2,
            'RESULTS_MENU': 3,
            'CANCELING_JOIN': 4
        };
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

        this.currentState = this.sessionStates.WAITING_FOR_USERS;
        this.minimumUsersToStartSession = 4;
        this.minimumVotesToEndSession = 2;

        this.slotTags = ['0', 'A', 'B', 'C'];
        this.users = [{}]; // first slot filled with a null
        this.dashboard = null;

		this.sessionTimer = null;
        this.sessionIncrement = 0;
        this.sessionInfo = [];
        this.sessionInfo[this.sessionIncrement] = {};
        this.sessionInfo[this.sessionIncrement].startTime = 0;
        this.sessionInfo[this.sessionIncrement].sessionTimeSec = 0;
        this.sessionInfo[this.sessionIncrement].sessionPlayerTimes = [0, 0, 0, 0];
        this.sessionInfo[this.sessionIncrement].totalMsg = 0;
        this.sessionInfo[this.sessionIncrement].playerNames = ['', '', '', ''];
        this.sessionInfo[this.sessionIncrement].playerMsg = [];
		this.sessionInfo[this.sessionIncrement].playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0,
            timeSpent: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0,
            timeSpent: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0,
            timeSpent: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[3] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0,
            timeSpent: 0
        };
        this.pips = [];
        this.pips[this.sessionIncrement] = [];

        this.talkCooldownMS = 2000;
        this.talkTimeElapsed = 0;
        this.talkMinTimeForMsg = 1000;
        this.talkTimeLimit = 30000;
        this.talkDepletionIntervalMS = 250;
        this.playerCanTalk = [true, true, true, true];
        this.playerTalkTimers = [null, null, null, null];
        this.playerCooldownTimers = [null, null, null, null];
        this.currentTalkingSlot = -1;
        this.currentTalkTarget = -1;
        this.lastTalkTarget = -1;

        this.numDropped = 0;
        this.sessionResetTimer = null;
        this.telemetryManager = new tlm(this, this.fullcode);
        this.telemetryManager.Start(this.sessionIncrement);
    }
    RegisterDashboard(dashboard) {
        console.log("Registering Dashboard User", this?.dashboard?.status);
        if(this.dashboard === null || this.dashboard.status !== "joined") {
            this.dashboard = dashboard;
            dashboard.server = this;
            dashboard.status = "joined";
            console.log("Dashboard User Registered");

            if(this.currentState === this.sessionStates.IN_SESSION) {
                this.SendToDashboard({ type: this.msgTypes.PLAYER_JOIN, slot: 1, name: this.users[1].username });
                this.SendToDashboard({ type: this.msgTypes.PLAYER_JOIN, slot: 2, name: this.users[2].username });
                this.SendToDashboard({ type: this.msgTypes.PLAYER_JOIN, slot: 3, name: this.users[3].username });
                for(let s = 0; s < this.sessionIncrement+1; s++) {
                    this.SendToDashboard({ type: this.msgTypes.SEND_STATS, sessionNum: s, stats: this.sessionInfo[s], pips: this.pips[s] });
                }
            }

            return true;
        }
        return false;
    }
    IsAllowingConnections(user) {
        if(this.currentState === this.sessionStates.WAITING_FOR_USERS ||
            this.currentState === this.sessionStates.IN_SESSION) {
            if(user.server === this) {
                if(user.status === "dropped" || user.status === "unjoined") {
                    if(user.status === "dropped" && this.numDropped >= 1) {
                        user.status = "unjoined";
                        this.numDropped -= 1;
                        if(this.numDropped < 2) {
                            this.CancelResetTimer();
                        }
                    }
                    
                    console.log(`Receiving rejoin from ${user.username}`);
                    this.Register(user);
                    return true;
                }
            } else if(this.users.length < this.minimumUsersToStartSession) {
                console.log(`Allowing new connection from ${user.username} to ${this.fullcode}`);
                this.Register(user);
                return true;
            } else {
                console.log("IsAllowingConnections error: Wrong server or pop");
            }
        } else {
            console.log("IsAllowingConnections error: Server not waiting");
        }
        return false;
    }
    Register(user) {
        if(this.users.length < this.minimumUsersToStartSession) {
            let availSlot = this.GetFirstAvailableSlot(user);
            if(availSlot > 0) {
                user.server = this;
                user.tag = this.slotTags[availSlot];
                user.slot = availSlot;
                user.status = "joined";
                this.users[availSlot] = user;

                this.SendToUser(user.slot, { type: this.msgTypes.SLOT_NUM, slot: user.slot });
                console.log(`Registered ${user.username} as user#${availSlot} with tag:${user.tag}`);
                for(let u = 1; u < this.users.length; u++) {
                    if(this.users[u] !== null) {
                        this.SendToUsers({ type: this.msgTypes.PLAYER_JOIN, slot: u, name: this.users[u].username }, []);
                        this.SendToDashboard({ type: this.msgTypes.PLAYER_JOIN, slot: u, name: this.users[u].username });
                    }
                }
            } else {
                console.log("Register error", availSlot);
            }

            if(this.CheckEnoughUsersToStart()) {
                this.StartSession();
            }
        }
    }
    ReconnectUser(user) {
        console.log("Reconnecting user", user.slot);
        user.server = this;
        user.tag = this.slotTags[user.slot];
        user.status = "joined";
        this.users[user.slot] = user;
        this.numDropped -= 1;
        if(this.numDropped < 2) {
            this.CancelResetTimer();
        }

        this.users[user.slot].Send({ type: this.msgTypes.REJOIN });
    }
    GetFirstAvailableSlot(user) {
        let firstEmpty = -1;
        if(this.users.length === 1 && 
            (this.users[0] && Object.keys(this.users[0]).length === 0)) {
            return 1;
        }
        for(let u = 1; u < this.users.length; u++) {
            if(!this.users[u] || Object.keys(this.users[u]).length === 0) {
                firstEmpty = u;
            } else if(this.users[u].username === user.username) {
                return u;
            }
        }
        if(firstEmpty === -1 && this.users.length < this.minimumUsersToStartSession) {
            firstEmpty = this.users.length;
        }
        return firstEmpty;
    }
    RejoinUser(userSlot) {
        console.log("Sending rejoin info for", userSlot);
        // Ensure slot is set
        this.SendToUser(userSlot, { type: this.msgTypes.SLOT_NUM, slot: userSlot });
        // Start that user's session
        let ets = this.CheckEnoughUsersToStart();
        if(ets) {
            console.log("Rejoin start");
            let players = this.GetPlayersPack();
            this.SendToUser(userSlot, { type: this.msgTypes.SESS_START, players: players });
        }
        // Send stats
        this.SendToUser(userSlot, { type: this.msgTypes.SEND_STATS, stats: this.sessionInfo[this.sessionIncrement] });
        this.telemetryManager.Log({ eventType: 'Player', actionType: 'Rejoin', actionString: { User: userSlot } });
        // Let everyone know if we have enough to end any end-session countdowns
        if(ets) {
            this.SendToUsers({ type: this.msgTypes.DROPCANCEL, player: this.GetPlayer(userSlot) }, [userSlot]);
        }
    }
    SendToUser(userSlot, data, isAudio = false) {
        if(this.users[userSlot] && this.users[userSlot].tag) {
            this.users[userSlot].Send(data, isAudio);
        }
    }
    SendToUsers(data, excludeSlots = [], isAudio = false) {
        for(let u = 1; u < this.users.length; u++) {
            if(!excludeSlots.includes(u)) {
                this.SendToUser(u, data, isAudio);
            }
        }
    }
    SendAudioToUsers(data, excludeSlots = []) {
        for(let u = 1; u < this.users.length; u++) {
            if(!excludeSlots.includes(u)) {
                this.users[u].SendAudio(data);
            }
        }
    }
    SendOnlyToUsers(data, recipients = [], isAudio = false) {
        for(let u = 1; u < this.users.length; u++) {
            if(recipients.includes(u) && this.users[u].tag) {
                this.SendToUser(u, data, isAudio);
            }
        }
    }
    SendAudioOnlyToUsers(data, recipients = []) {
        for(let u = 0; u < this.recipients.length; u++) {
            if(this.users[u].tag) {
                this.users[u].SendAudio(u, data);
            }
        }
    }
    SendToDashboard(data) {
        if(this.dashboard) {
            this.dashboard.Send(data);
        }
    }
    GetPlayer(userSlot) {
        if(this.users[userSlot]) {
            return {
                name: this.users[userSlot].username,
                tag: this.users[userSlot].tag,
                slot: this.users[userSlot].slot,
                votedToEndSession: this.users[userSlot].votedToEndSession,
                vtesSent: this.users[userSlot].vtesSent
            }
        } else {
            return {};
        }
    }
    GetPlayersPack() {
        let res = [];
        for(let u = 0; u < this.users.length; u++) {
            res[u] = this.GetPlayer(u);
        }
        return res;
    }
    CheckEnoughUsersToStart() {
        if((this.currentState === this.sessionStates.WAITING_FOR_USERS ||
            this.currentState === this.sessionStates.IN_SESSION) && 
            this.users.length === this.minimumUsersToStartSession) {
                return true;
        }
        return false;
    }
    StartSession() {
        console.log("Starting Session");
        this.currentState = this.sessionStates.IN_SESSION;
        let players = this.GetPlayersPack();
        this.sessionInfo[this.sessionIncrement].playerNames = [
            '', 
            this.users[1].username,
            this.users[2].username,
            this.users[3].username
        ];
        this.SendToUsers({ type: this.msgTypes.SESS_START, players: players, sessionNum: this.sessionIncrement }, []);
        this.SendToDashboard({ type: this.msgTypes.SESS_START, players: players, sessionNum: this.sessionIncrement});
        this.SendToDashboard({ type: this.msgTypes.SEND_STATS, sessionNum: this.sessionIncrement, stats: this.sessionInfo[this.sessionIncrement], pips: this.pips[this.sessionIncrement] });
        this.StartSessionTimer();

        this.telemetryManager.Log({ 
            eventType: 'Session', 
            actionType: 'ChatStart', 
            actionString: { 
                PlayerA: players[1].name, 
                PlayerB: players[2].name, 
                PlayerC: players[3].name 
            }
        });
    }
	StartSessionTimer() {
		this.sessionTimer = setInterval(() => {
			this.IncrementSessionTime();
		}, 1000);
	}
	IncrementSessionTime() {
		this.sessionInfo[this.sessionIncrement].sessionTimeSec += 1;
	}
	StopSessionTimer() {
		clearInterval(this.sessionTimer);
		this.sessionTimer = null;
	}
    TalkingStarted(userSlot, toTeam) {
        if(this.playerCanTalk[userSlot] === true && 
            this.currentTalkingSlot === -1) {
            this.SendToUsers({ type: this.msgTypes.START_TALK, teamNumber: userSlot, msgNum: (this.sessionInfo[this.sessionIncrement].totalMsg + 1) }, []);
            this.StartTalkTimer(userSlot, toTeam);
        }
    }
    StartTalkTimer(userSlot, toTeam) {
        if(this.currentTalkingSlot === -1) {
            this.currentTalkingSlot = userSlot;
            this.currentTalkTarget = toTeam;
            this.playerTalkTimers[userSlot] = setInterval((us, tt) => {
                this.IncrementTalkTimer(us, tt);
            }, this.talkDepletionIntervalMS, userSlot, toTeam);
        } else {
            this.StopTalkTimer(this.currentTalkingSlot, this.currentTalkTarget);
            this.StartTalkTimer(userSlot, toTeam);
        }
    }
    IncrementTalkTimer(userSlot, toTeam) {
        this.talkTimeElapsed += this.talkDepletionIntervalMS;
        if(this.talkTimeElapsed % 1000 === 0) {
            this.sessionInfo[this.sessionIncrement].sessionPlayerTimes[userSlot] += 1;
        }
        if(this.talkTimeElapsed >= this.talkTimeLimit) {
            this.TalkingStopped(userSlot, toTeam);
        }
    }
    StopTalkTimer(userSlot, toTeam) {
        clearInterval(this.playerTalkTimers[userSlot]);
        this.playerTalkTimers[userSlot] = null;
        if(this.talkTimeElapsed >= this.talkMinTimeForMsg) {
            if(this.sessionInfo[this.sessionIncrement]) {
                this.SetSendStats(userSlot, toTeam);
            } else {
                console.log("sessionInfo/slot error", this.sessionIncrement, userSlot);
            }
           this.SendToUsers({ type: this.msgTypes.PIP, teamNumber: this.currentTalkingSlot }, []);
           this.SendToDashboard({ type: this.msgTypes.SEND_STATS, sessionNum: this.sessionIncrement, stats: this.sessionInfo[this.sessionIncrement], pips: this.pips[this.sessionIncrement] });
           this.telemetryManager.Log({ eventType: 'Player', actionType: 'Message', actionString: { Order: this.sessionInfo[this.sessionIncrement].totalMsg, Origin: userSlot, Destination: toTeam, Duration: (this.talkTimeElapsed / 1000) }});
        }
        this.currentTalkingSlot = -1;
        this.lastTalkTarget = this.currentTalkTarget;
        this.currentTalkTarget = -1;
        this.talkTimeElapsed = 0;
        this.StartCooldownTimer(userSlot);
    }
    StartCooldownTimer(userSlot) {
        this.playerCanTalk[userSlot] = false;
        this.playerCooldownTimers[userSlot] = setTimeout((us) => {
            this.EndCooldownTimer(us);
        }, this.talkCooldownMS, userSlot);
    }
    EndCooldownTimer(userSlot) {
        this.playerCanTalk[userSlot] = true;
        clearTimeout(this.playerCooldownTimers[userSlot]);
        this.playerCooldownTimers[userSlot] = null;
    }
    TalkingStopped(userSlot, toTeam) {
        if(this.currentTalkingSlot > -1) {
            this.StopTalkTimer(userSlot, toTeam);
            this.SendToUsers({ type: this.msgTypes.STOP_TALK, teamNumber: userSlot }, []);
            this.SendToUsers({ type: this.msgTypes.SEND_STATS, stats: this.sessionInfo[this.sessionIncrement] });
        }
    }
    // We fail silently here, or else we'd flood the logs and console
    ReceiveVoiceData(userSlot, data) {
        // Send the data to the other user(s)
        if(this.currentTalkTarget === 0) { // General channel
            this.SendAudioToUsers(data.binaryData, [userSlot]);
        } else { // Direct message
            this.users[this.currentTalkTarget]?.SendAudio(data.binaryData);
        }
    }
    ReceiveVoiceChunk(userSlot, msgNum, clip) {
        this.awsManager.UploadClip(this.fullcode, userSlot, msgNum, clip);
    }
    RequestStats(sessionNum) {
        if(sessionNum <= this.sessionIncrement && this.sessionInfo[sessionNum].playerMsg) {
            this.SendToDashboard({ type: this.msgTypes.SEND_STATS, sessionNum: sessionNum, stats: this.sessionInfo[sessionNum], pips: this.pips[this.sessionIncrement] });
        }
    }
    SetSendStats(fromTeam, toTeam = 0) {
		switch (toTeam) {
			case 1:
				this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToA += 1;
				break;
			case 2:
				this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToB += 1;
				break;
			case 3:
				this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToC += 1;
				break;
			case 0:
				if (fromTeam !== 1) 
                    this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToA += 1;
				if (fromTeam !== 2)
                    this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToB += 1;
				if (fromTeam !== 3)
                    this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].msgToC += 1;
				break;
			default:
				break;
		}
        this.sessionInfo[this.sessionIncrement].totalMsg += 1;
        this.pips[this.sessionIncrement].push(fromTeam);
        this.sessionInfo[this.sessionIncrement].playerMsg[fromTeam].numMsg += 1;
    }
    BeginVoteToEndSession(userSlot) {
        this.SendToUsers({ type: this.msgTypes.VTESO, teamNumber: userSlot, players: this.GetPlayersPack() }, []);
        this.telemetryManager.Log({ eventType: 'Player', actionType: 'QuitRequest', actionString: { User: userSlot } });
    }
    VoteToEndSession(userSlot) {
        if(this.currentState === this.sessionStates.IN_SESSION) {
            let noes = 0;
            let vtes = 0;
            for(let u = 1; u < this.users.length; u++) {
                if(this.users[u].votedToEndSession === true) {
                    this.telemetryManager.Log({ eventType: 'Player', actionType: 'QuitVote', actionString: { User: userSlot, Vote: 'yes' }});
                    vtes++;
                } else if(this.users[u].votedToEndSession === false) {
                    this.telemetryManager.Log({ eventType: 'Player', actionType: 'QuitVote', actionString: { User: userSlot, Vote: 'no' }});
                    noes++;
                }
            }
            if((vtes >= this.minimumVotesToEndSession ||
                vtes >= this.users.length) && noes === 0) {
                this.SendToUsers({ type: this.msgTypes.SESS_END }, []);
                this.SendToDashboard({ type: this.msgTypes.SESS_END });
                setTimeout(() => { this.SessionEndedByVote(); }, 3000);
            } else if(noes > 0) {
                this.SendToUsers({ type: this.msgTypes.SESS_CONT }, []);
                for(let u = 1; u < this.users.length; u++) {
                    this.users[u].vtes = false;
                    this.users[u].vtesSent = false;
                    this.users[u].votedToEndSession = null;
                }
            } else {
                this.SendToUsers({ type: this.msgTypes.VTES, teamNumber: userSlot, players: this.GetPlayersPack() }, []);
            }
        }
    }
    PauseSession() {
        this.SendToUsers({ type: this.msgTypes.PAUSE_SESS }, []);
        this.telemetryManager.Log({ eventType: 'Session', actionType: 'TBPause', actionString: {}});
    }
    UnpauseSession() {
        this.SendToUsers({ type: this.msgTypes.UNPAUSE_SESS }, []);
        this.telemetryManager.Log({ eventType: 'Session', actionType: 'TBUnpause', actionString: {}});
    }
    EndSession() {
        this.SendToUsers({ type: this.msgTypes.END_SESS }, []);
        this.telemetryManager.Log({ eventType: 'Session', actionType: 'TBEnd', actionString: {}});
        this.DelayedReset();
    }
    SessionEndedByVote() {
        this.currentState = this.sessionStates.RESULTS_MENU;
        this.telemetryManager.Log({ eventType: 'Session', actionType: 'ChatEnd', actionString: {}});
        this.DelayedReset();
    }
    CancelResetTimer() {
        if(this.sessionResetTimer) {
            clearTimeout(this.sessionResetTimer);
            this.sessionResetTimer = null;
        }
    }
    DelayedReset() {
        this.sessionResetTimer = setTimeout(() => {
            this.ResetInstance();
        }, 3000);
    }
    ResetInstance() {
        this.telemetryManager.FlushLog();
        this.telemetryManager.StopLogFlushing();

        console.log(`--- Cycling Server #${this.fullcode} Instance ---`);
        if(this.dashboard) {
            this.SendToDashboard({ type: this.msgTypes.SESS_END });
        }
        this.users = [{}]; 

        this.StopSessionTimer();
        this.sessionIncrement++;
        this.sessionInfo[this.sessionIncrement] = {};
        this.sessionInfo[this.sessionIncrement].sessionTimeSec = 0;
        this.sessionInfo[this.sessionIncrement].sessionPlayerTimes = [0, 0, 0, 0];
        this.sessionInfo[this.sessionIncrement].totalMsg = 0;
        this.sessionInfo[this.sessionIncrement].playerNames = ['', '', '', ''];
        this.sessionInfo[this.sessionIncrement].playerMsg = [];
		this.sessionInfo[this.sessionIncrement].playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.sessionIncrement].playerMsg[3] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
        };
        this.pips[this.sessionIncrement] = [];

        this.telemetryManager.Reset(true, this.sessionIncrement);

        this.currentState = this.sessionStates.WAITING_FOR_USERS;

        console.log(`--- Server #${this.fullcode} Instance Cycled ---`);
    }
    CancelLogin(userSlot) {
        if(this.users[userSlot] && this.users[userSlot] !== undefined) {
            this.users[userSlot].ResetStates("canceling");
            this.users[userSlot] = {};
        }
    }
    HasUser(user) {
        for(let u = 0; u < this.users.length; u++) {
            if(this.users[u].username === user.username &&
                this.users[u].fullcode === user.fullcode) {
                    return true;
                }
        }

        return false;
    }
    DashboardSocketClosed(reasonCode, description) {
        if(this.currentState === this.sessionStates.IN_SESSION &&
            (reasonCode === 1001 || reasonCode === 1006)) {
                if(this.dashboard !== null &&
                    this.dashboard !== undefined) {
                    this.dashboard.status = "dropped";
                    this.dashboard = null;
                }    
        } else {
            console.log(`Dashboard socket closed with ${reasonCode}: ${description}.`);
        }
    }
    UserSocketClosed(reasonCode, description, userSlot) {
        if(this.currentState === this.sessionStates.IN_SESSION &&
            (this.users[userSlot]?.status !== "canceling" && 
            (reasonCode === 1001 ||
            reasonCode === 1006))) {
            console.log(`User#${userSlot} dropped: ${reasonCode}.`);
            if(this.users[userSlot] !== null &&
                this.users[userSlot] !== undefined) {
                this.users[userSlot].status = "dropped";
                this.telemetryManager.Log({ eventType: 'Player', actionType: 'Drop', actionString: { User: userSlot }});
            }
            this.numDropped = 0;
            let excludedSlots = [];
            for(let u = 0; u < this.users.length; u++) {
                if(this.users[u].status === "dropped") {
                    this.numDropped++;
                    excludedSlots.push(u);
                }
            }
            if(this.numDropped === 1) {
                this.SendToUsers({ type: this.msgTypes.SINGLE_DROP, teamNumber: userSlot }, excludedSlots);
            } else if(this.numDropped >= 2) {
                this.SendToUsers({ type: this.msgTypes.DUAL_DROP, teamNumber: userSlot }, excludedSlots);
                this.DelayedReset();
            } 
        } else {
            console.log(`User#${userSlot} socket closed with ${reasonCode}: ${description}.`);
        }
    }
}

exports.InstanceServer = InstanceServer;