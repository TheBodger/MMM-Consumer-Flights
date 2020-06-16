//exposes a reference file of airports, returning extra data as requested.

airports = {

	init: function (airports) {

		console.log("init");

		//load serialised airports to memory

		this.airports = (airports); //JSON.parse

    },


	getcity: function (iatacode) {

		if (this.airports == null) { return iatacode;}

		const result = this.airports.find(({ iata }) => iata == iatacode);

		if (result == null) {
			return iatacode;
		}
		else {
			return result.city;
        }

	},

	getattribute: function (iatacode,attribute) {

		if (this.airports == null) { return iatacode; }

		const result = this.airports.find(({ iata }) => iata == iatacode);

		if (result == null) {
			return iatacode;
		}
		else {
			return result[attribute];
		}

	}
}