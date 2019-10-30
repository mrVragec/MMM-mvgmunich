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
const mvgAPI = "https://www.mvg.de/api";
Module.register("mvgmunich", {
	// Default module configuration
	defaults: {
		maxEntries: 8, // maximum number of results shown on UI
		updateInterval: MS_PER_MINUTE, // update every 60 seconds
		apiBase: mvgAPI + "/fahrinfo/departure/",
		stationQuery: mvgAPI + "/fahrinfo/location/queryWeb?q=",
		haltestelle: "Hauptbahnhof", // default departure station
		haltestelleId: 0,
		haltestelleName: "",
		ignoreStations: [], // list of destination to be ignored in the list
		timeToWalk: 0, // walking time to the station
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
		}
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
		// console.log("this.resultData: {}", this.resultData);
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

		// console.log("payload.maxEntries: " + payload.maxEntries);
		for (let i = 0; i < this.config.maxEntries; i++) {
			// get one item from api result
			const apiResultItem = jsonObject.departures[i];
			// get transport type
			const transportType = apiResultItem.product.toLocaleLowerCase();

			// console.log("transportType: " + transportType);
			// console.log("apiResultItem.destination: " + apiResultItem.destination);
			// console.log("apiResultItem.departureTime: " + apiResultItem.departureTime);

			// check if we should show data of this transport type
			// check if current station is not part of the ignore list
			if (!this.config.transportTypesToShow[transportType] ||
				this.config.ignoreStations.includes(apiResultItem.destination)) {
				continue;
			}

			htmlText += "<tr class='normal'>";
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
		}
		// console.log("htmlText: " + "haltestelle: " + payload.haltestelle + " - " + htmlText);
		return htmlText;
	},

	showIcons: function (product, showIcons) {
		// console.log("Show icons: ", showIcons);
		let icons = "";
		if (showIcons) {
			icons = "<td class='" + product.toLocaleLowerCase() + "'></td>";
		}
		// console.log("Icons content: {}", icons);
		return icons;
	},

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
	},

	showDepartureTime: function (departureTime) {
		let htmlText = "";
		if (this.config.showTrainDepartureTime) {
			// add departure time
			htmlText += "<td class='timing'>";
			const departureDate = new Date(departureTime);
			// console.log("departureDate: " + departureDate);
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
	},

	getAbsoluteTime: function (time) {
		let hoursStr = (time.getHours() < 10 ? "0" : "") + time.getHours();
		let minutesStr = (time.getMinutes() < 10 ? "0" : "") + time.getMinutes();

		return hoursStr + ":" + minutesStr;
	},

	getRelativeTime: function (time) {
		const timingForStartWalking = Math.floor((time.getTime() - new Date().getTime()) / 1000 / 60);
		return (timingForStartWalking <= 0
			? this.translate("JETZT")
			: this.translate("IN") + " " + timingForStartWalking + " " + this.translate("MIN"));
	},

	// Override getHeader method.
	getHeader: function () {
		if (this.config.haltestelle !== "" || this.config.haltestelleName !== "") {
			return this.data.header + " Munich: " +
				(this.config.haltestelleName === "" ? this.config.haltestelle : this.config.haltestelleName);
		}
		return "";
	},

	socketNotificationReceived: function (notification, payload) {
		// console.log("Notification in mvgmunich: " + notification + " - " + payload);
		// console.log("this.config.haltestelle: " + this.config.haltestelle);
		// console.log("payload.transport: " + payload.transport);
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
		default:
			Log.error();
		}
		this.updateDom();
	}
});
