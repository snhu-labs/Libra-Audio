class TextViz extends Phaser.Scene {
	constructor() {
		super('TextViz');
		this.slot = 0;

        this.minTriWidth = 1;
        this.maxTriWidth = 15;
		this.minEdgeWidth = 2;
		this.maxEdgeWidth = 26;
        this.edgeWidths = {
			AB: this.minEdgeWidth,
			AC: this.minEdgeWidth,
			BA: this.minEdgeWidth,
			BC: this.minEdgeWidth,
			CA: this.minEdgeWidth,
			CB: this.minEdgeWidth
		};

		this.curVizIdx = 0;
		this.lastVizIdx = 0;
		this.sessionInfo = [];
		this.sessionInfo[this.curVizIdx] = {};
		this.sessionInfo[this.curVizIdx].totalMsgs = 0;
		this.sessionInfo[this.curVizIdx].sessionTimeSec = 0;
		this.sessionInfo[this.curVizIdx].sessionPlayerTimes = [0,0,0,0];
		this.sessionInfo[this.curVizIdx].playerNames = ['', 'A', 'B', 'C', 'D'];
		this.sessionInfo[this.curVizIdx].playerMsg = [];
		this.sessionInfo[this.curVizIdx].playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[3] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.resetStats = {};
		this.resetStats.sessionNum = 0;
		this.resetStats.stats = {};
		this.resetStats.stats.totalMsg = 0;
		this.resetStats.stats.sessionTimeSec = 0;
		this.resetStats.stats.sessionPlayerTimes = [0,0,0,0];
		this.resetStats.stats.playerNames = ['', '', '', '', ''];
		this.resetStats.stats.playerMsg = [];
		this.resetStats.stats.playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.resetStats.stats.playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.resetStats.stats.playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.resetStats.stats.playerMsg[3] = {
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
		this.pips = []; 
		this.pips[this.curVizIdx] = [];
		this.pipShiftThreshold = 114;
		this.playerTags = ['', 'A', 'B', 'C'];

		this.sessionTimeSec = 0;
		this.sessionPlayerTimes = [0,0,0,0];

		this.appContent = null;
	}
	preload() { 
		this.load.html('appContent', "js/content.html");
	}
	create() {
		this.appContent = this.add.dom(0, 0).createFromCache('appContent');
		this.Init();
	}
	Init() {
		let id = this.scene.scene.game.config.parent.id;
		this.slot = id.replace("cofSlot", "").replace("ConvoViz", "");

		$("#vizHolder").attr("id", `vizHolder${this.slot}`);
		$("#ArcA").attr("id", `ArcA${this.slot}`);
		$("#ArcB").attr("id", `ArcB${this.slot}`);
		$("#ArcC").attr("id", `ArcC${this.slot}`);
		$("#ArcAB").attr("id", `ArcAB${this.slot}`);
		$("#TriAB").attr("id", `TriAB${this.slot}`);
		$("#ArcAC").attr("id", `ArcAC${this.slot}`);
		$("#TriAC").attr("id", `TriAC${this.slot}`);
		$("#ArcBA").attr("id", `ArcBA${this.slot}`);
		$("#TriBA").attr("id", `TriBA${this.slot}`);
		$("#ArcBC").attr("id", `ArcBC${this.slot}`);
		$("#TriBC").attr("id", `TriBC${this.slot}`);
		$("#ArcCA").attr("id", `TriCA${this.slot}`);
		$("#ArcCB").attr("id", `TriCB${this.slot}`);
		$("#textVizPlayerAName").attr("id", `textVizPlayerAName${this.slot}`);
		$("#textVizPlayerBName").attr("id", `textVizPlayerBName${this.slot}`);
		$("#textVizPlayerCName").attr("id", `textVizPlayerCName${this.slot}`);

		$("#numberOfMessages").attr("id", `numberOfMessages${this.slot}`);
		$("#horizontalVizBarHolder").attr("id", `horizontalVizBarHolder${this.slot}`);
		$("#orderLabel").attr("id", `orderLabel${this.slot}`);
		$("#orderBarHolder").attr("id", `orderBarHolder${this.slot}`);

		$("#horizontalLabelPlayerA").attr("id", `horizontalLabelPlayerA${this.slot}`);
		$("#horizontalLabelPlayerB").attr("id", `horizontalLabelPlayerB${this.slot}`);
		$("#horizontalLabelPlayerC").attr("id", `horizontalLabelPlayerC${this.slot}`);
		$("#horizontalLabelNone").attr("id", `horizontalLabelNone${this.slot}`);
		$("#horizontalVizPlayerA").attr("id", `horizontalVizPlayerA${this.slot}`);
		$("#horizontalVizPlayerB").attr("id", `horizontalVizPlayerB${this.slot}`);
		$("#horizontalVizPlayerC").attr("id", `horizontalVizPlayerC${this.slot}`);
		$("#horizontalVizNone").attr("id", `horizontalVizNone${this.slot}`);
		$("#vizFrost").attr("id", `vizFrost${this.slot}`);
	}
	Reset() {
		this.DestroyTextViz();

        this.edgeWidths = {
			AB: this.minEdgeWidth,
			AC: this.minEdgeWidth,
			BA: this.minEdgeWidth,
			BC: this.minEdgeWidth,
			CA: this.minEdgeWidth,
			CB: this.minEdgeWidth
		};
		this.sessionInfo[this.curVizIdx].playerNames = ['', '', '', '', ''];
		this.sessionInfo[this.curVizIdx].playerMsg = [];
		this.sessionInfo[this.curVizIdx].playerMsg[0] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[1] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[2] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.sessionInfo[this.curVizIdx].playerMsg[3] = {
			msgToA: 0,
			msgToB: 0,
			msgToC: 0,
			numMsg: 0
		};
		this.pips[this.curVizIdx] = []; 
		this.textVizPct = {
			A: 0,
			B: 0,
			C: 0,
			N: 0
		};
	}
	CalculateEdgeWidths() {
		if (this.sessionInfo[this.curVizIdx]) {
			// Add all messages from/to each player
			if (this.sessionInfo[this.curVizIdx].totalMsgs > 0) {
				// Divide 100 by that total to get % rep of each message
				let msgPct = 1 / this.sessionInfo[this.curVizIdx].totalMsgs;
				let timePct = 100 / this.sessionInfo[this.curVizIdx].sessionTimeSec;  

				// Multiply each arc # by %
				this.edgeWidths["AB"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[1].msgToB * msgPct)));
				this.edgeWidths["AC"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[1].msgToC * msgPct)));
				this.edgeWidths["BA"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[2].msgToA * msgPct)));
				this.edgeWidths["BC"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[2].msgToC * msgPct)));
				this.edgeWidths["CA"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[3].msgToA * msgPct)));
				this.edgeWidths["CB"] = Math.round(this.minEdgeWidth + ((this.maxEdgeWidth - this.minEdgeWidth) * (this.sessionInfo[this.curVizIdx].playerMsg[3].msgToB * msgPct)));
				this.textVizPct["A"] = ((timePct * this.sessionInfo[this.curVizIdx].sessionPlayerTimes[1])).toFixed(1);
				this.textVizPct["B"] = ((timePct * this.sessionInfo[this.curVizIdx].sessionPlayerTimes[2])).toFixed(1);
				this.textVizPct["C"] = ((timePct * this.sessionInfo[this.curVizIdx].sessionPlayerTimes[3])).toFixed(1);
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
    SetArcWidth(arcName, width) {
		let aw = width < this.maxEdgeWidth ? width : this.maxEdgeWidth;
		let tw = width < this.maxTriWidth ? width : this.maxTriWidth;
		$(`#Arc${arcName}${this.slot}`).attr("stroke-width", aw);
		$(`#Tri${arcName}${this.slot}`).attr("stroke-width", tw);
	}
	DestroyTextViz() {
		if (this.appContent) {
			this.appContent.destroy();
		}
	}
	UpdateTextViz() {
		this.CalculateEdgeWidths();

		$(`#textVizPlayerAName${this.slot}`).text(this.sessionInfo[this.curVizIdx].playerNames[1] || '');
		$(`#textVizPlayerBName${this.slot}`).text(this.sessionInfo[this.curVizIdx].playerNames[2] || '');
		$(`#textVizPlayerCName${this.slot}`).text(this.sessionInfo[this.curVizIdx].playerNames[3] || '');

		this.SetArcWidth("AB", this.GetEdgeWidth("AB"));
        this.SetArcWidth("AC", this.GetEdgeWidth("AC"));
        this.SetArcWidth("BA", this.GetEdgeWidth("BA"));
        this.SetArcWidth("BC", this.GetEdgeWidth("BC"));
        this.SetArcWidth("CA", this.GetEdgeWidth("CA"));
        this.SetArcWidth("CB", this.GetEdgeWidth("CB"));
		$(`#cofSlot${this.slot}Session`).text(`- ${this.curVizIdx + 1}`);

		if(this.sessionInfo[this.curVizIdx].totalMsgs > 0) {
			if(this.textVizPct['A'] > 0) {
				$(`#horizontalLabelPlayerA${this.slot}`).css("width", `${this.textVizPct['A']}%`);
				$(`#horizontalLabelPlayerA${this.slot}`).text(`${this.textVizPct['A']}%`);
				$(`#horizontalVizPlayerA${this.slot}`).css("width", `${this.textVizPct['A']}%`);
				$(`#horizontalVizPlayerA${this.slot}`).show();
			} else {
				$(`#horizontalLabelPlayerA${this.slot}`).css("width", `${this.textVizPct['A']}%`);
				$(`#horizontalLabelPlayerA${this.slot}`).text('');
				$(`#horizontalVizPlayerA${this.slot}`).css("width", `${this.textVizPct['A']}%`);
				$(`#horizontalVizPlayerA${this.slot}`).hide();
			}
			if(this.textVizPct['B'] > 0) {
				$(`#horizontalLabelPlayerB${this.slot}`).css("width", `${this.textVizPct['B']}%`);
				$(`#horizontalLabelPlayerB${this.slot}`).text(`${this.textVizPct['B']}%`);
				$(`#horizontalVizPlayerB${this.slot}`).css("width", `${this.textVizPct['B']}%`);
				$(`#horizontalVizPlayerB${this.slot}`).show();
			} else {
				$(`#horizontalLabelPlayerB${this.slot}`).css("width", `${this.textVizPct['B']}%`);
				$(`#horizontalLabelPlayerB${this.slot}`).text('');
				$(`#horizontalVizPlayerB${this.slot}`).css("width", `${this.textVizPct['B']}%`);
				$(`#horizontalVizPlayerB${this.slot}`).hide();
			}
			if(this.textVizPct['C'] > 0) {
				$(`#horizontalLabelPlayerC${this.slot}`).css("width", `${this.textVizPct['C']}%`);
				$(`#horizontalLabelPlayerC${this.slot}`).text(`${this.textVizPct['C']}%`);
				$(`#horizontalVizPlayerC${this.slot}`).css("width", `${this.textVizPct['C']}%`);
				$(`#horizontalVizPlayerC${this.slot}`).show();
			} else {
				$(`#horizontalLabelPlayerC${this.slot}`).css("width", `${this.textVizPct['C']}%`);
				$(`#horizontalLabelPlayerC${this.slot}`).text('');
				$(`#horizontalVizPlayerC${this.slot}`).css("width", `${this.textVizPct['C']}%`);
				$(`#horizontalVizPlayerC${this.slot}`).hide();
			}
			if(this.textVizPct['N'] > 0) {
				$(`#horizontalLabelNone${this.slot}`).css("width", `${this.textVizPct['N']}%`);
				$(`#horizontalLabelNone${this.slot}`).text(`${this.textVizPct['N']}%`);
				$(`#horizontalVizNone${this.slot}`).css("width", `${this.textVizPct['N']}%`);
				$(`#horizontalVizNone${this.slot}`).show();
			} else {
				$(`#horizontalLabelNone${this.slot}`).css("width", `${this.textVizPct['N']}%`);
				$(`#horizontalLabelNone${this.slot}`).text('');
				$(`#horizontalVizNone${this.slot}`).css("width", `${this.textVizPct['N']}%`);
				$(`#horizontalVizNone${this.slot}`).hide();
			}
		} else {
			$(`#horizontalLabelPlayerA${this.slot}`).css("width", `25%`);
			$(`#horizontalLabelPlayerA${this.slot}`).text(`25%`);
			$(`#horizontalVizPlayerA${this.slot}`).css("width", `25%`);
			$(`#horizontalVizPlayerA${this.slot}`).show();
			
			$(`#horizontalLabelPlayerB${this.slot}`).css("width", `25%`);
			$(`#horizontalLabelPlayerB${this.slot}`).text(`25%`);
			$(`#horizontalVizPlayerB${this.slot}`).css("width", `25%`);
			$(`#horizontalVizPlayerB${this.slot}`).show();
			
			$(`#horizontalLabelPlayerC${this.slot}`).css("width", `25%`);
			$(`#horizontalLabelPlayerC${this.slot}`).text(`25%`);
			$(`#horizontalVizPlayerC${this.slot}`).css("width", `25%`);
			$(`#horizontalVizPlayerC${this.slot}`).show();
			
			$(`#horizontalLabelNone${this.slot}`).css("width", `25%`);
			$(`#horizontalLabelNone${this.slot}`).text(`25%`);
			$(`#horizontalVizNone${this.slot}`).css("width", `25%`);
			$(`#horizontalVizNone${this.slot}`).show();
		}

		this.DrawOrderedMessageViz();
	}
	DrawOrderedMessageViz() {
		$(`#orderBarHolder${this.slot}`).empty();
		let pips = '';
		let start = 0;
		let idx = 0;
		if(!this.pips[this.curVizIdx]) {
			this.pips[this.curVizIdx] = [];
		}
		if(this.pips[this.curVizIdx].length >= this.pipShiftThreshold) {
			start = this.pips[this.curVizIdx].length - this.pipShiftThreshold;
		}
		for(let p = start; p < this.pips[this.curVizIdx].length; p++) {
			pips += `<div id="orderPip${this.slot}-${p}" class="pip${this.playerTags[this.pips[this.curVizIdx][p]]}" style="grid-column: ${idx};" ></div>`;
			idx++;
		}
		$(`#orderBarHolder${this.slot}`).append(pips);
	}
	CreatePip(teamNum, drawViz = true) {
		if(teamNum > 0) {
			this.pips[this.curVizIdx].push(teamNum);

			if(drawViz === true) {
				this.DrawOrderedMessageViz();
			}
		}
	}
	LastViz() {
		this.SetViz(this.lastVizIdx);
	}
	ReceiveStats(data) {
		this.curVizIdx = data.sessionNum;
		if(!this.sessionInfo[this.curVizIdx]) {
			this.sessionInfo[this.curVizIdx] = {};
		}
		this.sessionInfo[this.curVizIdx].playerNames = data.stats.playerNames;
		this.sessionInfo[this.curVizIdx].totalMsgs = data.stats.totalMsg;
		this.sessionInfo[this.curVizIdx].sessionTimeSec = data.stats.sessionTimeSec;
		this.sessionInfo[this.curVizIdx].sessionPlayerTimes = data.stats.sessionPlayerTimes;
		this.sessionInfo[this.curVizIdx].playerMsg = data.stats.playerMsg;

		this.pips[this.curVizIdx] = data.pips;
		console.log("rec", data, this.sessionInfo[this.curVizIdx]);
		this.UpdateTextViz();
	}
	SetupNextViz(sessionNum) {
		if(!this.sessionInfo[this.curVizIdx].playerMsg) {
			this.sessionInfo[this.curVizIdx].playerNames = ['', '', '', '', ''];
			this.sessionInfo[this.curVizIdx].playerMsg = [];
			this.sessionInfo[this.curVizIdx].playerMsg[0] = {
				msgToA: 0,
				msgToB: 0,
				msgToC: 0,
				numMsg: 0
			};
			this.sessionInfo[this.curVizIdx].playerMsg[1] = {
				msgToA: 0,
				msgToB: 0,
				msgToC: 0,
				numMsg: 0
			};
			this.sessionInfo[this.curVizIdx].playerMsg[2] = {
				msgToA: 0,
				msgToB: 0,
				msgToC: 0,
				numMsg: 0
			};
			this.sessionInfo[this.curVizIdx].playerMsg[3] = {
				msgToA: 0,
				msgToB: 0,
				msgToC: 0,
				numMsg: 0
			};
		}
		if(!this.pips[sessionNum]) {
			this.pips[sessionNum] = []; 
		}
		this.textVizPct = {
			A: 0,
			B: 0,
			C: 0,
			N: 0
		};

	}
	SetViz(session, createData = true) {
		this.lastVizIdx = this.curVizIdx;
		this.curVizIdx = session;
		if(this.curVizIdx <= 0) {
			this.curVizIdx = 0;
		} else if(this.curVizIdx >= this.sessionInfo.length) {
			if(createData === true) {
				this.curVizIdx = this.sessionInfo.length;
			} else {
				this.curVizIdx = this.sessionInfo.length - 1;
			}
		}
		this.UpdateTextViz();
		$(`#cofSlot${this.slot}Session`).text(`- ${this.curVizIdx + 1}`);
	}
	PrevViz() {
		this.SetViz(this.curVizIdx - 1, false);
	}
	NextViz() {
		this.SetViz(this.curVizIdx + 1, false);
	}
}
