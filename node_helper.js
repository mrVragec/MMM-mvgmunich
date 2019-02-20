/*
 * Magic Mirror
 * Node Helper: mvgmunich
 *
 * By Simon Crnko
 * MIT Licensed
 *
 */

var NodeHelper = require("node_helper");
var request = require("request");
var urlencode = require('urlencode');
var globals = {
	"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36",
	"Content-Type": "application/x-www-form-urlencoded",
	"Accept": "application/json, text/javascript, */*; q=0.01",
	"X-Requested-With": "XMLHttpRequest",
	"X-MVG-Authorization-Key": "5af1beca494712ed38d313714d4caff6",
	"Referer": "https://www.mvg.de/dienste/abfahrtszeiten.html",
	"Accept-Encoding": "gzip",
	"Accept-Language": "en-US,en;q=0.9,de;q=0.8"
};

module.exports = NodeHelper.create({

	start: function() {
		this.config = null;
	},

	socketNotificationReceived: function(notification, payload) {
		const self = this;
		this.config = payload;
		if (notification === "GETDATA") {
			self.getDepartureInfo();
			self.scheduleUpdate(this.config.updateInterval);
		}
		if (notification === "GETSTATION") {
			self.getStationInfo();
		}
	},

	getDepartureInfo: function() {
		var self = this;

		request({
			headers: globals,
			uri: self.config.apiBase + self.config.haltestelleId + "?footway=" + self.config.timeToWalk,
			method: "GET",
			gzip: true
		}, function(error, response, body) {
			if (error) {
				// Error while reading departure data ...
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				var jsonObject = JSON.parse(body);
				self.sendSocketNotification("UPDATE", jsonObject);
			}
		});
	},

	getStationInfo: function() {
		var self = this;

		request({
			headers: globals,
			uri: self.config.stationQuery + urlencode(self.config.haltestelle),
			method: "GET",
			gzip: true
		}, function(error, response, body) {
			if (error) {
				// Error while reading departure data ...
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				try {
					var jsonObject = JSON.parse(body);
					if(jsonObject.locations[0].id === undefined) {
						self.sendSocketNotification("ERROR_NO_STATION", "");
					} else
						self.sendSocketNotification("STATION", jsonObject.locations[0]);
				} catch (e) {
						self.sendSocketNotification("ERROR_NO_STATION", "");
				}
			}
		});
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad;
		var self = this;
		setInterval(function() {
			self.getDepartureInfo();
		}, nextLoad);
	}
});
