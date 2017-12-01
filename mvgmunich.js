/* Timetable for public transport in Munich */

/*
 * Magic Mirror
 * Module: MVG Munich
 *
 * By Simon Crnko
 * MIT Licensed
 *
 */

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
        showSbahn: true // show sbahn route
    },

    getStyles: function () {
        return ["mvgmunich.css"];
    },

    start: function () {
        this.resultData = [];
        var self = this;
        Log.info("Starting module: " + this.name + ", identifier: " + this.identifier);
        this.dataRequest = this.translate("LOADING");
        this.config.identifier = this.identifier;
        this.getData();
        setInterval(function () {
            self.updateDom();
        }, this.config.updateInterval);
    },

    /*
     * getData
     * function call getData function in node_helper.js
     *
     */
    getData: function (identifier) {
        this.sendSocketNotification("GETDATA", this.config);
    },

    // Override dom generator.
    getDom: function () {
        var wrapperTable = document.createElement("table");
        wrapperTable.className = "small";
        //Log.log(this.identifier + " "  + this.config.haltestelle + " " + this.resultData[this.config.haltestelle]);
        wrapperTable.innerHTML = this.resultData[this.config.haltestelle];

        return wrapperTable;
    },

    processData: function (data) {
        //Log.log(data.haltestelle + " - " + data.transport);
        this.resultData[data.haltestelle] = data.transport;
    },

    // Override getHeader method.
    getHeader: function () {
        return this.data.header + " Munich: " + this.config.haltestelle;
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "UPDATE") {
            this.processData(payload);
            this.updateDom();
        }
    }
});
