/* global Module, MMM-Consumer-Flights */

/* Magic Mirror
 * Module: node_helper
 *
 * By Neil Scott
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");

//global Var
const startTime = new Date(); //use for getting elapsed times during debugging

const moment = require('moment-timezone');
const csv = require('csvtojson')
const fs = require('fs');

//pseudo structures for commonality across all modules
//obtained from a helper file of modules

var LOG = require('../MMM-FeedUtilities/LOG');
var RSS = require('../MMM-FeedUtilities/RSS');

// get required structures and utilities

const structures = require("../MMM-ChartUtilities/structures");
const utilities = require("../MMM-ChartUtilities/common");
const mergutils = new utilities.mergeutils();

var commonutils = require('../MMM-FeedUtilities/utilities');

const JSONutils = new utilities.JSONutils();
const configutils = new utilities.configutils();

// just for this helper

const svgutils = require('./airline.js');
const svgutil = new svgutils.airlines();

module.exports = NodeHelper.create({

	start: function () {

		this.debug = true;

		console.log(this.name + ' is started!');
		this.consumerstorage = {}; // contains the config and feedstorage

		this.currentmoduleinstance = '';
		this.logger = {};

	},

	setconfig: function (aconfig) {

		var moduleinstance = aconfig.moduleinstance;
		var config = aconfig.config;

		//store a local copy so we dont have keep moving it about

		this.consumerstorage[moduleinstance] = { config: config, feedstorage: {} };

		svgutil.init();

	},

	loadairports: function (moduleinstance) {

		//TODO - provide all the params from the aiports js script as part of an init process
		//	determine of csv, xml etc (add stubs for different xxx 2 JSON modules)

		const csvFilePath = 'modules/' + this.name + '/reference/airports.csv';

//		Airport ID 	Unique OpenFlights identifier for this airport.
//		Name 	Name of airport.May or may not contain the City name.
//		City 	Main city served by airport.May be spelled differently from Name.
//		Country 	Country or territory where airport is located.See Countries to cross - reference to ISO 3166 - 1 codes.
//		IATA 	3 - letter IATA code.Null if not assigned / unknown.
//		ICAO 	4 - letter ICAO code.
//		Null if not assigned.
//		Latitude 	Decimal degrees, usually to six significant digits.Negative is South, positive is North.
//		Longitude 	Decimal degrees, usually to six significant digits.Negative is West, positive is East.
//		Altitude 	In feet.
//		Timezone 	Hours offset from UTC.Fractional hours are expressed as decimals, eg.India is 5.5.
//		DST 	Daylight savings time.One of E(Europe), A(US / Canada), S(South America), O(Australia), Z(New Zealand), N(None) or U(Unknown).See also: Help: Time
//		Tz		Database time zone 	Timezone in "tz"(Olson) format, eg. "America/Los_Angeles".
//		Type 	Type of the airport.Value "airport" for air terminals, "station" for train stations, "port" for ferry terminals and "unknown" if not known.In airports.csv, only type = airport is included.
//		Source 	Source of this data. "OurAirports" for data sourced from OurAirports, "Legacy" for old data not matched to OurAirports(mostly DAFIF), "User" for unverified user contributions.In airports.csv, only source = OurAirports is included.

		csv({
			noheader: true,
			headers: ['idx', 'airport', 'city','country','iata','icao','lat','lon','alt','tz','dst','tzd','type','source']
			
		})
			.fromFile(csvFilePath)
			.then((jsonObj) => {
				//console.log(jsonObj);
				/**
				 * [
				 * 	{a:"1", b:"2", c:"3"},
				 * 	{a:"4", b:"5". c:"6"}
				 * ]
				 */
				console.log(commonutils.showElapsed(startTime), "sending airports");
				this.sendNotificationToMasterModule("AIRPORTS_" + moduleinstance, { payload: jsonObj });
			})

    },

	processfeeds: function (newfeeds) {

		var self = this;

		var moduleinstance = newfeeds.moduleinstance; //needed so the correct module knows what to do with this data
		var payload = newfeeds.payload;

		//depending on the config options for this moduleinstance

		//determine what the feedstorekey is

		var feedstorekey = payload.providerid;

		//now we add the provided feeds to the feedstorage

		var feedstorage = {
			key: '', titles: [], sourcetitles: [], providers: [], sortkeys: []
		};

		//we will need to store all the separate sets of data provided here/ TBD

		//Determine if we have an entry for the moduleinstance of the display module in feedstorage

		if (this.consumerstorage[moduleinstance].feedstorage[feedstorekey] == null) {

			feedstorage.key = feedstorekey;
			feedstorage.titles = [payload.title];				// add the first title we get, which will be many if this is a merged set of feeds
			feedstorage.sourcetitles = [payload.sourcetitle];	// add the first sourcetitle we get, which will be many if this is a merged set of feeds
			feedstorage.providers = [payload.providerid];		// add the first provider we get, which will be many if there are multiple providers and merged

			this.consumerstorage[moduleinstance].feedstorage[feedstorekey] = feedstorage;
		}

		var itemarray = payload.payload[0].itemarray;

		//reformat the data so we keep the subjects meta data together
		//allowing the module to format the output

		//add a total offset in minutes from local time
		//uses moment timezone so takes into account TZ and DST

		//1 get the local time as an offset from utc in minutes
		var utcoffset = moment().utcOffset();
		//2 get the remote time as an offset from utc in minutes
		 // Olson format timezone

		if (self.consumerstorage[moduleinstance].config.localtime) {var utcoffset = moment().tz(itemarray[0].tzd).utcOffset();};

		var flightdata = { timeoffset: utcoffset,airport: itemarray[0].subject, flighttype: itemarray[0].object,flights:[]};

		itemarray.forEach(function (flight) {

			var oflight = {
				scheduled: moment(flight.scheduled).format('hh:mm'),
				remoteairport: flight.remoteairport,
				remarks: self.getremarks(flight),
				terminal: flight.terminal,
				gate: flight.gate,

				//setup flights for codeshare displaying
				flight: { flightidx: 0, flights: [flight.flight] },
				airline: { airlines: [flight.airline], airlinesiata: [flight.airlineiata], airlinesicao: [flight.airlineicao], airlineicon : [null]  },
			}

			if (self.consumerstorage[moduleinstance].config.icon) {
				oflight.airline.airlineicon[0] = svgutil.getairline(flight.airlineiata, flight.airlineicao).Icon;
            }

			var addflight = true;

			if(self.consumerstorage[moduleinstance].config.codeshare && self.consumerstorage[moduleinstance].config.scroll) {

				//if this is codeshared, then find the host flight from the array of flights and add the extra details

				if (flight.codeshared) {
					var csflight = flight.codeshared_flight_iata.toLowerCase();
					const index = flightdata.flights.findIndex(({ flight }) => flight.flights[0].toLowerCase() == csflight );

					if (index == -1) {//just in case the host flight hasn't been loaded for some reason, we just add the codeshare to the flights
						addflight = true;
					}
					else {
						addflight = false;
						flightdata.flights[index].flight.flights.push(flight.flight);
						flightdata.flights[index].airline.airlines.push(flight.airline);
						flightdata.flights[index].airline.airlinesiata.push(flight.airlineiata);
						flightdata.flights[index].airline.airlinesicao.push(flight.airlineicao);

						if (self.consumerstorage[moduleinstance].config.icon) {
							flightdata.flights[index].airline.airlineicon.push(svgutil.getairline(flight.airlineiata, flight.airlineicao).Icon);
						}
						else {
							flightdata.flights[index].airline.airlineicon.push(null);
                        }

					}
                }

			}

			if (addflight) { flightdata.flights.push(oflight); }

		});

		for (var didx = 0; didx < payload.payload.length; didx++) {
			this.sendNotificationToMasterModule("NEW_FLIGHTS_" + moduleinstance, { payload: flightdata });
		}

	},

	getremarks: function (flight) {
		//determine what the status is

		if (flight.status == "cancelled") {
			return 'Cancelled'
		}

		if (flight.status == "landed") {
			return 'Landed ' + moment(flight.landed).format("hh:mm");
		}
		
		if (flight.status == "active") {
			return "Departed " + moment(flight.actual).format("hh:mm");
		}

		if (flight.status == "scheduled") {

			if (flight.delay != null) {
				return "Delayed " + moment(flight.estimated).format("hh:mm");
			}

		}

		return 'On Time';

    },

	showstatus: function (moduleinstance) {
		//console.log("MMM Module: " + moduleinstance);
		console.log('============================ start of status ========================================');

		console.log('config for consumer: ' + moduleinstance);

		console.log(this.consumerstorage[moduleinstance].config);

		console.log('============================= end of status =========================================');

	},

	stop: function () {
		console.log("Shutting down node_helper");
	},

	socketNotificationReceived: function (notification, payload) {
		//console.log(this.name + " NODE_HELPER received a socket notification: " + notification + " - Payload: " + payload);

		console.log(commonutils.showElapsed(startTime), notification);

		//we will receive a payload with the moduleinstance of the consumerid in it so we can store data and respond to the correct instance of
		//the caller - i think that this may be possible!!

		if (this.logger[payload.moduleinstance] == null) {

			this.logger[payload.moduleinstance] = LOG.createLogger("logfile_" + payload.moduleinstance + ".log", payload.moduleinstance);

		};

		this.currentmoduleinstance = payload;

		switch (notification) {
			case "CONFIG": this.setconfig(payload); break;
			case "RESET": this.reset(payload); break;
			case "AGGREGATE_THIS":this.processfeeds(payload); break;
			case "STATUS": this.showstatus(payload); break;
			case "AIRPORTS": this.loadairports(this.currentmoduleinstance); break;
		}
	},

	sendNotificationToMasterModule: function(stuff, stuff2){
		this.sendSocketNotification(stuff, stuff2);
	}

});
