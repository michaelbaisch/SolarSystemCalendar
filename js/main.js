// Inspired by http://bl.ocks.org/mbostock/4063423¬

/*** todo ***
- prevent tap inner planets in outer view
- prevent pinchClose/Open function in dayView when in none touchDevice mode
*/

var startTime = 0;
var now_main = new Date().getTime();
var nowLastFrame = new Date().getTime();
var earthPeriodTime = 25000;
var earthRotationTime = 5000;
var solarScale;
var viewFactor;
var dayScale = 100;
var solarStroke = 5;
var earthStroke = 10;
var currentEarthStroke = earthStroke;
var solarArcOpacity = 0.5;
var planetDayOpacity = 0.5;
var currentTransition = "";
var currentView = "solar";
var chosenPlanet = "";
var chosenSize = 0;
var biggerPlanet;

var rad2deg = 57.295779513;
var deg2rad = 0.017453293

// Longitude is angle at 1.1.2014, to calculate current angle, day difference is needed
var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
var oneYear = 365.242;
var date2014 = new Date(2014,0,01);
var dateNow = new Date();
var daysSince2014 = Math.round(Math.abs((date2014.getTime() - dateNow.getTime())/(oneDay)));

var time_main = 0;
var timeMultiplier = 1;

var data;

var requestAnimationFrame = window.requestAnimationFrame || 
window.mozRequestAnimationFrame || 
window.webkitRequestAnimationFrame || 
window.msRequestAnimationFrame;


function updateSize(){
  width = window.innerWidth;
  height = window.innerHeight;
  
  smallSide = (width > height) ? height : width;
  
  if(currentView == "day"){ 
    dayScale = (width/5.5)/biggerPlanet;
    
    var node = dayView.datum(data).selectAll("g")
      .data(data);
    
    // Update pos of planets
    node
      .attr("transform", function(d){
        if(d.name == "earth"){  
          return "translate(" + width*3/4 + " " + height/2 + ")";
        }
        else if (d.name == chosenPlanet){
          return "translate(" + width/4 + " " + height/2 + ")";
        }
        else return 0
      });
    
    // Update size of planets
    node.select("circle")
      .attr("r", function(d){
        if(d.name == "earth" || d.name == chosenPlanet){
          return d.size * dayScale;
        }
      })
  }
  
}

updateSize();
var tallSide = (width < height) ? height : width;

viewFactor = tallSide / smallSide * 132;              // Initial Factor so Sun covers the whole screen
solarScale = smallSide * viewFactor;


// Detect touch device
if ("ontouchstart" in document.documentElement) var touchDevice = true;
else var touchDevice = false;

if (!touchDevice){
  d3.select("#button").transition().duration(2000).delay(6000)
    .style("opacity", 1)
    .style("display", "block");
  d3.select("#touchDeviceNote").transition().duration(2000).delay(10000)
    .style("opacity", 0)
}


window.onresize = function(event) {
  
  updateSize();
  d3.select("#solarViewContainer").attr("transform", "translate(" + width / 2 + "," + height * .5 + ")");
  
  svg
    .attr("width", width)
    .attr("height", height-5);
}


var svg = d3.select("#svgContainer").append("svg")
    .attr("width", width)
    .attr("height", height-5);

var solarView = svg.append("g").attr("id", "solarViewContainer").attr("transform", "translate(" + width / 2 + "," + height * .5 + ")")
                   .append("g").attr("transform", "scale(1)");
var dayView = svg.append("g").attr("id", "dayViewContainer").attr("transform", "scale(1)");


var arcSolar = d3.svg.arc()   
  .startAngle(function(d)  { return d.currentVisibility ? d.currentAngle : 0; })   // d.startAngle - angleProgress(d)
  .endAngle(function(d)    { return d.currentVisibility ? d.startAngle : 0; })
  .innerRadius(function(d) { return d.currentVisibility ? d.currentDistance : 0; })
  .outerRadius(function(d) { return d.currentVisibility ? d.currentDistance + ((d.name == "earth") ? currentEarthStroke : solarStroke) : 0; });


var arcDay = d3.svg.arc()
  .startAngle(function(d) { return 0; })
  .endAngle(function(d) { return ((time_main - startTime) / (d.rotationPeriod * earthRotationTime) - Math.floor((time_main - startTime) / (d.rotationPeriod * earthRotationTime)))  *2 * Math.PI })
  .innerRadius(function(d) { return d.size * dayScale-10; })
  .outerRadius(function(d) { return d.size * dayScale; });


// Current heliocentric longitudes; calculated once and written to data
function calcStartAngle(d) {
  var _angle = d.longitude + daysSince2014/(oneYear * d.revolutionPeriod) * 360;  // angle
  d.startAngle = (_angle / (360/(2*Math.PI))) * -1 + Math.PI/2;                   // in radians, 0° = right, counterclockwise
}

function initVisibility(d) {
  d.currentVisibility = d.innerPlanet ? true : false; 
}


// Sun
solarView.append("circle")
  .style("fill", "#fff3eb");


// Read json and draw planets
d3.json("output.json", function(error, json) {
  if (error) return console.warn(error);
  data = json;
  
  // Solar view
  var node = solarView.datum(data).selectAll("g")
      .data(data)
    .enter().append("g")
      .each(function(d){
        calcStartAngle(d);
        preCalculate(d);
        initVisibility(d);
      });
    
    // Planet arcs
    node.append("path")
      .attr("d", function(d){ return arcSolar(d); })
      .attr("opacity", function(d) { return d.currentVisibility ? solarArcOpacity : 0; })       // don't display outer Planets
      .style("display", function(d){ return d.currentVisibility ? "block" : "none"; })            // "
      .style("fill", function(d) { return "#" + d.color.toString(16); })
      .style("fill-rule", "evenodd");
      
    
    // Circles for tracking   
    node.append("circle")
      .attr("id", function(d){ return d.name + "Pos"; })
      .attr("r", function(d){ return (d.name == "earth") ? earthStroke/2 : solarStroke/2; })
      .style("fill", function(d) { return "#" + d.color.toString(16); })
      .style("display", function(d){ return d.currentVisibility ? "block" : "none"; });         // don't display outer Planets
      //.each(stash); 
  
  // Day view
  var node = dayView.datum(data).selectAll("g")
      .data(data)
    .enter().append("g");
    
    // Day arcs
    node.append("path")
      .attr("opacity", 0)
      .attr("d", arcDay)
      .style("fill", function(d) { return "#" + d.color.toString(16); })
      .style("fill-rule", "evenodd")
      .style("display", "none");
    
    // Planets
    node.append("circle")
      .attr("r", function(d) { return (d.name == "earth") ? earthStroke/2 : solarStroke/2 })
      .style("fill", function(d) { return "#" + d.color.toString(16); })
      .style("stroke", function(d) { return "#" + d.color.toString(16); })
      .style("stroke-width", 3)
      .style("stroke-opacity", 0)
      .style("fill-opacity", 0)
      .style("display", "none");
      //.each(stash); 
  
  initalTransition();
  tick();   // call tick function
});


// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

function preCalculate(d){
  // Calculate current angle
  var temp = (time_main - startTime) / (d.revolutionPeriod * earthPeriodTime);
  d.currentAngle = d.startAngle - (temp - Math.floor(temp)) * 6.283185307;
  
  // Calculate current distance
  d.currentDistance = d.distance * solarScale;  
}


function tick() {
  now_main = new Date().getTime()
  time_main +=  (now_main - nowLastFrame) * timeMultiplier;   // Update time
  nowLastFrame = now_main;
  
  solarScale = smallSide * viewFactor;
  
  if(currentView == "solar"){ // Update solar view
    var node = solarView.datum(data).selectAll("g")
        .data(data);
    
    solarView.select("circle")
      .attr("r", 0.0047 * solarScale);
      
    node.each(function(d){ preCalculate(d) })
    
    // Planet arcs
    node.select("path")
      .attr("d", arcSolar);
    
    // Planets
    node.select("circle")
      .attr("transform", function(d) {
        if(d.currentVisibility){
          var stroke = (d.name == "earth") ? currentEarthStroke : solarStroke;
          return "rotate(" + (d.currentAngle * rad2deg) + ")"
               + "translate(0," + (-(d.currentDistance) - (stroke/2)) + ")"
        }
        else return "";
      })
  
  }
  
  else if (currentView == "day"){ // Update day view
    var node = dayView.datum(data).selectAll("g")
        .data(data);
    
    // Planet arcs
      node.select("path")
        .attr("d", arcDay);
        
      node.select("circle")
        .attr("r", function(d){
          if(d.name == "earth" || d.name == chosenPlanet){
            return d.size * dayScale;
          }
        })
        
  }
  
  // Solar to day view transition | update position of planets while scale transition
  if(currentTransition == "solar2day"){
    var node = dayView.datum(data).selectAll("g")
      .data(data)
    
    node
      .attr("transform", function(d){
        if(d.name == "earth" || d.name == chosenPlanet){
          var svgCircle = d3.select("#" + d.name + "Pos").node();
          var cx = +svgCircle.getAttribute('cx');
          var cy = +svgCircle.getAttribute('cy');
          var ctm = svgCircle.getCTM();
          var coords = getScreenCoords(cx, cy, ctm);
          return "translate(" + coords.x + " " + coords.y + ")";
        }
        else return 0
      });
  }

  requestAnimationFrame(tick);
}


function getScreenCoords(x, y, ctm) {
  var xn = ctm.e + x*ctm.a;
  var yn = ctm.f + y*ctm.d;
  return { x: xn, y: yn };
}


function initalTransition() {
  var viewFactorEnd0 = viewFactor*0.7;
  var viewFactorEnd1 = 0.4;
  var viewFactorEnd2 = 0.3;

  var duration0 = 3000;
  var duration1 = 1500;
  var duration2 = 1000;
  
  
  d3.transition()
    .duration(duration0)
    .ease("linear")
    .tween("initTween0", function() {
      var i = d3.interpolate(viewFactor, viewFactorEnd0);
      return function(t) { viewFactor = i(t); };
    })
  
  d3.transition()
    .duration(duration1)
    .delay(duration0)
    .ease("exp-out")
    .tween("initTween1", function() {
      var i = d3.interpolate(viewFactor, viewFactorEnd1);
      return function(t) { viewFactor = i(t); };
    })
    .each("end",function(){
      
      d3.transition()
      .duration(duration2)
      .ease("quad-out")
      .tween("initTween2", function() {
        var i = d3.interpolate(viewFactor, viewFactorEnd2);
        return function(t) { viewFactor = i(t); };
      })
    
    });

}


function pinchClose() {
  var viewFactorEnd = 0.015;
  var duration = 2000;
  var earthStrokeEnd = solarStroke;
  
  var node = solarView.datum(data).selectAll("g")
    .data(data);
    
  // Make everything (theoretically) visible 
  node.each(function(d){d.currentVisibility = true;})
  
  node.select("path")
    .style("display", "block");
  
  node.select("circle")   // Planets
    .style("display", "block");
  
  // Transitions
  node.select("path").transition().duration(duration)
    .style("opacity", function(d) {return((d.innerPlanet && d.name != "earth") ? 0 : solarArcOpacity)});    // Display outer planets and earth
  
  node.select("circle").transition().duration(duration)   // Planets
    .style("opacity", function(d) {return((d.innerPlanet && d.name != "earth") ? 0 : 1)}) // Display outer planets and earth
    .attr("r", function(d){return solarStroke/2})
    .each("end", function(d){                         // After transition is finished
      var node = solarView.datum(data).selectAll("g")
        .data(data);
        
      // Hide not needed planets and strokes
      node.each(function(d){d.currentVisibility = (d.innerPlanet && d.name != "earth") ? false : true;})
      
      node.select("path")     // Arcs
        .style("display", function(d){return (d.innerPlanet && d.name != "earth") ? "none" : "block";});
      
      node.select("circle")   // Planets
        .style("display", function(d){return (d.innerPlanet && d.name != "earth") ? "none" : "block";});
    });
  
  d3.transition()         // https://groups.google.com/forum/#!topic/d3-js/36JmGzDkt44
  
    .duration(duration)
    //.ease("linear")
    .tween("tween", function() {
      var i = d3.interpolate(viewFactor, viewFactorEnd);
      return function(t) { viewFactor = i(t); };
    })
    
    .duration(duration)
    //.ease("out")
    .tween("tween1", function() {
      var i = d3.interpolate(currentEarthStroke, earthStrokeEnd);
      return function(t) { currentEarthStroke = i(t); };
    });
}


function pinchOpen() {
  var viewFactorEnd = 0.3;
  var duration = 2000;
  var earthStrokeEnd = earthStroke;
  
  var node = solarView.datum(data).selectAll("g")
    .data(data);
    
  // Make everything (theoretically) visible
  node.each(function(d){d.currentVisibility = true;})
  
  node.select("path")
    .style("display", "block");
  
  node.select("circle")   // Planets
    .style("display", "block");
    
  
  node.select("path").transition().duration(duration)   // Arcs
    .style("opacity", function(d) {return solarArcOpacity});
  
  node.select("circle").transition().duration(duration)   // Planets
    .style("opacity", function(d) {return 1}) 
    .attr("r", function(d){return (d.name == "earth") ? earthStroke/2 : solarStroke/2})
    .each("end", function(d){
      var node = solarView.datum(data).selectAll("g")
        .data(data);
        
      // Hide not needed planets and strokes
      node.each(function(d){d.currentVisibility = d.innerPlanet ? true : false;})
      
      node.select("path")     // Arcs
        .style("display", function(d){return (d.innerPlanet) ? "block" : "none";});
      
      node.select("circle")   // Planets
        .style("display", function(d){return (d.innerPlanet) ? "block" : "none";});
    });
  
  d3.transition()
    .duration(duration)
    //.ease("easein")
    .tween("tween2", function() {
      var i = d3.interpolate(viewFactor, viewFactorEnd);
      return function(t) { viewFactor = i(t); };
    })
    
    .duration(duration)
    //.ease("out")
    .tween("tween3", function() {
      var i = d3.interpolate(currentEarthStroke, earthStrokeEnd);
      return function(t) { currentEarthStroke = i(t); };
    });
}


function tap(e) {
  
  if(currentView == "solar"){       // From Solar to Day view
    // Calculate radius clicked on
    var clickPoint = {x:0,y:0};
    clickPoint.x = e.gesture.center.pageX;
    clickPoint.y = e.gesture.center.pageY;
    
    var centerPoint = {x:0,y:0};
    centerPoint.x = width/2;
    centerPoint.y = height/2;
    
    var distance = lineDistance(clickPoint, centerPoint);
    
    var node = solarView.datum(data).selectAll("g")
      .data(data);
    
    chosenPlanet = "";
    chosenSize = 0;
    
    node.select("circle")
    
      .each(function(d) {
        if (d.distance * solarScale < distance + 20 && d.distance * solarScale > distance - 20){
          chosenPlanet = d.name;
          chosenSize = d.size;
        }
      });
    
    if(chosenPlanet != "earth" && chosenPlanet != ""){
      // Start transition with scaling the solar system in y
      solarView.transition().duration(1500).ease("quad-in-out")
        .attr("transform", "scale(1, 0)")
        .each("start", function(){
          currentTransition = "solar2day";
          var node = dayView.datum(data).selectAll("g")
            .data(data)
          
          // Default settings for "day" planets
          node.select("circle")       
            .style("fill-opacity", function(d){ return (d.name == "earth" || d.name == chosenPlanet ) ? 1 : 0 })
            .style("display", function(d){ return (d.name == "earth" || d.name == chosenPlanet ) ? "block" : "none";})            
            .attr("r", function(d){
              if (d.name == "earth") return currentEarthStroke/2;
              else if (d.name == chosenPlanet) return solarStroke/2;
            });
        })
        .each("end", function() {
          currentTransition = "";
          solar2dayFin(); // Call function after transition is finished
        });
    }
  }
  
  else if (currentView = "day"){      // From Day to Solar view
    var node = dayView.datum(data).selectAll("g")
      .data(data)
    
    node.select("path")
      .transition().duration(200)
      .attr("opacity", function(d){
          return 0;
      })
      .each("end", function(){ day2solarFin(); });
  }
}


function day2solarFin(){
  var duration = 1000;    // Planets moving
  var futureTime = time_main + duration * timeMultiplier;
  var earthFuturePosX, otherPlanetFuturePosX;
  
  // Calculate positions of planets in the future
  var node = solarView.datum(data).selectAll("g")
    .data(data);
  
  node.select("circle")
    .each(function(d) {
      if(d.name == "earth" || d.name == chosenPlanet ){
        var stroke = (d.name == "earth") ? currentEarthStroke : solarStroke;
        var tempAngle = (d.startAngle * rad2deg - (futureTime - startTime) / (d.revolutionPeriod * earthPeriodTime) * 360) * deg2rad - Math.PI/2;
        var tempDistance = ((d.distance * solarScale) + (stroke/2));
        if(d.name == "earth") earthFuturePosX = tempDistance * Math.cos(tempAngle);
        if(d.name == chosenPlanet) otherPlanetFuturePosX = tempDistance * Math.cos(tempAngle);
      }
    });
  
  
  var node = dayView.datum(data).selectAll("g")
    .data(data)
  
  node.select("path")
    .style("display", "none");
  
  // Position the planets
  node.transition().duration(1000)//.ease("linear")
      .attr("transform", function(d){
        if(d.name == "earth"){  
          return "translate(" + (width/2 + earthFuturePosX) + " " + height/2 + ")";
        }
        else if (d.name == chosenPlanet){
          return "translate(" + (width/2 + otherPlanetFuturePosX) + " " + height/2 + ")";
        }
        else return 0
      });
  
  node.select("circle")   
    .transition().duration(1000)
    .attr("r", function(d){
      if(d.name == "earth" || d.name == chosenPlanet){
        return (d.name == "earth") ? currentEarthStroke/2 : solarStroke/2
      }
    })    
    .style("fill-opacity", 1)
    .each("end", function(){
      currentView = "solar";
      currentTransition = "solar2day";
      solarView.transition().duration(1500).ease("quad-in-out")
        .attr("transform", "scale(1, 1)")
        .each("end", function() {
          currentTransition = "";
          var node = dayView.datum(data).selectAll("g")
            .data(data)
          
          node.select("circle")       
            .style("fill-opacity", 0)
            .style("display", "none");
        });
    });
}


// Rest of the Transition
function solar2dayFin(){
  
  var node = dayView.datum(data).selectAll("g")
    .data(data)
  
  // Position the planets (earth always right)
  node.transition().duration(1000)
      .attr("transform", function(d){
        if(d.name == "earth"){  
          return "translate(" + width*3/4 + " " + height/2 + ")";
        }
        else if (d.name == chosenPlanet){
          return "translate(" + width/4 + " " + height/2 + ")";
        }
        else return 0
      });
  
  // Opacity transitions with afterwards fading in the arcs
  biggerPlanet = (chosenSize > 1) ? chosenSize : 1
  dayScale = (width/5.5)/biggerPlanet;
  node.select("circle")   
    .transition().duration(1000)
    .attr("r", function(d){
      if(d.name == "earth" || d.name == chosenPlanet){
        return d.size * dayScale;
      }
    })    
    .style("fill-opacity", planetDayOpacity)
    .each("end", function(){
      currentView = "day";
      node.select("path")
      .transition().duration(200)
        .attr("opacity", function(d){
          if(d.name == "earth" || d.name == chosenPlanet){
            return 1;
          }
          else return 0;
        })
        .style("display", function(d){ return (d.name == "earth" || d.name == chosenPlanet ) ? "block" : "none";});
    });
}


function lineDistance( point1, point2 ){
  var xs = 0;
  var ys = 0;

  xs = point2.x - point1.x;
  xs = xs * xs;

  ys = point2.y - point1.y;
  ys = ys * ys;

  return Math.sqrt( xs + ys );
}


d3.select(self.frameElement).style("height", height + "px");

