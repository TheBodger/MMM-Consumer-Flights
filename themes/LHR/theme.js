//theme.js
//LHR
//contains paramaters that are used to layout the board
//options are:
//board column indexes
//
//
var LHR_theme = {
	arr_columnnames: [],
	dep_columnnames: [],					//enter the columnnames, in the default order shown in BCI,
											//i.e. ['At','Airline','Airport*','Flight','Remarks','Terminal','Gate']
											// To will be automatically replaced with  From depending if departure or arrivals board
											// Example ['Time','Carrier','Airport','Number','Status','Term','Flight Gate']
											// leave empty or set to null to use the default set

	bci: [],    //enter the order of fields to appear on the board, using the following index numbers
				//0-4 = arrival/departure time (h,h,:,m,m)
				//5 = airline
				//6 = remote airport 
				//7 = flight number
				//8 = remarks/status
				//9 = terminal
				//10 = gate
				//i.e. (10,9,0,1,2,3,4,5,8,7,6) or leave empty {} or set null to use default of 0,1,2,3,4,5,6,7,8,9,10









};