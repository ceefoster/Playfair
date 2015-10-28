var margin = {top: 50, right: 100, bottom: 50, left: 50},
	width = 1200 - margin.left - margin.right, 
	height = 700 - margin.top - margin.bottom; 


//scales, set range here, domain later w/ data 

//scale for x axis data 
var x = d3.time.scale() 
	.range([0, width]);

//scale for axis labels 
var xLabel = d3.time.scale()
	.range([0, width]); 

var y = d3.scale.linear()
	.range([height, 0]);



//add the canvas/drawable piece to html body 
var svg = d3.select("body").append("svg")
	.attr("class", "chart")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
  .append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");


//define interval for y-axis values 
var interval = 200000;

//not ideal solution but was quickest/easiest 
var customYear; 
var customTimeFormat = function(d){
	if(d.getYear() == -200){
		// d3.time.format("%y");
		customYear = "1700";
		// return "1700";
	}else if(d.getYear() == -100){
		customYear = "1800";
		// return "1800";
	}else if(d.getYear() == -110){
		customYear = "90";
	}else if(d.getYear() == -120){
		customYear = "80";
	}else if(d.getYear() == -130){
		customYear = "70";
	}else if(d.getYear() == -140){
		customYear = "60";
	}else if(d.getYear() == -150){
		customYear = "50";
	}else if(d.getYear() == -160){
		customYear = "40";
	}else if(d.getYear() == -170){
		customYear = "30";
	}else if(d.getYear() == -180){
		customYear = "20";
	}else if(d.getYear() == -190){
		customYear = "10";
	}
	else{
		customYear = "error";
	}
	return customYear;
}


//use data to make dashed lines for the undefined data, 
//from Kevin Schaul: http://kevin.schaul.io/2013/07/06/undefined-data-in-d3-charts/
var findCriticalPairs = function(data) {
    // Store property `critical` on points before and after a series of points.
    var inUndefinedSeries = false;
    var criticalValues = [];
    var criticalPairs = [];

    _.each(data, function(e, i) {
        if (!e.Imports) {
            // If this is the first item in an undefined series, add the previous
            // item to the critical values array.
            if (!inUndefinedSeries) {
                inUndefinedSeries = true;
                data[i - 1].critical = true;
                criticalValues.push(data[i - 1]);
            }
        } else if (inUndefinedSeries) {
            // When we reach the end of an undefined series, add the current item
            // to the critical values array.
            inUndefinedSeries = false;
            data[i].critical = true;
            criticalValues.push(data[i]);
        }

        // Coerce numbers
        e.Years = +e.Years;
        e.Imports = +e.Imports;
        e.Exports =+ e.Exports;
    });

    // These pairs will be used to generate sections of undefined values
    for (var i = 0; i < criticalValues.length; i++) {
        if (criticalValues[i].critical && i % 2 === 0) {
            criticalPairs.push([criticalValues[i], criticalValues[i + 1]]);
        }
    }
    return criticalPairs;
};

//load data
d3.csv("playfair_nums_est.csv", function(error, data){

	if (error) throw error;

	//ensures data is in number format 
	data.forEach(function(d){
		d.Imports= +d.Imports; 
		d.Exports= +d.Exports;
		d.Years= +d.Years;
	});


	//calculate values to determine y domain 
	var maxImport = d3.max(data, function(d) {return d.Imports} );
	var maxExport = d3.max(data, function(d) {return d.Exports} );
	var minImport = d3.min(data, function(d) {return d.Imports} );
	var minExport = d3.min(data, function(d) {return d.Exports} );

	var firstYr = new Date(d3.min(data, function(d) {return d.Years}),0,1);
	var lastYr = new Date(d3.max(data, function(d) {return d.Years}),0,1);

	console.log("firstYr: " + firstYr +", lastYr: " + lastYr);
	var maxY = Math.max(maxImport, maxExport);

	//add 1 million to maxY to match original graph
	maxY = maxY + 1000000;

	//sets the years as the x domain, extent is the equivalent of calling min and max simultaneously 
	x.domain(d3.extent(data, function(d) { return (d.Years);}));

	//sets the domain for the x axis labels 
	xLabel.domain([firstYr, lastYr]);

	//pick y domain based on smallest and largest number of combined import and export numbers
	//+interval to add an extra interval to match original graph 
	// /2 because of spacing quirk at the top of the chart
	y.domain([0, maxY+interval/2]);


	//returns y-axis tickmark labels formatted correctly
	var tickFormatterY = function(tickVal){
		if((tickVal/1000000) == 1){ //if the value is 1, omit s
			return ("1 Million");
		}else if((tickVal/1000000)%1 === 0){ //if the value is not 1, add an s
			return (tickVal/1000000 + " Millions");
		}else if (tickVal === 200000){ //first number on y-axis w/ comma
			return ("200,000");
			// return tickVal.toLocaleString(); //adds the comma back into the number, for some reason comes in with comma but returns without 
		}else if(tickVal < 1000000){ //less than 1 million but not the first y-value
			return tickVal/100000;
		}else{ //return the decimal numbers 
			return (tickVal/1000000);
		}
	};


	//adjusts y-values to be in intervals of 200,000
	var yValues = function(){
		var yNums = [];
		for(var i=interval; i<=maxY; i+=interval){
			yNums.push(i);
		}
		return yNums;
	}

	//x-axis
	var xAxis = d3.svg.axis()
		.scale(xLabel) //use xLabel for the x axis labels
		.innerTickSize(-height) //background grid, vertical lines 
		.outerTickSize([0])
		.tickFormat(customTimeFormat)
		.orient("bottom");

	//y-axis
	var yAxis = d3.svg.axis()
		.scale(y)
		.tickValues(yValues()) //override default values created by d3 
	    .innerTickSize(-width) //background grid, horizontal lines 
		.outerTickSize([0])
		.tickFormat(tickFormatterY) //calls custom format function 
		.orient("right"); //orients the lines of the graph


	//line & line2 are area svg for the difference graph (ow would be line svg)

	/****LINE AND AREA FOR DEFINED DATA****/

	//imports line - yellow
	var line = d3.svg.area()
		.interpolate("basis") //makes the line curvy
		.defined(function(d) { return d.Imports; }) //limits this line to defined data
		.x(function(d) {return x(d.Years); })
		.y(function(d) {return y(d.Imports); });

	//exports line - pink
	var line2 = d3.svg.area()
		.interpolate("basis") 
		.defined(function(d) { return d.Exports; }) 
		.x(function(d) {return x(d.Years); }) 
		.y(function(d) {return y(d.Exports); });

	var area = d3.svg.area()
		.interpolate("basis") 
		.defined(function(d) { return d.Imports; }) 
		.x(function(d) { return x(d.Years)})
		.y1(function(d) { return y(d.Imports)}); //y1 makes the Imports line the baseline


	/****//**END LINE AND AREA FOR DEFINED DATA****/


	/****LINE AND AREA FOR UNDEFINED DATA****/

	//imports line - dashed yellow
    var lineUndefined = d3.svg.line() //was d3.svg.line()
    	.interpolate("basis") //makes the line curvy
        .defined(function(d) { return d.critical; }) //returns the data to make the undefined, dashed line
        .x(function(d) { return x(d.Years); })
        .y(function(d) { return y(d.Imports); });

    //exports line - dashed pink
    var lineUndefined2 = d3.svg.line() //was d3.svg.line()
    	.interpolate("basis") //makes the line curvy
        .defined(function(d) { return d.critical; })
        .x(function(d) { return x(d.Years); })
        .y(function(d) { return y(d.Exports); });

	 var areaUndefined = d3.svg.area()
	 	.interpolate("basis") //makes the line curvy
        .defined(function(d) { return d.critical; }) 
        .x(function(d) { return x(d.Years); }) 
        .y1(function(d) {return y(d.Imports)}); 


	/*************************append all of the graphics to the canvas**************************************/


	svg.datum(data); //binds data, makes static and not interactive

	//bg color borrowed from former student
	//makes inner graph lighter 
	svg.append("rect")
		.attr("height", height)
		.attr("width", width)
		.attr("fill","white")
		.attr("opacity", .2);

	/**DIFFERENCE GRAPH - defined data**/

	//clip path area above imports line
	svg.append("clipPath")
		.attr("id", "clip-above")
	  .append("path")
	  	.attr("d", area.y0(0));

	//area below the imports line
	svg.append("clipPath")
		.attr("id", "clip-below")
	  .append("path")
	  	.attr("d", area.y0(height));

	svg.append("path")
		.attr("class", "area above")
		.attr("clip-path", "url(#clip-above)")
		.attr("d", area.y0(function(d) { console.log(d.Exports); return y(d.Exports); }));

	svg.append("path")
		.attr("class", "area below")
		.attr("clip-path", "url(#clip-below)")
		.attr("d", area.y0(function(d) { return y(d.Exports); }));

	/**END DIFFERENCE GRAPH**/

  	//imports
    var criticalPairs = findCriticalPairs(data);
    _.each(criticalPairs, function(e) { //e are the critical pairs, 9 arrays of 2 items (the pairs) each
 		console.log(e);
 		console.log(e[0]);
 		console.log(e[1]);
 		console.log(e[0].Exports, e[1].Exports);



		//clip path area above imports line
		svg.append("clipPath")
			.attr("id", "clip-above")
		  .append("path")
		  	.attr("d", areaUndefined.y0(0));

		//area below the imports line
		svg.append("clipPath")
			.attr("id", "clip-below")
		  .append("path")
		  	.attr("d", areaUndefined.y0(height));

		//shape that represents area between the two lines ... fills where the two intersect 
		svg.append("path")
			.attr("class", "area above")
			.attr("clip-path", "url(#clip-above)") 
			.attr("d", areaUndefined.y0(function(d) { return y(d.Exports); }));


        // same for the area below
		svg.append("path")
			.attr("class", "area below")

			.attr("clip-path", "url(#clip-below)") 
			.attr("d", areaUndefined.y0(function(d) { return y(d.Exports); }));

	    //fills in the difference chart
        svg.append("path")
        	.attr("class", "area area-undefined")
            .attr("d", areaUndefined(e)); 


        //dash undefined line for imports
        svg.append("path")
            .attr("class", "line line-undefined")
            .attr("d", lineUndefined(e)); 

        //dash undefined line for exports 
        svg.append("path")
            .attr("class", "exports line-undefined")
            .attr("d", lineUndefined2(e));
    });

	//line imports
	svg.append("path")
		.attr("class", "line")
		.attr("d", line);

	//line exports 
	svg.append("path")
		.attr("class", "line exports") 
		.attr("d", line2);

	//x axis 
	svg.append("g")
		.attr("transform", "translate(0," + height + ")") //orients x-axis to bottom of chart (default is top)
		.attr("class", "axis")
		.call(xAxis);

	//"time" label 
	svg.append("text")
		.attr("transform", "translate(" + (width/2) + ")")
		.attr("y", -10) //place label with correct space adjacent to graph
		.attr("class", "axis-labels")
		.style("text-anchor", "middle")
		.text("Time");

	//y axis 
	svg.append("g")
		.attr("transform", "translate(" + width + ",0)") //orients y-axis to right of chart (default is left)
		.attr("class", "axis")
		.call(yAxis);

  	//styles the grid lines based on y-axis values - integer million lines are bolded
	svg.selectAll('g.tick line')
		.style("stroke-width", function(d){
			if ((d/1000000)%1 === 0 ){
				return 2;
			}else{
				return 1;
			}
		})
		.style("opacity", function(d){
			if ((d/1000000)%1 === 0 )
				return 0.4;
			else
				return 0.2;
		});


	//"money" label
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left/2) //place it with correct space adjacent to graph
		.attr("x", 0 - (height/2))
		.attr("dy", "1em")
		.attr("class", "axis-labels")
		.style("text-anchor", "middle")
		.text("Money");


	//outline around inner chart
	svg.append("rect")
		.attr("height", height)
		.attr("width", width + margin.right)
	  	.attr("fill", "transparent")
	  	.attr("stroke", "black")
	  	.attr("stroke-width", 2);


 	
//)******************************************CREATE GRAPH LABEL - borrowed from former student*******//
var ellipseX=(width-775);
	var ellipseY=150;
	var textX=((width*2)/15);
	var textY=110;
	//add Label
	svg.append("ellipse")
			.attr("id", "currValue")
			.attr("cx", ellipseX)
			.attr("cy", ellipseY)
			.attr("rx",150)
			.attr("ry",105)
			.attr("fill", "#FCE2B0")
			.attr("stroke", "black")
			.attr("stroke-width", 1);
	svg.append("ellipse")
			.attr("id", "currValue")
			.attr("cx", ellipseX)
			.attr("cy", ellipseY)
			.attr("rx", 150)
			.attr("ry",105)
			.attr("fill","#FF4F4F")
			.attr("opacity", .1)
			.attr("stroke-width", 0);
	svg.append("text")
			.attr("id", "currValue")
			.attr("class", "titleText")
			.attr("x", textX+10)
			.attr("y", textY)
			.text("EXPORTS & IMPORTS");
	svg.append("text")
			.attr("id", "currValue")
			.attr("class", "titleText2")
			.attr("x", textX+60)
			.attr("y", textY+40) //adjusts vertical space between text lines
			.text("to and from all");
	svg.append("g")
			.attr("id", "currValue")
			.attr("class", "titleText3")
			.attr("transform", "translate(55,0)")
			.append("text")
			.attr("x", (textX-60))
			.attr("y", (textY+80))
			.text("NORTH AMERICA");


	// add line labels
	svg.append("text")
		.attr("transform", "translate(" + (width-420) + "," + (height-250) + ") rotate(" + (-70) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.style("font-size", "120%")
		.text("Line of Exports");
	svg.append("text")
		.attr("transform", "translate(" + (width-750) + "," + (height-20) + ") rotate(" + (-10) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.style("font-size", "120%")
		.text("Exports");
	svg.append("text")
		.attr("transform", "translate(" + (width-350) + "," + (height-120) + ") rotate(" + (-5) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.style("font-size", "120%")
		.text("Imports");
	svg.append("text")
		.attr("transform", "translate(" + (width-940) + "," + (height-55) + ") rotate(" + (-11) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.style("font-size", "120%")
		.text("Line of Imports");
	svg.append("text")
		.attr("transform", "translate(" + (width-150) + "," + (height-150) + ") rotate(" + (-65) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.text("BALANCE in FAVOUR of ENGLAND");
	svg.append("text")
		.attr("transform", "translate(" + (width-400) + "," + (height-150) + ") rotate(" + (-65) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.text("BALANCE in FAVOUR of ENGLAND");
});





























