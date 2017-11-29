/*
 * Magic Mirror
 * Node Helper: MMM-mvgmunich
 *
 * By Simon Crnko
 * MIT Licensed
 *
 */

var NodeHelper = require("node_helper");

var cheerio = require('cheerio');
var filter = require('array-filter');
var request = require('request');

module.exports = NodeHelper.create({

    start: function () {
        this.updating = false;
        this.started = false;
        this.config = null;
    },

    socketNotificationReceived: function (notification, payload) {
        const self = this;
        if (notification === "GETDATA") {
            this.config = payload;
            this.updating = true;
            self.getData();
            self.scheduleUpdate(this.config.updateInterval);
        }
    },

    getDepartureInfo: function () {
        var self = this;
        var haltestelle = "haltestelle=" + this.config.haltestelle;
        var ubahn = ((this.config.showUbahn) ? "&ubahn=checked" : "");
        var bus = ((this.config.showBus) ? "&bus=checked" : "");
        var tram = ((this.config.showTram) ? "&tram=checked" : "");
        var sbahn = ((this.config.showSbahn) ? "&sbahn=checked" : "");
        var urlApi = self.config.apiBase + haltestelle + ubahn + bus + tram + sbahn;
        var retry = true;
        request(urlApi, {
            encoding: 'binary'
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var transport = "";
                $ = cheerio.load(body);
                var transportItems = [];
                $('tr').each(function (i, elem) {
                    if ($(this).html().includes('lineColumn')) {
                          $(this).each(function (j, element) {
                              var transportItem = new Object();
                              var str = $(this).html().trim();
                              str = $(str).text();
                              str = str.split("\n");
                              transportItem.station = str[2].trim();
                              transportItem.line = str[0].trim();
                              transportItem.time = str[5].trim();
                              transportItems.push(transportItem);
                         })
                    }
                });
                transportItems.sort(function(a, b) {
                    return a.time - b.time;
                })
                for (var i in transportItems) {
                    transport += "<tr class='normal'>";
                    //TODO: add data from item !!!
                    transport += "<td>" + transportItems[i].line + "</td>";
                    transport += "<td class='stationColumn'>" + transportItems[i].station + "</td>";
                    transport += "<td>" + transportItems[i].time + "</td>";
                    transport += "</tr>";
                    if (i == self.config.maxEntries-1) {
                        break;
                    }
                }
                self.sendSocketNotification("UPDATE", transport);
                $('div').each(function (i, elem) {
                    if ($(this).html().includes('Fehler')) {
                        self.getHaltestelleInfo();
                    }
                });
            }
            if (error) {
                self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
                // Error while reading departure data ...
                self.sendSocketNotification("UPDATE", 'Error while reading data: ' + error.message);
            }
        });
    },

    getHaltestelleInfo: function () {
        var self = this;
        var haltestelle = "haltestelle=" + this.config.haltestelle;
        request(self.config.errorBase + haltestelle, {
            encoding: 'binary'
        }, function (error, response, body) {
            if (response.statusCode === 200 && !error) {
                var transport = "";
                $ = cheerio.load(body);
                transport += "Station " + self.config.haltestelle + " is not correct, please update your config! <br> Hints for your station are: ";
                $('li').each(function (i, elem) {
                    $(this).each(function (j, element) {
                        transport += "<tr class='normal'><td>";
                        transport += $(this).text().trim();
                        transport += "</td></tr>";
                    });
                });
                self.sendSocketNotification("UPDATE", transport);
            }
            if (error) {
                // Error while reading departure data ...
                self.sendSocketNotification("UPDATE", 'Error while reading data: ' + error.message);
            }
        });
    },

    /* updateTimetable(transports)
     * Calls processTrains on succesfull response.
     */
    getData: function () {
        this.getDepartureInfo();
    },

    /* scheduleUpdate()
     * Schedule next update.
     * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function (delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }
        nextLoad = nextLoad;
        var self = this;
        setInterval(function () {
            self.getData();
        }, nextLoad);
    }
});
