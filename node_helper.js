/*
 * Magic Mirror
 * Node Helper: mvgmunich
 *
 * By Simon Crnko
 * MIT Licensed
 *
 */

const NodeHelper = require("node_helper");
const request = require("request");
const urlencode = require("urlencode");
const globals = {
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

	socketNotificationReceived: function (notification, payload) {
		// console.log("Notification in node_helper: " + notification + " - " + payload);
		const self = this;
		switch (notification) {
		case "GET_STATION_INFO":
			self.getStationInfo(payload);
			break;
		case "GET_DEPARTURE_DATA":
			self.getDepartureInfo(payload);
			break;
		default:
			console.error("Switch item {} is missing", notification);
		}
	},

	getDepartureInfo: function (payload) {
		const self = this;
		// console.log("Haltestelle: {} URL: {}", payload.haltestelle, payload.apiBase + payload.haltestelleId + "?footway=" + payload.timeToWalk);
		request({
			headers: globals,
			uri: payload.apiBase + payload.haltestelleId + "?footway=" + payload.timeToWalk,
			method: "GET",
			gzip: true
		}, function (error, response, body) {
			// console.log("Response: " + response);
			// console.log("Body: " + body);
			if (error) {
				// Error while reading departure data ...
				console.error("Error while reading departure info", error);
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				try {
					// console.log("haltestelle: {} Body: {}", payload.haltestelle, body);
					// console.log("haltestelle: {} jsonObject: {}", payload.haltestelle, jsonObject);
					// payload.transport = self.getHtml(JSON.parse(body), payload);
					payload.transport = JSON.parse(body);
					self.sendSocketNotification("UPDATE_DEPARTURE_INFO", payload);
				} catch (e) {
					console.error("Error while parsing and sending departure info", e);
					self.sendSocketNotification("ERROR_NO_DEPARTURE_DATA", "");
				}
			}
		});
	},

	getStationInfo: function (payload) {
		const self = this;
		// console.log("Station info Query: {}", payload.stationQuery + urlencode(payload.haltestelle));
		request({
			headers: globals,
			uri: payload.stationQuery + urlencode(payload.haltestelle),
			method: "GET",
			gzip: true
		}, function (error, response, body) {
			if (error) {
				// Error while reading station data ...
				console.error("Error while reading station data", error);
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				try {
					const jsonObject = JSON.parse(body);
					if (jsonObject.locations[0].id === undefined) {
						self.sendSocketNotification("ERROR_NO_STATION", "");
					} else {
						// console.log("json: {}", jsonObject.locations[0]);
						payload.haltestelleId = jsonObject.locations[0].id;
						payload.haltestelleName = jsonObject.locations[0].name;
						self.sendSocketNotification("UPDATE_STATION", payload);
					}
				} catch (e) {
					console.error("Error while parsing and sending station info", e);
					self.sendSocketNotification("ERROR_NO_STATION", "");
				}
			}
		});
	},

});
