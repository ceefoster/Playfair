



var margin = {top: 50, right: 100, bottom: 50, left: 50},
	width = 960 - margin.left - margin.right,
	height = 600 - margin.top - margin.bottom;


//scales
//"D3's time scale is an extension of d3.scale.linear that uses JavaScript Date objects as the domain representation. 
//Thus, unlike the normal linear scale, domain values are coerced to dates rather than numbers;"
//https://github.com/mbostock/d3/wiki/Time-Scales
var x = d3.time.scale()
	.range([0, width]);

var y = d3.scale.linear()
	.range([height, 0]);

var svg = d3.select("body").append("svg")
	.attr("class", "chart")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
  .append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var interval = 200000;

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
        e.Exports = +e.Exports;
    });

    // These pairs will be used to generate sections of undefined values
    for (var i = 0; i < criticalValues.length; i++) {
        if (criticalValues[i].critical && i % 2 === 0) {
            criticalPairs.push([criticalValues[i], criticalValues[i + 1]]);
        }
    }
    return criticalPairs;
};



d3.csv("playfair_nums_est.csv", function(error, data){
	if (error) throw error;

	data.forEach(function(d){
		d.Imports= +d.Imports; //ensures data is in number format 
		d.Exports= +d.Exports;
	});

	//calculate values to determine y domain 
	var maxImport = d3.max(data, function(d) {return d.Imports} );
	var maxExport = d3.max(data, function(d) {return d.Exports} );
	var minImport = d3.min(data, function(d) {return d.Imports} );
	var minExport = d3.min(data, function(d) {return d.Exports} );

	var firstYr = d3.min(data, function(d) {return d.Years});
	var lastYr = d3.max(data, function(d) {return d.Years});

	var maxY = Math.max(maxImport, maxExport);


	//extent is the equivalent of calling min and max simultaneously 
	x.domain(d3.extent(data, function(d) { return (d.Years);}));

	//pick y domain based on smallest and largest number of combined import and export numbers + interval for more space 
	y.domain([0, maxY+interval]);


	//returns y-axis tickmark labels formatted correctly
	var tickFormatterY = function(tickVal){
		if((tickVal/1000000) == 1){ //if the value is 1, omit s
			return ("1 Million");
		}else if((tickVal/1000000)%1 === 0){ //if the value is not 1, add an s
			return (tickVal/1000000 + " Millions");
		}else if (tickVal === 200000){ //first number on y-axis...might need to change to adapt for other data 
			return tickVal.toLocaleString(); //adds the comma back into the number, for some reason comes in with comma but returns without 
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

	//TODO?
	var tickFormatterX = function(tickVal){
		// var format = d3.time.format("%y");
		// format.parse(tickVal);
		// format(new Date(tickVal));

		// d3.time.format("d");
		// var tempYr = firstYr;
		// var xNums[];
		// for(var i=tempYr; i <=lastYr; i+=1){
		// 	xNums.push[i];
		// }
		// return xNums;
		// var xNums = [];
		// for(var i=firstYr; i<= lastYr; i+=1){
		// 	xNums.push(tickVal.toString().substring(2,2));

		// }
		// return xNums;
	}

	//x-axis
	var xAxis = d3.svg.axis()
		.scale(x)
		.innerTickSize(-height) //background grid, vertical lines 
		.outerTickSize([0])
		// .tickFormat(tickFormatterX)
		.tickFormat(d3.format("d")) //removes comma from year 
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

	//imports line - yellow
	var line = d3.svg.area()
		.interpolate("basis") //makes the line curvy
		.defined(function(d) { return d.Imports; }) //marks defined data on line 
		.x(function(d) {return x(d.Years); })
		.y(function(d) {return y(d.Imports); });

	//exports line - pink
	var line2 = d3.svg.area()
		.interpolate("basis") //makes the line curvy 
		.x(function(d) {return x(d.Years); })
		.y(function(d) {return y(d.Exports); });

	var area = d3.svg.area()
		.interpolate("basis") //makes the line curvy
		.x(function(d) { return x(d.Years)})
		.y1(function(d) { return y(d.Imports)}); //y1 makes the Imports line the baseline


		//FROM UNDEFINED DATA EXAMPLE: 

    // var line = d3.svg.line()
    //     .defined(function(d) { return d.wineries; })
    //     .x(function(d) { return x(+d.year); })
    //     .y(function(d) { return y(+d.wineries); });

    // var area = d3.svg.area()
    //     .defined(function(d) { return d.wineries; })
    //     .x(function(d) { return x(+d.year); })
    //     .y0(function(d) { return y(+d.wineries); })
    //     .y1(height);


    var lineUndefined = d3.svg.line()
        .defined(function(d) { return d.critical; })
        .x(function(d) { return x(+d.Years); })
        .y(function(d) { return y(+d.Imports); });

	 // var areaUndefined = d3.svg.area()
  //       .defined(function(d) { return d.critical; })
  //       .x(function(d) { return x(+d.Years); })
  //       .y0(function(d) { return y(+d.Imports); })
  //       .y1(height);


	/*************************append all of the graphics to the canvas**************************************/


	svg.datum(data); //binds data, makes static and not interactive

	//bg color borrowed from former student
	//makes inner graph lighter 
	svg.append("rect")
		.attr("height", height)
		.attr("width", width)
		.attr("fill","white")
		.attr("opacity", .2);

	/**DIFFERENCE GRAPH**/

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
		.attr("d", area.y0(function(d) { return y(d.Exports); }));

	svg.append("path")
		.attr("class", "area below")
		.attr("clip-path", "url(#clip-below)")
		.attr("d", area.y0(function(d) { return y(d.Exports); }));

	/**END DIFFERENCE GRAPH**/

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
var ellipseX=(width/3)*2;
	var ellipseY=150;
	var textX=(width/2);
	var textY=110;
	//add Label
	svg.append("ellipse")
			.attr("id", "currValue")
			.attr("cx", ellipseX)
			.attr("cy", ellipseY)
			.attr("rx", 150)
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
			.attr("y", textY+40) //adjusts vertical space between text liens
			.text("to and from all");
	svg.append("g")
			.attr("id", "currValue")
			.attr("class", "titleText3")
			.attr("transform", "translate(55,0)")
			.append("text")
			.attr("x", (textX-60))
			.attr("y", (textY+80))
			.text("NORTH AMERICA");


	//add line labels
	svg.append("text")
		.attr("transform", "translate(" + (width-690) + "," + (height-425) + ") rotate(" + (55) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.text("Line of Exports");
	svg.append("text")
		.attr("transform", "translate(" + (width-690) + "," + (height-130) + ")")
		.attr("dy", ".35em")
		.attr("text-anchor","start")
		.style("fill", "black")
		.text("Line of Imports");

  //   var lineUndefined = d3.svg.line()
  //       .defined(function(d) { return d.critical; })
  //       .x(function(d) { return x(+d.Years); })
  //       .y(function(d) { return y(+d.Imports); });


	 // var areaUndefined = d3.svg.area()
  //       .defined(function(d) { return d.critical; })
  //       .x(function(d) { return x(+d.Years); })
  //       .y0(function(d) { return y(+d.Imports); })
  //       .y1(height);


    var criticalPairs = findCriticalPairs(data);
    _.each(criticalPairs, function(e) {
        // svg.append("path")
        //     .attr("class", "area area-undefined")
        //     .attr("d", areaUndefined(e));
        
        svg.append("path")
            .attr("class", "line line-undefined")
            .attr("d", lineUndefined(e));
    });


});































