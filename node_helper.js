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
const mvgAPI = "https://www.mvg.de/";
const apiBase = mvgAPI + "api/fahrinfo/departure/";
const stationQuery = mvgAPI + "api/fahrinfo/location/queryWeb?q=";
const interruptionsURL = mvgAPI + ".rest/betriebsaenderungen/api/interruptions?_=";
module.exports = NodeHelper.create({

	socketNotificationReceived: function (notification, payload) {
		const self = this;
		switch (notification) {
		case "GET_STATION_INFO":
			self.getStationInfo(payload);
			self.getInterruptionsInfo();
			break;
		case "GET_DEPARTURE_DATA":
			self.getDepartureInfo(payload);
			break;
		default:
			console.error("Switch item {} is missing", notification);
		}
	},

	getStationId: function(name) {
		request({
			headers: globals,
			uri: "https://www.mvg.de/api/fib/v2/location?query=" + name,
			method: "GET",
			gzip: true
		}, function (error, response, body) {
			if (error) {
				// Error while reading departure data ...
				console.error("Error while reading station info", error);
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				try {
					return JSON.parse(body)[0].globalId;
				} catch (e) {
					console.error("Error while parsing and sending departure info", e);
					self.sendSocketNotification("ERROR_NO_DEPARTURE_DATA", "");
				}
			}
		});
		
	},

	getDepartureInfo: function (payload) {
		const self = this;
		request({
			headers: globals,
			uri: apiBase + payload.haltestelleId + "?footway=" + payload.timeToWalk,
			method: "GET",
			gzip: true
		}, function (error, response, body) {
			if (error) {
				// Error while reading departure data ...
				console.error("Error while reading departure info", error);
				self.sendSocketNotification("ERROR", "Error while reading data: " + error.message);
			} else {
				// body is the decompressed response body
				try {
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
		request({
			headers: globals,

				/*
				NEW API example:
				curl --request GET --url 'https://www.mvg.de/api/fib/v2/departure?limit=10&offsetInMinutes=0&transportTypes=UBAHN%2CTRAM%2CBUS%2CSBAHN%2CSCHIFF&globalId=de%3A09184%3A490
				Response looks different and cannot be adapted 1:1

				It looks like we have to gather the globalId via 
				curl --request GET --url 'https://www.mvg.de/api/fib/v2/location?query=garching'

				*/

			uri: stationQuery + urlencode(payload.haltestelle),
			// uri: stationQuery + urlencode(payload.haltestelle),
			uri: "https://www.mvg.de/api/fib/v2/departure?limit=10&offsetInMinutes=0&transportTypes=UBAHN,TRAM,BUS,SBAHN,SCHIFF&globalId=de%3A09184%3A490",
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
					console.log(body)
					const jsonObject = JSON.parse(body);
					if (jsonObject[0].id === undefined) {
						self.sendSocketNotification("ERROR_NO_STATION", "");
					} else {
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

	getInterruptionsInfo: function () {
		const self = this;

		request({
			headers: globals,
			uri: interruptionsURL + new Date().getMilliseconds(),
			method: "GET",
			gzip: true
		}, function (error, response, body) {
			if (error) {
				// Error while reading interruptions data ...
				console.error("Error while reading interruptions data", error);
			} else {
				// body is the decompressed response body
				try {
					let jsonObject = JSON.parse(body);
					self.sendSocketNotification("UPDATE_INTERRUPTION_DATA", jsonObject);
				} catch (e) {
					// Error while reading interruptions data ...
					console.error("Error while parsing interruptions data", e);
				}
			}
		});
	},
});