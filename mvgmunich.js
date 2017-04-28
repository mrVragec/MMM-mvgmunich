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
        var self = this;
        Log.info("Starting module: " + this.name);
        this.dataRequest = this.translate("LOADING");
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
    getData: function () {
        this.sendSocketNotification("GETDATA", this.config);
    },

    // Override dom generator.
    getDom: function () {
        var wrapperTable = document.createElement("table");
        wrapperTable.className = "small";
        wrapperTable.innerHTML = this.dataRequest;
        return wrapperTable;
    },

    processData: function (data) {
        var self = this;
        this.dataRequest = data;
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
