var numRooms = 0;
var roomCodes = [];
var roomNames = [];
var roomConnections = [];
var textVizColors = {
	AllActive: 0xBFBFBF,
	AActive: 0xFFD71B,
	BActive: 0x18B4FE,
	CActive: 0xFE6057,
	All: 0xAAAAAA,
	A: 0xBCAB5C,
	B: 0x5B9CBB,
	C: 0xCD8A87,
	AB: 0x00F835,
	AC: 0xFF8040,
	BC: 0x800080,
	ADull: 0x626649,
	BDull: 0x395870,
	CDull: 0x565363
};
var allPaused = false;
var codesGenerated = false;

function ShowRoomOverview() {
	HideTab('RoomCode');
	$("#RoomOverviewFrame").css("display", "grid");
	$("#RoomOverviewButton").attr("class", "TabButtonStyleActive");
}

function HideRoomOverview() {
	for(let i = 0; i < 16; i++) {
		$("#cofSlot" + i).css("display", "none");
	}
	$("#RoomOverviewFrame").css("display", "none");
	$("#RoomOverviewButton").attr("class", "TabButtonStyleInactive");
}

function ShowTab(name) {
	HideAllTabs();
	$("#" + name + "Frame").css("display", "grid");
	$("#" + name + "Button").attr("class", "TabButtonStyleActive");
}

function HideTab(name) {
	$("#" + name + "Frame").css("display", "none");
	$("#" + name + "Button").attr("class", "TabButtonStyleInactive");
}

function HideAllTabs() {
	HideTab('RoomOverview');
	HideTab('RoomCode');
}

function DownloadRoomcodeList() {
	if(codesGenerated) {
		let blob = new Blob([GenerateRoomcodeReport()], { type: "text/html" });
		var link = document.createElement("a");
		link.download = "roomCodes" + GetDateStamp() + ".html";
		link.href = URL.createObjectURL(blob);
		console.log(link.href); // this line should be here
		link.click();
	} else {
		alert("Please generate room codes first...");
	}
}

function DownloadResultsFile() {
	let blob = new Blob([GenerateTextVizReport()], { type: "text/html" });
	var link = document.createElement("a");
	link.download = "textVisualizations" + GetDateStamp() + ".html";
	link.href = URL.createObjectURL(blob);
	console.log(link.href); // this line should be here
	link.click();
}

function ResetDashboard() {
	codesGenerated = false;
	numRooms = 0;
	roomCodes = [];
	roomNames = [];
	if(roomConnections.length > 0) {
		for(let r = 0; r < roomConnections.length; r++) {
			roomConnections[r] = null;
		}
	}
	roomConnections = [];
	allPaused = false;

	for(let s = 1; s < 16; s++) {
		$(`#cofSlot${s}ConvoViz`).empty();
	}
}

function GenerateRoomcodes() {
	ResetDashboard();

	console.log("Generating Roomcodes...");
	let teacherCode = $("#TeacherCodeInput").val().trim();
	if(!teacherCode || 
		teacherCode === undefined ||
		teacherCode === "" ||
		teacherCode.length !== 2 || 
		isNaN(teacherCode)) {
		alert("Teacher code must be 2 digits (0-9). Please try again...");
		return;
	}

	let numStudents = $("#CCNumStudentsInput").val();
	if(!numStudents ||
		numStudents < 3) {
			alert("You must specify at least 3 students for a session. Please try again...");
			return;
	}

	// Generate codes - if divisible by 3, then even 3-player groups
	// if not, then two 2-player groups, and then 3s
	let roomNum = 1;
	let prefix = 0;
	roomCodes = [];
	roomNames = [];
	numRooms = 1;
	let numLeft = numStudents;
	let g = 0;
	while(g < numStudents) {
		if(roomNum < 10) {
			prefix = 0;
		} else {
			prefix = "";
		}
		roomNames[numRooms] = teacherCode + prefix + roomNum;

		if(numLeft - 3 >= 0) {
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			numLeft -= 3;
			roomNum++;
			numRooms++;
			g += 3;
		} else if(numLeft % 3 === 2) {
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			numLeft -= 2;
			roomNum++;
			numRooms++;
			g += 2;
		} else if(numLeft % 3 === 1) {
			roomCodes.push({
				code: roomNames[numRooms],
				roomNum: roomNum
			});
			numLeft -= 1;
			roomNum++;
			numRooms++;
			g += 1;
		}
	}
	codesGenerated = true;
	console.log("generated", roomCodes.length, "player codes for", numRooms-1, "rooms");

	GenerateRoomCodeRows();
	InitializeConnections();
}

function GenerateRoomCodeRows() {
	let rows = "";
	let leftRowClass = "";
	let rightRowClass = "";
	let numRoomstyling = "";
	$("#CCRoomcodeListbox").empty();
	for(let s = 0; s < roomCodes.length; s++) {
		if(s % 2 === 0) {
			leftRowClass = "rowEvenLeftStyle";
			rightRowClass = "rowEvenRightStyle";
		} else {
			leftRowClass = "rowOddLeftStyle";
			rightRowClass = "rowOddRightStyle";
		}
		numRoomstyling = "";
		if(roomCodes[s].numPlayers <= 2) {
			numRoomstyling = `style='color: #FF1111;'`;
		}
		rows += `<div class='listboxRowHolderClass'><div class='${leftRowClass}' ${numRoomstyling}>${roomCodes[s].code}</div><div class='${rightRowClass}' style='color: #bfbfbf;'>${roomCodes[s].roomNum}</div></div>`;
	}
	$("#CCRoomcodeListbox").append(rows);
}

function GenerateRoomcodeReport() {
	let report = `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta http-equiv="content-type" content="text/html; charset=utf-8" />
			<meta charset="utf-8" />
			<title>Libra: Teacher's Dashboard</title>
			<meta http-equiv="pragma" content="no-cache" />
			<style>
				@font-face {
					font-family: 'MontserratRegular';
					src: url('font/Montserrat-Regular.woff') format('woff'),
					url('font/Montserrat-Regular.ttf') format('truetype');
					font-weight: normal;
					font-style: normal;
					-webkit-font-smoothing: antialiased;
				}
				@font-face {
					font-family: 'MontserratMedium';
					src: url('font/Montserrat-Medium.ttf') format('truetype');
					font-weight: normal;
					font-style: normal;
					-webkit-font-smoothing: antialiased;
				}
				@font-face {
					font-family: 'MontserratSemiBold';
					src: url('./font/Montserrat-SemiBold.woff') format('woff'),
					url('./font/Montserrat-SemiBold.ttf') format('truetype');
					font-weight: bold;
					font-style: normal;
					-webkit-font-smoothing: antialiased;
				}
				@font-face {
					font-family: 'MontserratBold';
					src: url('font/Montserrat-Bold.woff') format('woff'),
					url('font/Montserrat-Bold.ttf') format('truetype');
					font-weight: bolder;
					font-style: normal;
					-webkit-font-smoothing: antialiased;
				}
				.rowOddLeftStyle {
					display: table-cell;
					width: 245px;
					height: 36px;
					background-color: #818181;
					color: #FFF;
					line-height: 36px;
					text-align: center;
					font-size: 16px;
					font-family: 'MontserratMedium';			
				}
				.rowOddRightStyle {
					display: table-cell;
					width: 244px;
					height: 36px;
					background-color: #606060;
					color: #FFF;
					line-height: 36px;
					text-align: center;
					font-size: 16px;
					font-family: 'MontserratMedium';			
				}
				.rowEvenLeftStyle {
					display: table-cell;
					width: 245px;
					height: 36px;
					background-color: #666666;
					color: #FFF;
					line-height: 36px;
					text-align: center;
					font-size: 16px;
					font-family: 'MontserratMedium';			
				}
				.rowEvenRightStyle {
					display: table-cell;
					width: 244px;
					height: 36px;
					background-color: #4C4C4C;
					color: #FFF;
					line-height: 36px;
					text-align: center;
					font-size: 16px;
					font-family: 'MontserratMedium';			
				}
			</style>
		</head><body>`;

	let leftRowClass = "";
	let rightRowClass = "";
	let numRoomstyling = "";
	for(let s = 0; s < roomCodes.length; s++) {
		if(s % 2 === 0) {
			leftRowClass = "rowEvenLeftStyle";
			rightRowClass = "rowEvenRightStyle";
		} else {
			leftRowClass = "rowOddLeftStyle";
			rightRowClass = "rowOddRightStyle";
		}
		numRoomstyling = "";
		if(roomCodes[s].numPlayers === 2) {
			numRoomstyling = `style='color: #FF1111;'`;
		}
		report += `<div class='listboxRowHolderClass'><div class='${leftRowClass}' ${numRoomstyling}>${roomCodes[s].code}</div><div class='${rightRowClass}' style='color: #bfbfbf;'>${roomCodes[s].roomNum}</div></div>`;
	}
	
	report += '</body></html>';
	return report;
}

var months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];

function GetDateStamp() {
	let dt = new Date();
	return dt.getHours() + ":" + dt.getMinutes() + "-" + months[dt.getMonth()] + "-" + dt.getDate() + "-" + dt.getFullYear();
}
function GenerateTextVizReport() {
	let readableDate = GetDateStamp();
	let report = `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta http-equiv="content-type" content="text/html; charset=utf-8" />
			<meta charset="utf-8" />
			<title>Libra: Teacher's Dashboard</title>
			<meta http-equiv="pragma" content="no-cache" />
			<style>
				:root {
					--ColorAActive: #ffc300;
					--ColorBActive: #19b4ff;
					--ColorCActive: #ff5f57;
					--ColorNActive: #2f4156;
					--FrostColor: #8F8F8F;
					--FadedText: rgba(255, 255, 255, 0.25);
					--FrostText: white;
				}
				.RoomOverviewHolderStyle {
					display: grid;
					/*max-height: 771px;*/
					overflow-x: hidden;
					overflow-y: scroll;
					grid-template-columns: 388px 20px 388px 20px 388px auto;
					grid-template-rows: 5px 33px 5px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px 20px 362px auto;
				}
				.COConvoFrame {
					left: 0px; 
					top: 0px; 
					width: 388px; 
					height: 382px; 
					background-color: rgba(255, 255, 255, 0.1);
					grid-template-columns: auto;
					grid-template-rows: 30px auto;
				}
				.COConvoTitleText {
					display: inherit;
					left: 144px; 
					top: 12px; 
					width: 388px;
					text-align: center;
					font-family: MontserratBold; 
					font-size: 26px; 
					color: rgba(255, 255, 255, 0.5);
					grid-row-start: 1;
					grid-template-columns: 60px 45px 120px 55px 20px 20px auto;
				}
				.COConvoViz {
					display: grid;
					grid-column-start: 2;
					grid-row-start: 2;
					left: 20px;
					top: 80px;
					width: 350px !important;
					height: 340px !important;
					background-color: #21344B;
					border-radius: 10px;
					contain: strict;
				}
				.vizHolder {
					position: absolute; 
					left: 0px; 
					top: 0px; 
					width: 400px; 
					height: 390px; 
				}
				.vizSVGHolder {
					position: absolute; 
					left: 100px; 
					top: 50px; 
					width: 200px; 
					height: 200px;
				}
				.vizFrost {
					width: 350px; 
					height: 322px; 
					background-color: #8F8F8F; 
					border-radius: 8px;
					opacity: 0.75;
				}
				.frostText {
					position: absolute;
					top: 33%;
					width: 100%;
					text-align: center;
					line-height: 30px;
					font-family: Arial;
					font-weight: bold;
					font-size: 30px;
					color: white;
				}
				.communicationFeedback {
					position: absolute;
					top: 5px;
					width: 100%;
					font-family: Arial;
					font-size: 18px;
					font-weight: 600;
					text-align: center;
					color: rgba(255, 255, 255, 0.25);
				}
				.textVizPlayerA {
					position: absolute;
					top: 35px;
					left: 0px;
					width: 50%;
					font-family: MontserratRegular;
					font-size: 18px;
					font-weight: 600;
					text-align: center;
					color: var(--ColorAActive);
				}
				.textVizPlayerB {
					position: absolute;
					top: 35px;
					right: 0px;
					width: 50%;
					font-family: MontserratRegular;
					font-size: 18px;
					font-weight: 600;
					text-align: center;
					color: var(--ColorBActive);
				}
				.textVizPlayerC {
					position: absolute;
					top: 250px;
					width: 100%;
					font-family: MontserratRegular;
					font-size: 18px;
					font-weight: 600;
					text-align: center;
					color: var(--ColorCActive);
				}
				.orderLabel {
					position: absolute;
					left: 20px;
					top: 280px;
					font-family: MontserratSemiBold;
					font-size: 16px;
					color: var(--FadedText);
				}
				.orderBarHolder {
					position: absolute;
					display: grid;
					left: 20px;
					top: 300px;
					width: 360px;
					height: 25px;
					background-color: var(--ColorNActive);
					border-radius: 10px;
					grid-auto-columns: 4px;
					grid-gap: 1px;
					grid-template-rows: 100%;
					grid-auto-flow: column;
				}
				.pipA {
					display: grid;
					border-radius: 2px;
					background-color: var(--ColorAActive);
				}
				.pipB {
					display: grid;
					border-radius: 2px;
					background-color: var(--ColorBActive);
				}
				.pipC {
					display: grid;
					border-radius: 2px;
					background-color: var(--ColorCActive);
				}
				.numberOfMessages {
					position: absolute;
					left: 20px;
					top: 325px;
					width: 100%;
					font-family: MontserratSemiBold;
					font-size: 16px;
					color: var(--FadedText);
					line-height: 20px;
				}
				.horizontalBarLabels {
					position: absolute;
					display: inline-flex;
					left: 20px;
					top: 368px;
					width: 360px;
					height: 20px;
				}
				.horizontalLabelPlayerA {
					width: 25%;
					min-width: 10%;
					color: var(--ColorAActive);
					font-family: MontserratBold;
					font-size: 14px;
					text-align: center;
					line-height: 22px;
				}
				.horizontalLabelPlayerB {
					width: 25%;
					min-width: 10%;
					color: var(--ColorBActive);
					font-family: MontserratBold;
					font-size: 14px;
					text-align: center;
					line-height: 22px;
				}
				.horizontalLabelPlayerC {
					width: 25%;
					min-width: 10%;
					color: var(--ColorCActive);
					font-family: MontserratBold;
					font-size: 14px;
					text-align: center;
					line-height: 22px;
				}
				.horizontalLabelNone {
					width: 25%;
					min-width: 10%;
					color: var(--ColorNActive);
					font-family: MontserratBold;
					font-size: 16px;
					text-align: center;
					line-height: 24px;
				}
				.horizontalVizBarHolder {
					position: absolute;
					display: inline-flex;
					left: 20px;
					top: 345px;
					width: 360px;
					height: 25px;
					border-radius: 5px;
				}
				.horizontalLabelPlayerC {
					width: 33.3%;
					color: #ff5f57;
					font-family: Arial;
					font-weight: bold;
					font-size: 14px;
					text-align: center;
					line-height: 22px;
				}
				.horizontalVizPlayerA {
					width: 25%;
					background-color: var(--ColorAActive);
					border-top-left-radius: 5px;
					border-bottom-left-radius: 5px;
				}
				.horizontalVizPlayerB {
					width: 25%;
					background-color: var(--ColorBActive);
				}
				.horizontalVizPlayerC {
					width: 25%;
					background-color: var(--ColorCActive);
				}
				.horizontalVizNone {
					width: 25%;
					background-color: var(--ColorNActive);
					border-top-right-radius: 10px;
					border-bottom-right-radius: 10px;
					color: var(--ColorNActive);
					font-family: MontserratBold;
					font-size: 16px;
					text-align: center;
					line-height: 48px;
				}
				.arcAStroke {
					fill: none;
					stroke: var(--ColorAActive);
					stroke-miterlimit: 10px;
					pointer-events: none;
				}
				.arcBStroke {
					fill: none;
					stroke: var(--ColorBActive);
					stroke-miterlimit: 10px;
					pointer-events: none;
				}
				.arcCStroke {
					fill: none;
					stroke: var(--ColorCActive);
					stroke-miterlimit: 10px;
					pointer-events: none;
				}
				.thickStroke {
					stroke-width: 30px;
				}
			</style>
		</head>
		<body style="background-color: #2f4156;">
			<div style='width: 100%; text-align: center; font-family: Arial; font-weight: bold; font-size: 28px; color: rgba(255, 255, 255, 0.5);' >Libra Report For: ${readableDate}</div>
			<div id="cofHolder" class='RoomOverviewHolderStyle' >`;

	if(numRooms > 0) {
		let row = 2;
		let col = 1;
		let numViz = 1;
		let rowViz = 0;
		for(let c = 1; c < roomConnections.length; c++) {
			numViz = roomConnections[c].textVizBox.scene.scenes[0].sessionInfo.length;
			for(let s = 0; s < numViz; s++, col += 2) {
				roomConnections[c].textVizBox.scene.scenes[0].SetViz(s);
				let html = $(`#cofSlot${c}ConvoViz`).html();
				let start = html.indexOf("<style>");
				if(start > -1) {
					let end = html.indexOf("</style>");
					let temp = html.substr(end+8);
					html = html.substr(0, start) + temp;
				}
				report += `<div id="cofSlot${c}-${s+1}" class="COConvoFrame" style="grid-row: ${row}; grid-column: ${col};">
				<div id="cofSlot${c}-${s+1}Title" class="COConvoTitleText">Group ${c}-${s+1}</div>
				<div style="display: grid; grid-template-columns: auto 348px auto; grid-template-rows: auto 348px;"><div id="cofSlot${c}ConvoViz-${s+1}" class="COConvoViz">${html}</div></div>
				</div>`;
				rowViz++;
				if(rowViz >= 3) {
					col = -1;
					row += 3;
					rowViz = 0;
				}
				roomConnections[c].textVizBox.scene.scenes[0].LastViz();
			}
		}
	}

	report += '</div></body></html>';
	return report;
}

function InitializeConnections() {
	console.log("Initializing connections...");
	if(numRooms > 0) {
		for(let c = 1; c < roomNames.length; c++) {
			roomConnections[c] = new VisualizationManager(roomNames[c], c);
		}
	}
}

function ViewPrevTextViz(slot) {
	roomConnections[slot].ViewPrevTextViz();
}

function ViewNextTextViz(slot) {
	roomConnections[slot].ViewNextTextViz();
}

function PauseAll() {
	if(!allPaused) {
		allPaused = true;
		for(let c = 1; c < roomNames.length; c++) {
			roomConnections[c].PauseSession();
		}
		$("#PauseAllButton").text("UNPAUSE ALL");
		$("#PauseAllButton").css("background-color", "#FF5722");
	} else {
		allPaused = false;
		for(let c = 1; c < roomNames.length; c++) {
			roomConnections[c].UnpauseSession();
		}
		$("#PauseAllButton").text("PAUSE ALL");
		$("#PauseAllButton").css("background-color", "#2f4156");
	}
}

function EndAllClicked() {
	$("#EndAllConfirmationDialog").show();
}

function EndAll() {
	for(let c = 1; c < roomNames.length; c++) {
		roomConnections[c].EndSession();
	}
	$("#EndAllConfirmationDialog").hide();
}

function CancelEndAll() {
	$("#EndAllConfirmationDialog").hide();
}
