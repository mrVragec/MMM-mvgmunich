# MMM-mvgmunich [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/mrVragec/MMM-mvgmunich/raw/master/LICENSE) [![Build Status](https://api.travis-ci.org/mrVragec/MMM-mvgmunich.svg?branch=master)](https://travis-ci.org/mrVragec/MMM-mvgmunich) [![Known Vulnerabiliries](https://snyk.io/test/github/mrvragec/mmm-mvgmunich/badge.svg)](https://snyk.io/test/github/mrvragec/mmm-mvgmunich) [![Code Climate](https://codeclimate.com/github/mrVragec/MMM-mvgmunich/badges/gpa.svg)](https://codeclimate.com/github/mrVragec/MMM-mvgmunich)

MagicMirror² Module to monitor public transport (U-bahn, tram, bus, S-Bahn) in Munich - Germany.

## Example
![](.github/Example_4.png)

## Dependencies
* instance of [MagicMirror²](https://github.com/MichMich/MagicMirror)
* urlencode (linux: npm install urlencode)

## Installation
1. Clone this repository in your MagicMirror installation into the folder modules.
2. Rename plugin foler from 'MMM-mvgmunich' to 'mvgmunich'
3. Install dependencies in main MagicMirror folder
4. Add configuration block to your config.js:
```
{
  module: "mvgmunich",
  position: "bottom_left",
  header: "MVG",
    config: {
      haltestelle: "Hauptbahnhof",
      maxEntries: 10,             // 10 items on screen
      updateInterval: 60000,      // 60 s
      showIcons: true,            // Show transport type icon
      transportTypesToShow: {
        "ubahn": true,            // show ubahn route
        "sbahn": true,            // show sbahn route
        "bus": true,              // show bus route
        "regional_bus": true,     // show regional bus route
        "tram": true              // show tram route
      },
      ignoreStations: [],         // destination not to be shown
      timeToWalk: 10,             // 10 min walking time to station. Default is 0
      showWalkingTime: false,     // if the walking time should be included and the starting time is displayed
      showTrainDepartureTime: true,     // show tran departure time
      trainDepartureTimeFormat: "relative",   // format of the train departure time
      walkingTimeFormat: "relative",    // format of the walking time
    }
},
```

## Config Options
| **Option**        | **Description** |
| --- | --- |
| `haltestelle`     | Station for which you want to display data. <br> **Default:** `Hauptbahnhof` <br> **Source:** http://www.mvg-live.de/MvgLive/MvgLive.jsp |
| `maxEntries`      | Number of items shown in table. <br> **Default:** `8` |
| `updateInterval`  | Update interval <br> **Default:** `60000` |
| `ubahn`           | Show data for U-Bahn. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `bus`             | Show data for Bus. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `regional_bus`    | Show data for regional Bus. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `tram`            | Show data for Tram. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `sbahn`           | Show data for S-Bahn. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `ignoreStations`  | Ignore destinations based on a array list. <br> **Possible values e.g.:** `["Feldmoching", "Hauptbahnhof"]` <br> **Default** `[]` |
| `timeToWalk`      | Time to walk to the station from your current location <br> **Default:** `0` minutes |
| `showWalkingTime`  | If the time to leave should be displayed which includes the walking time. <br> **Possible values:** `true` or `false` <br> **Default:** `false` |
| `showTrainDepartureTime` | If the time of train departure should be displayed. <br> **Possible values:** `true` or `false` <br> **Default:** `true` |
| `trainDepartureTimeFormat` | Train departure time format. Absolute: 21:10; Relative: in 8 min; <br> **Possible values:** `relative` or `absolute` <br> **Default** `relative` |
| `walkingTimeFormat` | Walking time format. Absolute: 21:08; Relative in 6 min; <br> **Possible values:** `relative` or `absolute` <br> **Default** `relative` |
