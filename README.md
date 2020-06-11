# MMM-Consumer-Flights

This magic mirror module is the MMM-Consumer-Flights module that is part of the MMM-Consumer and MMM-Provider interrelated modules.

This module receives feeds of Arrivals and Departures from a specified airport and displays them in a format similar to the boards found in airports.

It works well with data extracted through the MMM-Provider-JSON module pulling data through the Aviationstack API. This is free for 500 API calls a month. Each call returns up to 100 flight details.



### Example
![Example of MMM-ChartDisplay output](images/screenshot.png?raw=true "Example screenshot")



### Dependencies

Before installing this module, also install https://github.com/TheBodger/MMM-ChartUtilities as well as https://github.com/TheBodger/MMM-FeedUtilities 

## Standalone Installation
To install the module, use your terminal to:
1. Navigate to your MagicMirror's modules folder. If you are using the default installation directory, use the command:<br />`cd ~/MagicMirror/modules`
2. Clone the module:<br />`git clone https://github.com/TheBodger/MMM-Consumer-Flights`

### MagicMirror² Configuration

To use this module, add the following configuration block to the modules array in the config file

```js
		{
			module: "MMM-Consumer-Flights",
			position: "wherever",
			config: {
				id: "consumer id matching the consumer id in the provider",
			}
		},

```

### Configuration_Options


| Option                  | Details
|------------------------ |--------------
| `text`                | *Optional* - Will be displayed on the magic mirror until the first data has been received and prepared for display <br><br> **Possible values:** Any string.<br> **Default value:** '... loading'
| `id`         | *Required* - The unique ID of this consumer module. This ID must match exactly (CaSe) the consumerids in the provider modules. <br><br> **Possible values:** any unique string<br> **Default value:** none
| `rowcount`            |*Optional* - The number of rows of flights to show at a time<br><br> **Possible values:** A numeric value between 1 and 50 <br> **Default value:** 10
| `exclude`            |*Optional* - An array of field names to exclude from the board<br><br> **Possible values:** An array of 1 or more column names (see below for the list)<br> **Default value:** none
| `icon`            |*Optional* - Include an icon of the airline instead of the text<br><br> **Possible values:** true or false<br> **Default value:** false
| `codes`            |*Optional* - Show only the codes provided from the provider for Airports, flights and carriers. It is assumed that these will be IATA codes. IF other codes are provided then used the reference setting to convert to strings for displaying on the board<br><br> **Possible values:** true or false<br> **Default value:** true
| `header`            |*Optional* - Include the board header (clock, location etc)<br><br> **Possible values:** true or false<br> **Default value:** true
| `reference`            |*Optional* - The file name relative to the MagicMirror folder that contains the names to convert to from the codes provided. if codes is false, then the local iatacodes.js file is used to convert from iata codes to strings. <br><br> **Possible values:** A string indicating the file containing the codes. See the files iatacodes.js for details<br> **Default value:** iatacodes.js
| `refreshrate`            |*Optional* - The time in milliseconds between showing the next set of flights on the board<br><br> **Possible values:** A numeric value greater than 100  <br> **Default value:** 10000 (10 seconds)
| `flightcount`            |*Optional* - The number of flights to show, the default is all flights passed from the provider, but this can be used to reduce the total number<br><br> **Possible values:** A numeric value greater than 1<br> **Default value:** all (null)
| `scroll`            |*Optional* - If true, then the flights are moved up one at atime on the board, otherwise a full baord at a time is displayed<br><br> **Possible values:** true or false<br> **Default value:** false
| `animate`            |*Optional* - Animate the characters on the board as they change.<br><br> **Possible values:** true or false<br> **Default value:** false
| `simple`            |*Optional* - Show a simple formated board with no embellishments<br><br> **Possible values:** true or false<br> **Default value:** true
| `remarks`            |*Optional* - Display full remarks, using varisou elelments to determine message<br><br> **Possible values:** true or false<br> **Default value:** true

### Additional_Notes

The config id must match between providers and consumers. Being a case sensitive environment extra care is needed here.<BR>

Fields available to display on the board, any field or fields can be excluded using the exclude config option

At
Airline
To
Flight
Remarks
Terminal
Gate





