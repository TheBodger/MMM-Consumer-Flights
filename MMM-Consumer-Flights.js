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
		codes: true,				//*Optional* - Show only the codes provided from the provider for Airports, flights and carriers. 
		header: true,				//*Optional* - Include the board header (clock, location etc)
		refreshrate: 10000,         //*Optional* - The time in milliseconds between showing the next set of flights on the board
		flightcount: null,          //*Optional* - The number of flights to show, the default is all flights passed from the provider, but this can be used to reduce the total number
		scroll: false,				//*Optional* - If true, then the flights are moved up one at atime on the board, otherwise a full baord at a time is displayed
		animate: false,				//*Optional* - TODO Animate the characters on the board as they change.
		remarks: true,				//*Optional* - Display full remarks, using varisou elelments to determine message
		theme: 'LHR',				//*Optional* - Which style from the MMM-Consumer-Flights.css to use, provided so different colour schemas can be used to mimic different airport's boards
		size: 'small',				//*Optional* - the Default MagicMirror font size to use which will also change the size of the Board (xsmall, small, medium,large,xlarge			
		codeshare: false,			//*Optional* - If scroll is enabled then cycle through each codeshared flight number, not enabled, then all codeshares are shown
		localtime: true,			//*Optional* - If true, show the time on the board header in local time (utc + timesone offset)
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

		//setup any missing theme entries
		//need to determine though which theme we are using otherwise the same named variables will clash

		this.themedetails = window[this.config.theme + "_theme"]; //var name = window['a'];

		var setdefault = false;

		if (this.themedetails.bci == null) {
			setdefault = true;
		}
		//just check we don't have an empty entry
		else if (this.themedetails.bci.length == 0) { setdefault = true; }

		if (setdefault) {
			this.themedetails.bci = [0,1,2,3,4,5,6,7,8,9,10];
		}

		var setdefault = false;

		if (this.themedetails.dep_columnnames == null) {
			setdefault = true;
		}
		//just check we don't have an empty entry
		else if (this.themedetails.dep_columnnames.length == 0) { setdefault = true; }

		if (setdefault) {
			this.themedetails.dep_columnnames = ['At','Airline','To','Flight','Remarks','Terminal','Gate'];
		}

		var setdefault = false;

		if (this.themedetails.arr_columnnames == null) {
			setdefault = true;
		}
		//just check we don't have an empty entry
		else if (this.themedetails.arr_columnnames.length == 0) { setdefault = true; }

		if (setdefault) {
			this.themedetails.arr_columnnames = ['At', 'Airline', 'From', 'Flight', 'Remarks', 'Terminal', 'Gate'];
		}

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
			'airports.js',
			`modules/MMM-Consumer-Flights/themes/${this.config.theme}/theme.js`
		]
	},

	// Define required scripts.
	getStyles: function () {
		return [
			//'MMM-Consumer-Flights.css',
			`modules/MMM-Consumer-Flights/themes/${this.config.theme}/theme.css`
		]
	},

	notificationReceived: function (notification, payload, sender) {

		var self = this;

		console.log(this.showElapsed(), 'notifications',notification);

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
			//console.log(this.identifier)

			if (payload.consumerid == this.config.id) {

				Log.log(this.name,"Got some new data @ " + this.showElapsed());

				//send the data to the aggregator

				this.sendNotificationToNodeHelper("AGGREGATE_THIS", { moduleinstance: self.identifier, payload: payload });

			}
		}

	},

	socketNotificationReceived: function (notification, payload) {
		var self = this;

		Log.log(this.showElapsed(),self.identifier,'message from nodehelper',notification );

		if (notification == "AIRPORTS_" + this.identifier) {
			console.log(this.showElapsed(), "msg got airports");
			airports['init'](payload.payload);
			this.updateboard(); //force an update
		}

		if (notification == "NEW_FLIGHTS_" + this.identifier) {
			console.log(this.showElapsed(), "msg got NEW_FLIGHTS", payload.payload.flights.length);
			this.payload = payload.payload;
			this.showflightscount = this.payload.flights.length;
			if (this.config.flightcount != null) {
				this.showflightscount = Math.min(this.config.flightcount, this.payload.flights.length);
			}

			this.updateboard(); //force an update
		}
	},

	forceDomUpdate: function (self,delay = 250) {
		self.updateboard(); //force an update
    },

	// Override dom generator.
	getDom: function () {
		Log.log(this.identifier + " Hello from getdom @" + this.showElapsed());

		if (this.board == null) {
			var wrapper = document.createElement("div");
			wrapper.id = 'flightwrapper_'+this.identifier;
			this.board = wrapper.appendChild(this.buildboard());
			//if (this.payload == null) {
			
				return wrapper;
			//}
		}
	},

	updateboard: function () {

		wrapper = document.getElementById('flightwrapper_' + this.identifier);

		if (this.payload == null) { return;}

		//we have the wrapper, so now we need to update the innerhtml of the flights tables
		//which lives inside a specfic cell - boardflights

		var flightscell = document.getElementById('boardflights_' + this.identifier);

		if (flightscell != null) { //the dom elements may not have been stored yet

			//now we have some flight information update some key information

			if (this.config.header) { var height = 28; var align = ''; } else { var height = 24; var align = 'align="middle"'; };

			if (this.payload.flighttype == "FlightDepartures") {
				document.getElementById('boardicon_' + this.identifier).innerHTML = `<img ${align} height="${height}" src="modules/MMM-Consumer-Flights/themes/${this.config.theme}/Departures.png" width="${height}" />`;
			}
			if (this.payload.flighttype == "FlightArrivals") {
				document.getElementById('boardicon_' + this.identifier).innerHTML = `<img ${align} height="${height}" src="modules/MMM-Consumer-Flights/themes/${this.config.theme}/Arrivals.png" width="${height}" />`;
			}

			document.getElementById('boardairport_' + this.identifier).innerHTML = (this.config.codes) ? this.payload.airport : airports['getattribute'](this.payload.airport, 'airport').replace(' Airport', '');

			//local zone/airport zone +  DST adjusted
			this.timeoffset = this.payload.timeoffset;

			//and add the flights

			flightscell.innerHTML = this.buildflights(true);

		}
    },

	buildboard: function () {

		//clear any timers

		if (this.boardtimer != null) { clearInterval(this.boardtimer); }

		//build the display board depending on the data received
		//initially have an empty board and then subsequently animate the flights in

		var board = document.createElement('table');
		board.className = this.config.theme;
		board.classList.add(this.config.size);
		board.cellSpacing = '0';

		if (this.config.header) {
			//full header

			var row = board.insertRow(0);
			row.className = 'head';
			var cell1 = row.insertCell(0);
			cell1.rowSpan = '2';
			cell1.colSpan = '3';
			cell1.id = 'boardicon_' + this.identifier;

			var cell2 = row.insertCell(1);
			cell2.colSpan = '7';
			cell2.rowSpan = '2';
			cell2.innerHTML = '';
			cell2.id = 'boardairport_' + this.identifier;
			var cell3 = row.insertCell(2);
			cell3.className = 'xsmall';
			cell3.id = 'boarddate_' + this.identifier;

			var row = board.insertRow(1);
			row.className = 'head';
			var cell1 = row.insertCell(0);
			cell1.id = 'boardtime_' + this.identifier;

			var row = board.insertRow(2);
			var cell1 = row.insertCell(0);
			cell1.colSpan = this.themedetails.bci.length.toString();
			cell1.style = "height: 2px";
			
		}
		else {
			//noheader
			var row = board.insertRow(-1);
			
			var headercell = row.insertCell(-1);
			headercell.colSpan = this.themedetails.bci.length.toString();

			var header = document.createElement('table');
			header.className = this.config.theme;
			header.classList.add(this.config.size);
			header.cellSpacing = '0';

			var row = header.insertRow(-1);
			row.className = 'head';
			var cell1 = row.insertCell(-1);
			cell1.colSpan = '4';
			cell1.style = "text-align:left";
			cell1.id = 'boardicon_' + this.identifier
			var cell2 = row.insertCell(-1);
			cell2.colSpan = '6';
			cell2.id = 'boardairport_' + this.identifier;
			var cell3 = row.insertCell(-1);
			cell3.colSpan = '1';
			cell3.style = 'text-align:right';
			cell3.innerHTML = "Gate";
			headercell.appendChild(header);

			var row = board.insertRow(-1);
			var cell1 = row.insertCell(-1);
			cell1.colSpan = this.themedetails.bci.length.toString();
			cell1.className = 'divider';
		}

		var row = board.insertRow(-1);
		var flightscell = row.insertCell(0);
		flightscell.colSpan = this.themedetails.bci.length.toString();
		flightscell.id = 'boardflights_' + this.identifier;
		flightscell.innerHTML = this.buildflights();

		if (!this.config.header) {
			var row = board.insertRow(-1);
			var footercell = row.insertCell(-1);
			footercell.colSpan = this.themedetails.bci.length.toString();

			var footer = document.createElement('table');
			footer.className = 'foot';
			footer.classList.add(this.config.size);
			footer.cellspacing = '0';
			footer.style = 'width:100%';
			var row = footer.insertRow(-1);
			var cell1 = row.insertCell(-1);
			cell1.innerHTML = '&nbsp;';
			var cell1 = row.insertCell(-1);
			cell1.id = 'boarddate_' + this.identifier;
			var cell2 = row.insertCell(-1);
			cell2.style = 'text-align:right';
			cell2.id = 'boardtime_' + this.identifier;
			var cell1 = row.insertCell(-1);
			cell1.innerHTML = '&nbsp;';

			footercell.appendChild(footer);
		}

		this.tick('boardtime_' + this.identifier, 'boarddate_' + this.identifier,this); //add the info and then set a 1/2 second timer to keep it up to date ish
		this.boardtimer = setInterval(this.tick, 500, 'boardtime_' + this.identifier, 'boarddate_' + this.identifier, this);

		return board;

	},

	buildflights: function (usedata) {

		var self = this;

		var flights = document.createElement('table');
		flights.className = 'flights';
		flights.cellSpacing = '0';
		flights.cellPadding = '2';

		var columnnames = this.themedetails.dep_columnnames; //initial set if we dont have data yet

		if (this.config.header) {

			if (usedata) {
				var boardtype = (this.payload.flighttype == "FlightDepartures") ? 'dep' : 'arr';
				if (boardtype == 'arr') { columnnames = this.themedetails.arr_columnnames;}
			}

			var row = flights.insertRow(-1);
			row.className = 'columnhead';

			//add a -ve offset to apply to any returned indexes other than 0 - this is so the column index can be used to get the column name

			for (var cidx = 0; cidx < self.themedetails.bci.length; cidx++) {
				if (this.themedetails.bci[cidx] < 1 || this.themedetails.bci[cidx] > 4) { //special case ignore the 4 time slots after 0
					var cell1 = row.insertCell(-1);
					if (this.themedetails.bci[cidx] == 0) { //special case = time start
						cell1.colSpan = 5;
						cell1.innerHTML = columnnames[this.themedetails.bci[cidx]];
					}
					else {
						cell1.innerHTML = columnnames[this.themedetails.bci[cidx]-4]; //-ve offset to ignore the 4 extra time slots
					}

				}
			}

			var row = flights.insertRow(-1);
			var cell1 = row.insertCell(-1);
			cell1.colSpan = this.themedetails.bci.length.toString();
			cell1.style = "height:1px";
		}

		var ridx = 0;
		var cell = new Array(this.themedetails.bci.length);

		if (usedata) {

			var ridx = 0;
			var cell = new Array(this.themedetails.bci.length);

			for (var fidx = this.boardflightidx; fidx < Math.min(this.payload.flights.length, this.boardflightidx + this.config.rowcount); fidx++) {

				var flight = this.payload.flights[fidx];

				//use the theme bci length to determine how many columns to display

				for (var rowidx = 0; rowidx < this.themedetails.bci.length; rowidx++) {

					//process each field in turn unless excluded

					if (rowidx == 0) {
						var row = flights.insertRow(-1);
						row.className = 'flight';
					}

					ridx = this.themedetails.bci[rowidx];

					cell[rowidx] = row.insertCell(-1);

					if (ridx < 5) {
						cell[rowidx].className = 'time';
						cell[rowidx].innerHTML = flight.scheduled.split('')[ridx];
					}
					else if (ridx == 5) {//Airline code, name or icon
						if (this.config.icon) {
							if (this.config.size == 'small') { width = '100px';}
							cell[rowidx].className = 'iconbackground';
							cell[rowidx].innerHTML = `<img src="${flight.airline.airlineicon[flight.flight.flightidx]}" class='icon' />`;
							var x;
							x = 0;
						}
						else {
							cell[rowidx].innerHTML = (this.config.codes) ? flight.airline.airlinesiata[flight.flight.flightidx] : flight.airline.airlines[flight.flight.flightidx];
						}
						cell[rowidx].classList.add('airline');
					}
					else if (ridx == 6) { cell[rowidx].innerHTML = (this.config.codes) ? flight.remoteairport : airports['getcity'](flight.remoteairport); cell[rowidx].className = 'remote';}
					else if (ridx == 7) {
						cell[rowidx].innerHTML = (this.config.codes) ? flight.flight.flights[flight.flight.flightidx] : flight.flight.flights[flight.flight.flightidx]
						this.payload.flights[fidx].flight.flightidx++;
						if (this.payload.flights[fidx].flight.flightidx == this.payload.flights[fidx].flight.flights.length) { this.payload.flights[fidx].flight.flightidx = 0};
					}
					else if (ridx == 8) {
						cell[rowidx].innerHTML = flight.remarks;
						cell[rowidx].className = 'remarks';
						if (flight.remarks.indexOf('inal') > -1) { cell[rowidx].classList.add ( 'final'); }
						if (flight.remarks.indexOf('oard') > -1) { cell[rowidx].classList.add('boarding'); }
						if (flight.remarks.indexOf('arted') > -1) { cell[rowidx].classList.add ('departed'); }
						if (flight.remarks.indexOf('ancelled') > -1) { cell[rowidx].classList.add ( 'cancelled'); }
					}
					else if (ridx == 9) { cell[rowidx].innerHTML = flight.terminal; cell[rowidx].className = 'terminal'; }
					else if (ridx == 10) { cell[rowidx].innerHTML = flight.gate;  }
					else if (ridx == 11) { cell[rowidx].innerHTML = flight.estimated; cell[rowidx].className = 'time';}
					else if (ridx == 12) { cell[rowidx].innerHTML = flight.actual; cell[rowidx].className = 'time';}
					else if (ridx == 13) { cell[rowidx].innerHTML = flight.landed; cell[rowidx].className = 'time';}

				}
			}

			this.boardflightidx = this.boardflightidx + this.boardoffset;

			if (this.boardflightidx > this.showflightscount-1) { this.boardflightidx = 0; }

		}
		else {

			for (var fidx = 0; fidx < this.config.rowcount; fidx++) {

				for (var ridx = 0; ridx < this.themedetails.bci.length; ridx++) {

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
					else if (ridx == 6) { cell[ridx].innerHTML = '&nbsp;'; cell[ridx].className = 'remote';}
					else if (ridx == 7) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 8) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 9) { cell[ridx].innerHTML = '&nbsp;'; cell[ridx].className = 'terminal'; }
					else if (ridx == 10) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 11) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 12) { cell[ridx].innerHTML = '&nbsp;'; }
					else if (ridx == 13) { cell[ridx].innerHTML = '&nbsp;'; }

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

		targettime.innerHTML = moment().utc().add(self.timeoffset, 'minutes').format('HH:mm:ss'); 
		targetdate.innerHTML = moment().utc().add(self.timeoffset, 'minutes').format('ddd Do MMM YYYY'); 
	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

});


