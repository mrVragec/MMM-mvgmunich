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

  start: function() {
    this.updating = false;
    this.started = false;
    this.config = [];
  },

  socketNotificationReceived: function(notification, payload) {
    const self = this;
    if (notification === "GETDATA") {
      this.config[payload.identifier] = payload;
      this.updating = true;

      var url = payload.apiBase + "haltestelle=" + payload.haltestelle +
        ((payload.showUbahn) ? "&ubahn=checked" : "") +
        ((payload.showBus) ? "&bus=checked" : "") +
        ((payload.showTram) ? "&tram=checked" : "") +
        ((payload.showSbahn) ? "&sbahn=checked" : "");
      self.getData(url, payload.identifier);
      self.scheduleUpdate(url, payload.updateInterval, payload.identifier);
    }
  },

  getDepartureInfo: function(url, identifier) {
    var self = this;
    var retry = true;
    request(url, {
      encoding: 'binary'
    }, function(error, response, body) {
      // if we have response.code == 200 and no error
      if (!error && response.statusCode === 200) {
        $ = cheerio.load(body);
        var transportItems = [];
        $('tr').each(function(i, elem) {
          if ($(this).html().includes('lineColumn')) {
            $(this).each(function(j, element) {
              var transportItem = new Object();
              transportItem.station = $(this).find('td.stationColumn').text().trim();
              transportItem.line = $(this).find('td.lineColumn').text().trim();
              transportItem.time = $(this).find('td.inMinColumn').text().trim();
              transportItems.push(transportItem);
            })
          }
        });

        self.sendSocketNotification("UPDATE", {
          "transportItems": transportItems,
          "uuid": identifier
        });
        $('div').each(function(i, elem) {
          if ($(this).html().includes('Fehler')) {
            self.getHaltestelleInfo(identifier);
          }
        });
      }
      // if error
      if (error) {
        self.scheduleUpdate(url, 30000, identifier);
        // Error while reading departure data ...
        // send update request with error and identifier
        self.sendSocketNotification("UPDATE", {
          "error": "Error while reading data: " + error.message,
          "uuid": identifier
        });
        return;
      }
    });
  },

  getHaltestelleInfo: function(identifier) {
    var self = this;

    request(this.config[identifier].errorBase + "haltestelle=" + this.config[identifier].haltestelle, {
      encoding: 'binary'
    }, function(error, response, body) {

      if (response.statusCode === 200 && !error) {
        var transport = "";
        $ = cheerio.load(body);
        transport += "Station " + self.config[identifier].haltestelle + " is not correct, please update your config! <br> Hints for your station are: ";
        $('li').each(function(i, elem) {
          $(this).each(function(j, element) {
            transport += "<tr class='normal'><td>" + $(this).text().trim() + "</td></tr>";
          });
        });
        // send update request with error message and identifier
        self.sendSocketNotification("UPDATE", {
          "error": transport,
          "uuid": identifier
        });
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
  getData: function(url, identifier) {
    this.getDepartureInfo(url, identifier);
  },

  /* scheduleUpdate()
   * Schedule next update.
   */
  scheduleUpdate: function(url, updateInterval, identifier) {
    var self = this;
    setInterval(function() {
      self.getData(url, identifier);
    }, updateInterval);
  }
});
