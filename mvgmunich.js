/* Timetable for public transport in Munich */

/*
 * Magic Mirror
 * Module: MVG Munich
 *
 * By Simon Crnko
 * MIT Licensed
 *
 */

const MS_PER_MINUTE = 60000;
Module.register("mvgmunich", {
	// Default module configuration
	defaults: {
		maxEntries: 8, // maximum number of results shown on UI
		updateInterval: MS_PER_MINUTE, // update every 60 seconds
		haltestelle: "Hauptbahnhof", // default departure station
		haltestelleId: 0,
		haltestelleName: "",
		ignoreStations: [], // list of destination to be ignored in the list
		lineFiltering: {
			"active": true, 			// set this to active if filtering should be used
			"filterType": "whitelist", 	// whitelist = only specified lines will be displayed, blacklist = all lines except specified lines will be displayed
			"lineNumbers": ["U1, U3, X50"] // lines that should be on the white-/blacklist
		},
		timeToWalk: 0, 		// walking time to the station
		showWalkingTime: false, // if the walking time should be included and the starting time is displayed
		showTrainDepartureTime: true,
		trainDepartureTimeFormat: "relative",
		walkingTimeFormat: "relative",
		showIcons: true,
		transportTypesToShow: {
			"ubahn": true,
			"sbahn": true,
			"regional_bus": true,
			"bus": true,
			"tram": true
		},
		showInterruptions: false,
		showInterruptionsDetails: false,
		countInterruptionsAsItemShown: false,
	},

	getStyles: function () {
		return ["mvgmunich.css"];
	},

	// Load translations files
	getTranslations: function () {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	start: function () {
		this.resultData = [];
		this.interruptionData = null;
		Log.info("Starting module: " + this.name + ", identifier: " + this.identifier);
		if (this.config.haltestelle !== "") {
			this.sendSocketNotification("GET_STATION_INFO", this.config);
		}
	},

	/*
	 * getData
	 * function call getData function in node_helper.js
	 *
	 */
	getData: function () {
		const self = this;
		self.sendSocketNotification("GET_DEPARTURE_DATA", self.config);
		setInterval(function () {
			self.sendSocketNotification("GET_DEPARTURE_DATA", self.config);
		}, self.config.updateInterval);
	},

	// Override dom generator.
	getDom: function () {
		let wrapperTable = document.createElement("div");
		if (this.config.haltestelle === "") {
			wrapperTable.className = "dimmed light small";
			wrapperTable.innerHTML = "Please set value for 'Haltestelle'.";
			return wrapperTable;
		}

		if (this.resultData === []) {
			wrapperTable.className = "dimmed light small";
			wrapperTable.innerHTML = "Loading data from MVG ...";
			return wrapperTable;
		}
		wrapperTable = document.createElement("table");
		wrapperTable.className = "small";
		wrapperTable.innerHTML = this.resultData[this.config.haltestelle];
		return wrapperTable;
	},

	getHtml: function (jsonObject) {
		let htmlText = "";

		let visibleLines = 0;
		for (let i = 0; i < jsonObject.departures.length; i++) {
			if (visibleLines >= this.config.maxEntries) {
				break;
			}
			// get one item from api result
			const apiResultItem = jsonObject.departures[i];
			// get transport type
			const transportType = apiResultItem.product.toLocaleLowerCase();

			// check if we should show data of this transport type
			if (!this.config.transportTypesToShow[transportType]
				|| this.config.ignoreStations.includes(apiResultItem.destination)
				|| this.checkToIgnoreOrIncludeLine(apiResultItem.label)
			) {
				continue;
			}

			if (this.config.showInterruptions && this.isLineAffected(apiResultItem.label)) {
				htmlText += "<tr class='gray'>";
			} else {
				htmlText += "<tr class='normal'>";
			}
			// check if user want's icons
			htmlText += this.showIcons(apiResultItem.product, this.config.showIcons);
			// add transport number
			htmlText += "<td>" + apiResultItem.label + "</td>";
			// add last station aka direction
			htmlText += "<td class='stationColumn'>" + apiResultItem.destination + "</td>";
			// check if user want's to see departure time
			htmlText += this.showDepartureTime(apiResultItem.departureTime);
			// check if user want's to see walking time
			htmlText += this.showWalkingTime(apiResultItem.departureTime);
			htmlText += "</tr>";
			if (this.config.showInterruptionsDetails && this.isLineAffected(apiResultItem.label)) {
				htmlText += "<tr><td></td><td class='empty' colspan='3'>" + this.getInterruptionsDetails(apiResultItem.label) + "</td></tr>";
				if (this.config.countInterruptionsAsItemShown) {
					visibleLines++;
				}
			}
			visibleLines++;
		}
		return htmlText;
	},

	checkToIgnoreOrIncludeLine: function (lineName) {
		return this.config.lineFiltering !== undefined 
		&& this.config.lineFiltering.active 
		&& (this.config.lineFiltering.filterType.localeCompare("whitelist") === 0 ?
				!this.checkLineNumbersIncludes(lineName) : this.checkLineNumbersIncludes(lineName));
	},

	checkLineNumbersIncludes: function (lineName) {
		return (this.config.lineFiltering.lineNumbers.includes(lineName));
	},

	isLineAffected: function (lineName) {
		for (let i = 0; i < this.interruptionData.affectedLines.line.length; i++) {
			if (this.interruptionData.affectedLines.line[i].line === lineName) {
				return true;
			}
		}
		return false;
	},

	getInterruptionsDetails: function (lineName) {
		for (let i = 0; i < this.interruptionData.interruption.length; i++) {
			for (let j = 0; j < this.interruptionData.interruption[i].lines.line.length; j++) {
				if (this.interruptionData.interruption[i].lines.line[j].line === lineName) {
					return this.interruptionData.interruption[i].duration.text + " - " + this.interruptionData.interruption[i].title;
				}
			}
		}
		return "";
	},

	showIcons: function (product, showIcons) {
		let icons = "";
		if (showIcons) {
			icons = "<td class='" + product.toLocaleLowerCase() + "'></td>";
		}
		return icons;
	}
	,

	showWalkingTime: function (departureTime) {
		let htmlText = "";
		if (this.config.showWalkingTime) {
			htmlText += "<td> / ";
			const startWalkingTime = new Date(departureTime - this.config.timeToWalk * MS_PER_MINUTE);
			// check what kind of walking time user wants (absolute / relative)
			if (this.config.walkingTimeFormat === "absolute") {
				htmlText += this.getAbsoluteTime(startWalkingTime);
			} else if (this.config.walkingTimeFormat === "relative") {
				htmlText += this.getRelativeTime(startWalkingTime);
			} else {
				htmlText += "walkingTimeFormat config is wrong";
			}
			htmlText += "</td>";
		}
		return htmlText;
	}
	,

	showDepartureTime: function (departureTime) {
		let htmlText = "";
		if (this.config.showTrainDepartureTime) {
			// add departure time
			htmlText += "<td class='timing'>";
			const departureDate = new Date(departureTime);
			// check what kind of time user wants (absolute / relative)
			if (this.config.trainDepartureTimeFormat === "absolute") {
				htmlText += this.getAbsoluteTime(departureDate);
			} else if (this.config.trainDepartureTimeFormat === "relative") {
				htmlText += this.getRelativeTime(departureDate);
			} else {
				htmlText += "trainDepartureTimeFormat config is wrong";
			}
			htmlText += "</td>";
		}
		return htmlText;
	}
	,

	getAbsoluteTime: function (time) {
		let hoursStr = (time.getHours() < 10 ? "0" : "") + time.getHours();
		let minutesStr = (time.getMinutes() < 10 ? "0" : "") + time.getMinutes();

		return hoursStr + ":" + minutesStr;
	}
	,

	getRelativeTime: function (time) {
		const timingForStartWalking = Math.floor((time.getTime() - new Date().getTime()) / 1000 / 60);
		return (timingForStartWalking <= 0
			? this.translate("JETZT")
			: this.translate("IN") + " " + timingForStartWalking + " " + this.translate("MIN"));
	}
	,

	// Override getHeader method.
	getHeader: function () {
		if (this.config.haltestelle !== "" || this.config.haltestelleName !== "") {
			return this.data.header + " Munich: " +
				(this.config.haltestelleName === "" ? this.config.haltestelle : this.config.haltestelleName);
		}
		return "";
	}
	,

	socketNotificationReceived: function (notification, payload) {
		switch (notification) {
		case "UPDATE_DEPARTURE_INFO":
			this.resultData[payload.haltestelle] = this.getHtml(payload.transport);
			break;

		case "UPDATE_STATION":
			if (this.config.haltestelle === payload.haltestelle) {
				this.config.haltestelleId = payload.haltestelleId;
				this.config.haltestelleName = payload.haltestelleName;
			}
			this.getHeader();
			this.getData();
			break;

		case "UPDATE_INTERRUPTION_DATA":
			this.interruptionData = payload;
			break;

		default:
			Log.error();
		}
		this.updateDom();
	}
});