/* global Module,  MMM-Consumer-Flights */

/* Magic Mirror
 * Module: MMM-Consumer-Flights
 *
 * By Neil Scott
 * MIT Licensed.
 */


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
		exclude:null,				//* Optional * - An array of field names to exclude from the board  
		icon: false,				//*Optional* - Include an icon of the airline instead of the text
		icons: 'iataicons.js',		//*optional* - the location of the icons to use if icon is true
		codes: true,				//*Optional* - Show only the codes provided from the provider for Airports, flights and carriers. 
									//	It is assumed that these will be IATA codes. 
									//	IF other codes are provided then used the reference setting to convert to strings for displaying on the board
		header:true,				//*Optional* - Include the board header (clock, location etc)
		reference: 'iatacode.js',   //*Optional* - The file name of a script that contains the names to convert to from the codes provided. 
									//if codes is false, then the local iatacodes.js file is used to convert from iata codes to strings.
		refreshrate: 10000,         //*Optional* - The time in milliseconds between showing the next set of flights on the board
		flightcount: null,          //*Optional* - The number of flights to show, the default is all flights passed from the provider, but this can be used to reduce the total number
		scroll:false,				//*Optional* - If true, then the flights are moved up one at atime on the board, otherwise a full baord at a time is displayed
		animate:false,				//*Optional* - Animate the characters on the board as they change.
		simple:true,				//*Optional* - Show a simple formated board with no embellishments
		remarks:true,				//*Optional* - Display full remarks, using varisou elelments to determine message
		theme:'LHR',				//*Optional* - Which style from the MMM-Consumer-Flights.css to use, provided so different colour schems can be used to mimic different airport's boards


	start: function () {

		Log.log(this.name + ' is started!');

		//this.updateDom(speed)
		//speed Number - Optional.Animation speed in milliseconds.
		//Whenever your module need to be updated, call the updateDom(speed) method.

		var self = this;

		this.sendNotificationToNodeHelper("CONFIG", { moduleinstance: this.identifier, config: this.config });

		//now we wait for the providers to start ... providing

		this.sendNotificationToNodeHelper("STATUS", this.identifier);

		this.chartdata = null;

	},

	showElapsed: function () {
		endTime = new Date();
		var timeDiff = endTime - startTime; //in ms
		// strip the ms
		timeDiff /= 1000;

		// get seconds 
		var seconds = Math.round(timeDiff);
		return (" " + seconds + " seconds");
	},

	getScripts: function () {
		return [

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

		if (sender) {
			Log.log(self.identifier + " " + this.name + " received a module notification: " + notification + " from sender: " + sender.name);
		} else {
			Log.log(self.identifier + " " + this.name + " received a system notification: " + notification);
		}

		if (notification == 'ALL_MODULES_STARTED') {
			//build my initial payload for any providers listening to me

			feedDisplayPayload.consumerid = this.config.id;
			feedDisplayPayload.payload = "";
			this.sendNotification('MMM-Consumer_READY_FOR_ACTION', feedDisplayPayload);
			Log.log("ALL MODULES STARTED");
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

		Log.log(self.identifier + " " + this.identifier + "hello, received a socket notification @ " + this.showElapsed() + " " + notification + " - Payload: " + payload);

		if (notification == "NEW_FLIGHTS_" + this.identifier) {
			this.updateDom(1000); //force a getdom
		}
	},

	// Override dom generator.
	getDom: function () {
		Log.log(this.identifier + " Hello from getdom @" + this.showElapsed());

		var wrapper = document.createElement("div");
		wrapper.innerHTML = "Hello";

		return wrapper;
	},

	sendNotificationToNodeHelper: function (notification, payload) {
		this.sendSocketNotification(notification, payload);
	},

});

