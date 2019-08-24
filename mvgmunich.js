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
		interruptionsURL: "https://www.mvg.de/.rest/betriebsaenderungen/api/interruptions?_=1550777673738",
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
		showInterruptions: false,
		showInterruptionsDetails: true,
		interruptionsDetailsRotateInterval: MS_PER_MINUTE, // time in seconds
		interruptionsFilter: { },
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

		if(this.config.showInterruptions) {
			setInterval(function() {
				self.updateDom();
			}, this.config.interruptionsDetailsRotateTime);
		}
	},

	/*
	 * getData
	 * function call getData function in node_helper.js
	 */
	getData: function() {
		// get first stationId based on station name
		this.sendSocketNotification("GETSTATION", this.config);
		this.sendSocketNotification("GETINTERRUPTIONSDATA", this.config);
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");
		if (this.config.haltestelle === "") {
			wrapper.className = "dimmed light small";
			wrapper.innerHTML = "Please set value for 'Haltestelle'.";
			return wrapper;
		}
		if (!this.loaded) {
			wrapper.className = "dimmed light small";
			wrapper.innerHTML = "Loading data from MVG ...";
			return wrapper;
		}
		var contentTable = document.createElement("table");
		contentTable.className = "small";
		contentTable.innerHTML = this.dataRequest;
		wrapper.appendChild(contentTable);
		if(this.config.showInterruptions) {
			var interruptions = document.createElement("div");
			interruptions.className = "interruptions small";
			interruptions.innerHTML = this.interruptionsData;
			wrapper.appendChild(interruptions);
		}
		return wrapper;
	},

	getHtml: function(jsonObject, tag) {
		var htmlText = "";

		if(tag === "IR") {
			var ubahn = "";
			var tram = "";
			var bus = "";
			var sbahn = "";
			for (var i = 0; i < jsonObject.affectedLines.line.length; i++) {
				var apiResultItem = jsonObject.affectedLines.line[i];
				console.log(apiResultItem.line);
				if(apiResultItem.product === "U") {
					ubahn += " " + apiResultItem.line;
				} else if(apiResultItem.product === "T") {
					tram += " " + apiResultItem.line;
				} else if(apiResultItem.product === "B") {
					bus +=  " " + apiResultItem.line;
				}
			}
			htmlText = "<table class='interruptions'>" + 
			"<tr><td class='ubahn'></td><td>" +  ubahn + "</td></tr>" +
			"<tr><td class='tram'></td><td>" + tram + "</td></tr>" +
			"<tr><td class='bus'></td><td>" + bus + "</td></tr></table>";
		} else {
			for (var i = 0; i < this.config.maxEntries; i++) {
				// get one item from api result
				var apiResultItem = jsonObject.departures[i];
				if(apiResultItem === undefined)
					continue;
				// get transport type
				var transportType = apiResultItem.product.toLocaleLowerCase();

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
				htmlText += this.showDepartureTime(apiResultItem.departureTime, this.config);
				// check if user want's to see walking time
				htmlText += this.showWalkingTime(apiResultItem.departureTime);
				htmlText += "</tr>";
			}
		}
		return htmlText;
	},

	showIcons(product, showIcons) {
		if(showIcons) 
			return "<td class='" + product.toLocaleLowerCase() + "'></td>";
		return "";
	},

	showWalkingTime: function (departureTime) {
		var htmlText = "";
		if (this.config.showWalkingTime) {
			htmlText += "<td> / ";
			var startWalkingTime = new Date(departureTime - this.config.timeToWalk * MS_PER_MINUTE);
			// check what kind of walking time user wants (absolute / relative)
			if(this.config.walkingTimeFormat == "absolute") {
					htmlText += this.getAbsoluteTime(startWalkingTime);
			} else if (this.config.walkingTimeFormat == "relative") {
				htmlText += this.getRelativeTime(startWalkingTime);
			} else {
				htmlText += "walkingTimeFormat config is wrong"
			}
			htmlText += "</td>";
		}
		return htmlText;
	},

	showDepartureTime: function (departureTime, config) {
		var htmlText = "";
		if(config.showTrainDepartureTime) {
			// add departure time
			htmlText += "<td class='timing'>";
			var departureTime = new Date(departureTime)

			// check what kind of time user wants (absolute / relative)		
			if(config.trainDepartureTimeFormat == "absolute") {
				htmlText += this.getAbsoluteTime(departureTime);
			} else if (config.trainDepartureTimeFormat == "relative") {
				htmlText += this.getRelativeTime(departureTime);
			} else {
				htmlText += "trainDepartureTimeFormat config is wrong"
			}
			htmlText +=  "</td>";
		}
		return htmlText;
	},

	getAbsoluteTime: function(time) {
		var hoursStr = (time.getHours() < 10 ? '0' : '') + time.getHours();
		var minutesStr = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();

		return hoursStr + ":" + minutesStr;
	},

	getRelativeTime: function(time) {
		var timingForStartWalking = Math.floor((time.getTime() - new Date().getTime()) / 1000 / 60);
		return (timingForStartWalking <=0
			? this.translate("JETZT") 
			: this.translate("IN") + " " + timingForStartWalking + " " + this.translate("MIN"));
	},

	// Override getHeader method.
	getHeader: function() {
		return this.data.header + " Munich: " + this.config.haltestelleName;
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "UPDATE") {
			this.dataRequest = this.getHtml(payload, "");
			this.loaded = true;
			this.updateDom();
		}
		if (notification === "UPDATE2") {
			console.log(payload);
			this.interruptionsData = this.getHtml(payload, "IR");
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
			this.config.haltestelleName = payload.name;
			this.config.haltestelleId = payload.id
			this.sendSocketNotification("GETMAINDATA", this.config);
		}
	}
});
