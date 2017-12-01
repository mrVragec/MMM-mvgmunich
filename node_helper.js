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
        this.config = [];
    },

    socketNotificationReceived: function (notification, payload) {
        const self = this;
        if (notification === "GETDATA") {
            this.config.push(payload);
            this.updating = true;
            self.getData(payload);
            self.scheduleUpdate(payload);
        }
    },

    getDepartureInfo: function (config) {
        var self = this;
        var haltestelle = "haltestelle=" + config.haltestelle;
        var ubahn = ((config.showUbahn) ? "&ubahn=checked" : "");
        var bus = ((config.showBus) ? "&bus=checked" : "");
        var tram = ((config.showTram) ? "&tram=checked" : "");
        var sbahn = ((config.showSbahn) ? "&sbahn=checked" : "");
        var urlApi = config.apiBase + haltestelle + ubahn + bus + tram + sbahn;
        var retry = true;
        //console.log("urlApi: " + urlApi);
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
                    if (i == config.maxEntries-1) {
                        break;
                    }
                }
                config.transport = transport;
                self.sendSocketNotification("UPDATE", config);
                $('div').each(function (i, elem) {
                    if ($(this).html().includes('Fehler')) {
                        self.getHaltestelleInfo();
                    }
                });
            }
            if (error) {
                self.scheduleUpdate((self.loaded) ? -1 : config.retryDelay);
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
    getData: function (conf) {
        //console.log("Updating: " + new Date() + " " + conf.haltestelle);
        this.getDepartureInfo(conf);
    },

    /* scheduleUpdate()
     * Schedule next update.
     * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function (conf) {
        var nextLoad = this.config.updateInterval;
        if (typeof conf.updateInterval !== "undefined" && conf.updateInterval >= 0) {
            nextLoad = conf.updateInterval;
        }
        nextLoad = nextLoad;
        var self = this;
        setInterval(function () {
            self.getData(conf);
        }, nextLoad);
    }
});
