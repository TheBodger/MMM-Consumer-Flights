var fs = require('fs');
const renameicons = false;

//1 read the airlines.json.master file and load
//2 scan the icons directory for matching IATA coded files.with 3 character extensions (not jpeg, use jpg)
//3 for each one update the icon: entry in the in copy of airlines
//3b handle multi entry airlines
//4 write out to reference folder

var airlines = JSON.parse(fs.readFileSync('airlines.json.master').toString());

var icons = fs.readdirSync('./icons');

icons.forEach(function (icon) {
    if (airlines[icon.substr(0, 2)] != null) {

        airlines[icon.substr(0, 2)].forEach(function (a, index) {
            var airline = airlines[icon.substr(0, 2)][index];

            if (airline.ICAO == icon.substr(3, 3)) {
                var svgname = airline.IATA + "_" + airline.ICAO + icon.substr(icon.indexOf('.'),4);
                if (renameicons) {
                    fs.copyFile('icons/' + icon, 'icons/' + svgname, (err) => {
                        if (err) throw err;
                    });
                }
                airlines[icon.substr(0, 2)][index].Icon = svgname;
            }
        })
    }
});

fs.writeFileSync('reference/airlines.json', JSON.stringify(airlines));

console.log("end");
