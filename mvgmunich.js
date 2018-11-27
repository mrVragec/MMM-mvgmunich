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
		apiBase: "https://www.mvg.de/fahrinfo/api/departure/",
		stationQuery: "https://www.mvg.de/fahrinfo/api/location/queryWeb?q=",
		haltestelle: "Hauptbahnhof", // default departure station
		haltestelleId: 0,
		haltestelleName: "",
		ignoreStations: [], // list of destination to be ignored in the list
		timeToWalk: 0, // walking time to the station
		includeWalkingTime: false, // if the walking time should be included and the starting time is displayed
		showIcons: true,
		transportTypesToShow: {
			"ubahn": true,
			"sbahn": true,
			"bus": true,
			"tram": true
		}
	},

	getStyles: function() {
		return ["mvgmunich.css"];
	},

	// Load translations files
	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	start: function() {
		var self = this;
		Log.info("Starting module: " + this.name);
		this.loaded = false;
		this.getData();
		setInterval(function() {
			self.updateDom();
		}, this.config.updateInterval);
	},

	/*
	 * getData
	 * function call getData function in node_helper.js
	 */
	getData: function() {
		// get first stationId based on station name
		this.sendSocketNotification("GETSTATION", this.config);
	},

	// Override dom generator.
	getDom: function() {
		var wrapperTable = document.createElement("div");
		if (this.config.haltestelle === "") {
			wrapperTable.className = "dimmed light small";
			wrapperTable.innerHTML = "Please set value for 'Haltestelle'.";
		}
		if (!this.loaded) {
			wrapperTable.className = "dimmed light small";
			wrapperTable.innerHTML = "Loading data from MVG ...";
			return wrapperTable;
		}
		var wrapperTable = document.createElement("table");
		wrapperTable.className = "small";
		wrapperTable.innerHTML = this.dataRequest;
		return wrapperTable;
	},

	getHtml: function(jsonObject) {
		var htmlText = "";
		var noOfItems = 0;

		for (var i = 0, len = jsonObject.departures.length; i < len; i++) {
			// get one item from api result
			var apiResultItem = jsonObject.departures[i];
			// get transport type
			var transportType = apiResultItem.product.toLocaleLowerCase();

			// check if we should show data of this transport type
			// check if current station is not part of the ignore list
			if (!this.config.transportTypesToShow[transportType] ||
				this.config.ignoreStations.includes(apiResultItem.destination)) {
				continue;
			}

			var timingForCurrentTrain = Math.floor((new Date(apiResultItem.departureTime).getTime() - new Date().getTime()) / 1000 / 60);

			this.htmlText += "<tr class='normal'>";
			// check if user want's icons or not
			if (this.config.showIcons) {
				htmlText += "<td class='" + apiResultItem.product.toLocaleLowerCase() + "'>" + apiResultItem.label + "</td>";
			} else {
				htmlText += "<td>" + apiResultItem.label + "</td>";
			}
			htmlText += "<td class='stationColumn'>" + apiResultItem.destination + "</td>";
			htmlText += "<td class='timing'>" +
				(timingForCurrentTrain <= 0 ? this.translate("JETZT") : this.translate("IN") +
					" " + timingForCurrentTrain + " " + this.translate("MIN")
				) + "</td>";
			htmlText += "</tr>";

			noOfItems++;
			if (noOfItems == this.config.maxEntries) {
				break;
			}
		}

		return htmlText;
	},

	// Override getHeader method.
	getHeader: function() {
		return this.data.header + " Munich: " + this.config.haltestelleName;
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "UPDATE") {
			this.dataRequest = this.getHtml(payload);
			this.loaded = true;
			this.updateDom();
		}
		if (notification === "ERROR") {
			this.dataRequest = payload;
			this.loaded = true;
			this.updateDom();
		}
		if (notification === "ERROR_NO_STATION") {
			this.dataRequest = this.translate("NO_STATION");
			this.loaded = true;
			this.updateDom();
		}
		if (notification === "STATION") {
			console.log("Payload: " + payload);
			this.config.haltestelleName = payload.name;
			this.config.haltestelleId = payload.id
			this.sendSocketNotification("GETDATA", this.config);
		}
	}
});
