/* global Module,  MMM-Consumer-Flights */

/* Magic Mirror
 * Module: MMM-Consumer-Flights
 *
 * By Neil Scott
 * MIT Licensed.
 */

//add consumerstorage ffor all the stuff we carry around as globals


//flight module recives an array of json objects containing the information for arrivals and departures from an airport.
//aggregation takes place if required before the display boards are built using the CSS themes and styles in the config

var startTime = new Date(); //use for getting elapsed times during debugging

var feedDisplayPayload = { consumerid: '', providerid: '', payload: '' };

Module.register("MMM-Consumer-Flights", {

	// Default module config.
	
	defaults: {
		text: "... loading",
		id: null,					// the unique id of this consumer.ie MMCD1
		rowcount: 10,				//* Optional * - The number of rows of flights to show at a time
		exclude: null,				//* Optional * - An array of field names to exclude from the board  
		icon: false,				//*Optional* - Include an icon of the airline instead of the text
		icons: 'iataicons.js',		//*optional* - the location of the icons to use if icon is true
		codes: true,				//*Optional* - Show only the codes provided from the provider for Airports, flights and carriers. 
		//	It is assumed that these will be IATA codes. 
		//	IF other codes are provided then used the reference setting to convert to strings for displaying on the board
		header: true,				//*Optional* - Include the board header (clock, location etc)
		reference: 'iatacode.js',   //*Optional* - The file name of a script that contains the names to convert to from the codes provided. 
		//if codes is false, then the local iatacodes.js file is used to convert from iata codes to strings.
		refreshrate: 10000,         //*Optional* - The time in milliseconds between showing the next set of flights on the board
		flightcount: null,          //*Optional* - The number of flights to show, the default is all flights passed from the provider, but this can be used to reduce the total number
		scroll: false,				//*Optional* - If true, then the flights are moved up one at atime on the board, otherwise a full baord at a time is displayed
		animate: false,				//*Optional* - Animate the characters on the board as they change.
		simple: true,				//*Optional* - Show a simple formated board with no embellishments
		remarks: true,				//*Optional* - Display full remarks, using varisou elelments to determine message
		theme: 'LHR',				//*Optional* - Which style from the MMM-Consumer-Flights.css to use, provided so different colour schemas can be used to mimic different airport's boards
		codeshare: false,			//*Optional* - If scroll is enabled then cycle through each codeshared flight number, not enabled, then all codeshares are shown
		localtime: false,			//*Optional* - If true, show the time on the board header in local time (utc + timesone offset)
	},

	start: function () {

		Log.log(this.name + ' is started!');

		//this.updateDom(speed)
		//speed Number - Optional.Animation speed in milliseconds.
		//Whenever your module need to be updated, call the updateDom(speed) method.

		var self = this;

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });

		//now we wait for the providers to start ... providing

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

		this.payload = null;

		this.showflightscount = 0;

		this.board = null; //the displayboard dom - used to determine if the board has been built

		this.timeoffset = 0;

	},

	showElapsed: function () {
		endTime = new Date();
		var timeDiff = endTime - startTime; //in ms
		// strip the ms
		timeDiff /= 1000;

		// get seconds 
		var seconds = (timeDiff);
		return (" " + seconds + " seconds");
	},

	getScripts: function () {
		return [
			//'vendor/node_modules/requirejs/require.js',
			'airports.js'
		]
	},

	// Define required scripts.
	getStyles: function () {
		return [
			'MMM-Consumer-Flights.css'
		]
	},

	notificationReceived: function (notification, payload, sender) {

		var self = this;

		console.log(this.showElapsed(), 'notifications',notification);

		//if (sender) {
		//	Log.log(self.identifier + " " + this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		//} else {
		//	Log.log(self.identifier + " " + this.name + " received a system notification: " + notification);
		//}

		if (notification == 'ALL_MODULES_STARTED') {
			//build my initial payload for any providers listening to me

			feedDisplayPayload.consumerid = this.config.id;
			feedDisplayPayload.payload = "";
			this.sendNotificationToNodeHelper("AIRPORTS", this.identifier);
			console.log(this.showElapsed(), "getting airports");
			this.boardoffset = (this.config.scroll) ? 1 : this.config.rowcount;
			this.boardflightidx = 0;
			this.mainboardtimer = setInterval(this.forceDomUpdate, this.config.refreshrate, this, 0);
			this.sendNotification('MMM-Consumer_READY_FOR_ACTION', feedDisplayPayload);

		}

		if (notification == 'PROVIDER_DATA') {
			//some one said they have data, it might be for me !

			//console.log(payload.consumerid)
			//console.log(this.config.id)

			if (payload.consumerid == this.config.id) {

				Log.log("Got some new data @ " + this.showElapsed());

				//send the data to the aggregator

				this.sendNotificationToNodeHelper("AGGREGATE_THIS", { moduleinstance: self.identifier, payload: payload });

			}
		}

	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;

		Log.log(this.showElapsed(),self.identifier,'mesage from nodehelper',notification );

		if (notification == "AIRPORTS_" + this.identifier) {
			console.log(this.showElapsed(), "msg got airports");
			airports['init'](payload.payload);
		}

		if (notification == "NEW_FLIGHTS_" + this.identifier) {
			this.payload = payload.payload;
			this.showflightscount = this.payload.flights.length;
			if (this.config.flightcount != null) {
				this.showflightscount = Math.min(this.config.flightcount, this.payload.flights.length);
			}

			this.updateDom(1000); //force a getdom
		}
	},

	forceDomUpdate: function (self,delay = 250) {
		self.updateDom(delay); //force a getdom
    },

	// Override dom generator.
	getDom: function () {
		Log.log(this.identifier + " Hello from getdom @" + this.showElapsed());

		var wrapper;

		if (this.board == null) {
			wrapper = document.createElement("div");
			wrapper.id = 'flightwrapper_'+this.config.id;
			this.board = wrapper.appendChild(this.buildboard());
			if (this.payload == null) { return wrapper; }
		}

		wrapper = document.getElementById('flightwrapper_' + this.config.id);

		if (this.payload == null) { return wrapper; }

		//we have the wrapper, so now we need to update the innerhtml of the flights tables
		//which lives inside a specfic cell - boardflights

		var flightscell = document.getElementById('boardflights_' + this.config.id);

		//now we have some flight information update some key information

		if (this.payload.flighttype == "FlightDepartures") {
			document.getElementById('boardicon_' + this.config.id).innerHTML= '<img height="40" src="modules/MMM-Consumer-Flights/images/Departures.png" width="40" />'; 
		}
		if (this.payload.flighttype == "FlightArrivals") {
			document.getElementById('boardicon_' + this.config.id).innerHTML = '<img height="40" src="modules/MMM-Consumer-Flights/images/Arrivals.png" width="40" />';
		}

		document.getElementById('boardairport_' + this.config.id).innerHTML = this.payload.airport; 

		// get the time offset if required

		if (this.config.localtime) { this.timeoffset = airports['getattribute'](this.payload.airport, 'tz'); } //needs local zone/airport zone +  DST additional code

		//and add the flights

		flightscell.innerHTML = this.buildflights(true);

		//this.tick('boardtime', 'boarddate'); //add the info and then set a 1/2 second timer to keep it up to date ish
		//this.boardtimer = setInterval(this.tick, 500, 'boardtime', 'boarddate');

		//var footer = document.createElement('table');
		//header.className = this.payload.airport || 'LHR';
		//header.cellSpacing = '0';
		//var row = header.insertRow(0);
		//row.className = 'head';
		//var cell1 = row.insertCell(0);
		//cell1.rowspan = '2';
		//cell1.colSpan = '3';
		////if (this.payload.flightype==flightdepartures)
		//cell1.innerHTML = '<img height="40" src="Departures.png" width="40" />'; // need to point to images folder


		return wrapper;
	},

	buildboard: function () {

		//clear any timers

		if (this.boardtimer != null) { clearInterval(this.boardtimer); }

		//build the display board depending on the data received
		//initially have an empty board and then subsequently animate the flights in

		//full header

		var board = document.createElement('table');
		board.className = this.config.theme;
		board.classList.add('small');
		board.cellSpacing = '0';
		var row = board.insertRow(0);
		row.className = 'head';
		var cell1 = row.insertCell(0);
		cell1.rowSpan = '2';
		cell1.colSpan = '3';
		cell1.id = 'boardicon_' + this.config.id;
		
		var cell2 = row.insertCell(1);
		cell2.colSpan = '7';
		cell2.rowSpan = '2';
		cell2.innerHTML = '';
		cell2.id = 'boardairport_' + this.config.id;
		var cell3 = row.insertCell(2);
		cell3.className = 'xsmall';
		cell3.id = 'boarddate_' + this.config.id;

		var row = board.insertRow(1);
		row.className = 'head';
		var cell1 = row.insertCell(0);
		cell1.id = 'boardtime_' + this.config.id;

		var row = board.insertRow(2);
		var cell1 = row.insertCell(0);
		cell1.colSpan = '11';
		cell1.style = "height: 2px";
		var row = board.insertRow(2);
		var flightscell = row.insertCell(0);
		flightscell.colSpan = '11';
		flightscell.id = 'boardflights_' + this.config.id;

		flightscell.innerHTML = this.buildflights();

		this.tick('boardtime_' + this.config.id, 'boarddate_' + this.config.id,this); //add the info and then set a 1/2 second timer to keep it up to date ish
		this.boardtimer = setInterval(this.tick, 500, 'boardtime_' + this.config.id, 'boarddate_' + this.config.id,this);

		//var footer = document.createElement('table');
		//header.className = this.payload.airport || 'LHR';
		//header.cellSpacing = '0';
		//var row = header.insertRow(0);
		//row.className = 'head';
		//var cell1 = row.insertCell(0);
		//cell1.rowspan = '2';
		//cell1.colSpan = '3';
		////if (this.payload.flightype==flightdepartures)
		//cell1.innerHTML = '<img height="40" src="Departures.png" width="40" />'; // need to point to images folder
		return board;

	},

	buildflights: function (usedata) {

		var self = this;

		var flights = document.createElement('table');
		flights.className = 'flights';
		flights.cellSpacing = '0';
		flights.cellPadding = '2';
		var row = flights.insertRow(0);
		row.className = 'columnhead';
		var cell1 = row.insertCell(0);
		cell1.colSpan = 5;
		cell1.innerHTML = "At";
		var cell2 = row.insertCell(1);
		cell2.innerHTML = "Airline";
		var flightdirectioncell = row.insertCell(2);
		flightdirectioncell.innerHTML = "To";
		var cell4 = row.insertCell(3);
		cell4.innerHTML = "Flight";
		var cell5 = row.insertCell(4);
		cell5.innerHTML = "Remarks";
		var cell6 = row.insertCell(5);
		cell6.innerHTML = "Terminal";
		var cell7 = row.insertCell(6);
		cell7.innerHTML = "Gate";
		var row = flights.insertRow(1);
		var cell1 = row.insertCell(0);
		cell1.colSpan = '11';
		cell1.style = "height:1px";

		var ridx = 0;
		var cell = new Array(11);

		if (usedata) {

			var ridx = 0;
			var cell = new Array(11);
			var boardtype = (this.payload.flighttype == "FlightDepartures") ? 'dep' : 'arr';
			flightdirectioncell.innerHTML = (boardtype == 'arr') ? 'From' : flightdirectioncell.innerHTML;

			for (var fidx = this.boardflightidx; fidx < this.boardflightidx + this.config.rowcount; fidx++) {

				var flight = this.payload.flights[fidx];

				for (var ridx = 0; ridx < 11; ridx++) {

					//process each field in turn unless excluded

					if (ridx == 0) {
						var row = flights.insertRow(-1);
						row.className = 'flight';
					}

					cell[ridx] = row.insertCell(-1);

					if (ridx < 5) {
						cell[ridx].className = 'time';
						cell[ridx].innerHTML = flight.scheduled.split('')[ridx];
					}
					else if (ridx == 5) { cell[ridx].innerHTML = (this.config.codes) ? flight.airline.airlines[flight.flight.flightidx] : flight.airline.airlines[flight.flight.flightidx] ; cell[ridx].className = 'airline'; }
					else if (ridx == 6) { cell[ridx].innerHTML = (this.config.codes) ? flight.remoteairport : airports['getcity'](flight.remoteairport); }
					else if (ridx == 7) {
						cell[ridx].innerHTML = (this.config.codes) ? flight.flight.flights[flight.flight.flightidx] : flight.flight.flights[flight.flight.flightidx]
						console.log(JSON.stringify(this.payload.flights[fidx].flight));
						this.payload.flights[fidx].flight.flightidx++;
						if (this.payload.flights[fidx].flight.flightidx == this.payload.flights[fidx].flight.flights.length) { this.payload.flights[fidx].flight.flightidx = 0};
					}
					else if (ridx == 8) {
						cell[ridx].innerHTML = flight.remarks;
						if (flight.remarks.indexOf('inal')>-1) { cell[ridx].className = 'final'; }
						if (flight.remarks.indexOf('oard') > -1) { cell[ridx].className = 'boarding'; }
						if (flight.remarks.indexOf('arted') > -1) { cell[ridx].className = 'departed'; }
						if (flight.remarks.indexOf('ancelled') > -1) { cell[ridx].className = 'cancelled'; }
					}
					else if (ridx == 9) { cell[ridx].innerHTML = flight.terminal; cell[ridx].className = 'terminal'; }
					else if (ridx == 10) { cell[ridx].innerHTML = flight.gate;  }

				}
			}

			this.boardflightidx = this.boardflightidx + this.boardoffset;

			if (this.boardflightidx > this.showflightscount-1) { this.boardflightidx = 0; }

		}
		else {

			for (var fidx = 0; fidx < this.config.rowcount; fidx++) {

				for (var ridx = 0; ridx < 11; ridx++) {

					if (ridx == 0) {
						var row = flights.insertRow(-1);
						row.className = 'flight';
					}

					cell[ridx] = row.insertCell(-1);

					if (ridx < 5) {
						cell[ridx].className = 'time';
						cell[ridx].innerHTML = '&nbsp;';
					}
					else if (ridx == 5) { cell[ridx].innerHTML = '&nbsp;'; cell[ridx].className = 'airline'; }
					else if (ridx == 6) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 7) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 8) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 9) { cell[ridx].innerHTML = '&nbsp;'; cell[ridx].className = 'terminal'; }
					else if (ridx == 10) { cell[ridx].innerHTML = '&nbsp;'; }

				}
			}
		}
		return flights.outerHTML;

	},

	tick: function (timeid, dateid,self) {

		var targettime = document.getElementById(timeid);
		var targetdate = document.getElementById(dateid);

		//dom may not be loaded yet so we check and ignore

		if (targetdate == null || targettime == null) { return;}

		targettime.innerHTML = moment().add(self.timeoffset, 'hours').format('HH:mm:ss'); 
		targetdate.innerHTML = moment().add(self.timeoffset, 'hours').format('ddd do MMM YYYY'); 
	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

});


