/* Timetable for public transport in Munich */

/*
 * Magic Mirror
 * Module: MVG Munich
 *
 * By Simon Crnko, Christian Huppertz
 * MIT Licensed
 *
 */

var MS_PER_MINUTE = 60000;

Module.register("mvgmunich", {
  // Default module configuration
  defaults: {
    maxEntries: 8, // maximum number of results shown on UI
    updateInterval: 1000 * 60, // update every 60 seconds
    retryDelay: 5000,
    apiBase: "http://www.mvg-live.de/ims/dfiStaticAnzeige.svc?",
    errorBase: "http://www.mvg-live.de/ims/dfiStaticAuswahl.svc?",
    haltestelle: "Hauptbahnhof", // default departure station
    showUbahn: true, //show ubahn route
    showBus: true, // show bus route
    showTram: true, // show tram route
    showSbahn: true, // show sbahn route
    ignoreStations: [], 
    timeToWalk: 11
  },

  getStyles: function() {
    return ["mvgmunich.css"];
  },

  start: function() {
    this.resultData = [];
    var self = this;
    this.config.identifier = this.identifier;
    this.getData();
    setInterval(function() {
      self.updateDom();
    }, this.config.updateInterval);
  },

  /*
   * getData
   * function call getData function in node_helper.js
   *
   */
  getData: function(identifier) {
    this.sendSocketNotification("GETDATA", this.config);
  },

  // Override dom generator.
  getDom: function() {
    var wrapperTable = document.createElement("table");
    wrapperTable.className = "small";
    wrapperTable.innerHTML = this.resultData[this.identifier];
    return wrapperTable;
  },

  processData: function(payload) {
    // we have a runner
    if (payload.error !== "undefined" && payload.error) {
      this.resultData[payload.uuid] = payload.error;
      // we have a data object; Just Do Something
    } else if (payload.transportItems !== "undefined" && payload.transportItems) {
      var transportItems = payload.transportItems;
      payload.transportItems.sort(function(a, b) {
        return a.time - b.time;
      })
      var transport = "";
      var currentdate = new Date();

      for (var i in transportItems) {
      
        // format time string
        var time = new Date(currentdate.valueOf() + transportItems[i].time*MS_PER_MINUTE - this.config.timeToWalk*MS_PER_MINUTE);
        var hoursStr = (time.getHours() < 10 ? '0' : '') + time.getHours();
        var minutesStr = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();

	      transport += "<tr class='normal'>";
        transport += "<td>" + transportItems[i].line + "</td>" + "<td class='stationColumn'>" + transportItems[i].station + "</td>" + "<td>" + transportItems[i].time + "</td>"
                  + "<td>" + hoursStr + ":" + minutesStr + "</td>";
        transport += "</tr>";

        if (i == this.config.maxEntries - 1) {
          break;
        }
      }
      this.resultData[payload.uuid] = transport;
    }
  },

  // Override getHeader method.
  getHeader: function() {
    return this.data.header + " Munich: " + this.config.haltestelle;
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "UPDATE") {
      this.processData(payload);
      this.updateDom();
    }
  }
});
