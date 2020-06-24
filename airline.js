//helper utility to be used in a nodehelper to return details about an airline based on a IATA code
//
//Includes an cion generator if the icon isnt available yet
//made up of the Airline name , shortened if neccessary

//as some airlines have mulitple entries, then the ICAO code is requested by returning ICAO

const fs = require('fs');
const uf = require('unique-filename');
const iconfolder = 'icons/';
const tempsubfolder = 'tempicons/';
const airlinesfile = 'airlines.json';
const airlinesfolder = 'reference/';
const svgtemplate = fs.readFileSync('icon.template.svg').toString();

exports.airlines = function () {

    this.config = { airlinesfile: airlinesfolder + airlinesfile};

    this.init = function (config) {

        if (config == null) {

        }
        else if (config.airlinesfile != null) {
            this.config.airlinesfile = config.airlinesfile;
        }

        this._airlines = JSON.parse(fs.readFileSync(this.config.airlinesfile).toString());

        //clear the temporary images

        (fs.readdirSync(iconfolder + tempsubfolder)).forEach(
            path => fs.unlinkSync(iconfolder + tempsubfolder+path)
        );

    };

    this.getairline = function (IATAcode, ICAOcode=null) {

        var offset = 0;

        if (ICAOcode != null) {
            offset = this.getIATAoffset(IATAcode, ICAOcode);
        }

        if (offset != -1) {
            var airline = this._airlines[IATAcode][offset];
            airline['offset'] = offset;
            return airline ;
        }

        return { IATA: IATAcode, ICAO: ICAOcode, Airline: null, Callsign: null, Region: null, Comments: null, Icon: '', offset: offset}

    }

    this.getIATAoffset = function (IATAcode,ICAOcode) {

        //search all the entries to find the IATAcode offset to the ICAOcode

        var offset = -1;

        this._airlines[IATAcode].forEach(function (code, index) {
            if (code.ICAO == ICAOcode) { offset =  index; }
        })

        return offset;

    };

    this.getname = function (IATAcode, offset = null) {

        var _name;
        var _offset = 0;

        if (offset != null) { _offset = offset;}

        if (offset == null && this._airlines[IATAcode].length == 1) {
            return -1; //we cant determine which details to return and we want the ICAOcode
        }

        return this._airlines[IATAcode][_offset].Airline;

    };

    this.geticonname = function (IATAcode, offset = 0, subfolder = iconfolder) {

        var _iconname;

        if (this._airlines[IATAcode][offset].Icon == '') {//create a dummy SVG and pass back the temp address

            var tmpiconfilename = uf(subfolder+tempsubfolder) + ".svg";

            this.buildicon(tmpiconfilename, this._airlines[IATAcode][offset].Airline);

            _iconname = tmpiconfilename

        }
        else {
            _iconname = iconfolder + this._airlines[IATAcode][offset].Icon;
        }

        return (_iconname);

    };

    this.buildicon = function (iconfilename, text, width = 0, height = 28, color = 'red') {

        //pull in the icon svg template and replace with the parameters

        var _width = width;

        const charwidth = 18; // default width for each character

        if (width == null || width == 0) { _width = charwidth * text.length;}

        var tempicon = svgtemplate.replace('%width', _width).replace('%height', height).replace('%color', color).replace('%text', text);

        fs.writeFileSync(iconfilename, tempicon);

    };

}