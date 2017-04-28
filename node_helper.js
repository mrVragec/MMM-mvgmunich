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

    /* updateTimetable(transports)
     * Calls processTrains on succesfull response.
     */
    getData: function () {
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
            if (response.statusCode === 200 && !error) {
                $ = cheerio.load(body);
                var transport = "";
                $('tr').each(function (i, elem) {
                    if ($(this).html().includes('lineColumn')) {
                        transport += "<tr class='normal'>";
                        $(this).each(function (j, element) {
                            transport += $(this).html().trim();
                        })
                        transport += "</tr>";
                    }
                    if (i >= self.config.maxEntries) {
                        return false;
                    }
                });
                self.sendSocketNotification("UPDATE", transport);
            }

            if (error) {
                self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
            }
        });
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
