//helper utility to be used in a nodehelper to return details about an airline based on a IATA code
//
//Includes an icon generator if the icon isnt available yet
//made up of the Airline name , shortened if necessary

//as some airlines have mulitple entries, then the ICAO code is requested by returning ICAO

const fs = require('fs');
const iconfolder = 'modules/MMM-Consumer-Flights/icons/';
const tempsubfolder = 'tempicons/';
const airlinesfile = 'airlines.json';
const airlinesfolder = 'modules/MMM-Consumer-Flights/reference/';
const svgtemplate = fs.readFileSync('modules/MMM-Consumer-Flights/icon.template.svg').toString();

exports.airlines = function () {

    this.config = { airlinesfile: airlinesfolder + airlinesfile};

    this.init = function (config) {

        if (config == null) {

        }
        else if (config.airlinesfile != null) {
            this.config.airlinesfile = config.airlinesfile;
        }

        this._airlines = JSON.parse(fs.readFileSync(this.config.airlinesfile).toString());

        //clear the temporary images, leaving empty.file

        const files = fs.readdirSync(iconfolder + tempsubfolder);

        files.forEach(function (path) { if (path != 'empty.file') { fs.unlinkSync(iconfolder + tempsubfolder + path); } });

    };

    this.getairline = function (IATAcode, ICAOcode=null) {

        var offset = 0;

        //check code exists in the airlines database

        if (this._airlines[IATAcode] == null && this._airlines[ICAOcode] == null) {
            console.error("Airline not present in database",IATAcode,ICAOcode)
            offset = -1;
        }

        if (this._airlines[IATAcode] != null && ICAOcode != null) {
            offset = this.getIATAoffset(IATAcode, ICAOcode);
        }
        else { offset = -1;}

        if (offset != -1) {
            var airline = JSON.parse(JSON.stringify( this._airlines[IATAcode][offset]));
            airline['offset'] = offset;
            airline.Icon = this.geticonname(IATAcode, offset);
            return airline ;
        }

        return { IATA: IATAcode, ICAO: ICAOcode, Airline: null, Callsign: null, Region: null, Comments: null, Icon: '', Offset: offset}

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

    this.geticonname = function (IATAcode, offset = 0, subfolder = iconfolder,shorten=true, length=14) {

        var _iconname;

        if (this._airlines[IATAcode][offset].Icon == '') {//create a dummy SVG and pass back the temp address
            //console.log(this._airlines[IATAcode][offset].Airline,IATAcode, this._airlines[IATAcode][offset].ICAO);

            var tmpiconfilename = subfolder + tempsubfolder + IATAcode +"_" + this._airlines[IATAcode][offset].ICAO + ".svg";

            this.buildicon(tmpiconfilename, this.shorten(shorten,length,this._airlines[IATAcode][offset].Airline));

            _iconname = tmpiconfilename

        }
        else {

            _iconname = iconfolder + this._airlines[IATAcode][offset].Icon;

            if (_iconname.substr(_iconname.length - 3, 3) == 'png') {
                var x = 99;
            }
            
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

    this.shorten = function (shorten, length, text) {

        if (!shorten) { return text; }

        var _text = text;
        var iteration = 0;

        //shorten words where possible before truncating at length

        while (_text.length > length) {

            switch (iteration) {
                case 0:
                    _text = _text.replace('irline', "'line");
                    break;
                case 1:
                    _text = _text.replace('irway', "'way");
                    break;
                case 2:
                    _text = _text.replace('nternational', "nt'l");
                    break;
                default:
                    _text = _text.substr(0, length);
            } 

            iteration++;

        }

        return _text;

    };

}