$(function () {

  // Month to index map
  var MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  // Trigger map changes on slider movement
  $('input[type=range]')
    .on('input', function () {
      $(this)
        .trigger('change');
    });

  // Update month name display
  var $monthInput = $('#month-input');
  var $monthNameLabel = $('#month-name-label');
  var $monthSelector = $('#month-selector');

  $monthInput.change(function () {
    $monthNameLabel.text(MONTH_NAMES[+$monthInput.val()]);
  });

  $monthNameLabel.text(MONTH_NAMES[+$monthInput.val()]);

  // Add mouse handlers for slider
  $monthInput.mouseover(function (eventData) {
    tooltipSliderMouseOver(null, eventData);
  });

  $monthInput.mousemove(function (eventData) {
    tooltipSliderMouseMove(null, eventData);
  });

  $monthInput.mouseout(function (eventData) {
    tooltipMouseOut(null);
  });

  // Enable month selector to scroll with page
  $monthSelector.css('position', 'relative');
  var originalY = $monthSelector.offset().top;

  $(window).on('scroll', function(eventData) {
    var scrollTop = $(window).scrollTop();
    $monthSelector.stop(true, true).animate({
      top: scrollTop < originalY
        ? 0
        : scrollTop - originalY + margin.top
      }, 0);
    $monthSelector.finish();
  });

  // Global definition for each map view
  var TAXI_MAP_ATTRS = [{
    attrName: 'time',
    minValue: 5,
    title: 'Travel Time',
    description: '<p>One of the most important aspects of a taxi trip is how long it takes. Using the aggregated information, we have been able to compute average taxi trip times between taxi zones.' +
      'These values are based on trip times for trips that began or ended in the selected zone. For passengers, this provides a metric of how much time is required to travel between zones in ' +
      'the city.</p> <p>For taxi drivers, it provides the same metric, but it goes one step further. With average times between taxi zones, we can get an understanding of the areas with the ' +
      'most congestion. In contrast, we also see areas that are easier to travel to and from.</p><p>The ranges in travel time provide an understanding of the distribution of taxi trips ' +
      'between zones, and the amount of time required to make those trips to various parts of the city.</p><p>We take this analysis one step further in the next visualization, using data ' +
      'regarding taxi fares for these same trips.</p>'
  }, {
    attrName: 'fare',
    minValue: 10,
    title: 'Trip Fare',
    description: '<p>Aside from taxi trip times, it is important that passengers understand how much using a taxi costs, or for drivers, how much a taxi fare will earn in money.</p><p>Knowing average' +
      ' fares between areas in the city is important for taxi drivers to estimate earnings of a fare. It also becomes important when analyzing the fares the any given driver may choose. ' +
      'Putting average fare data in conjunction with average trip times can help drivers get insight into how valuable certain taxi fares may be.</p><p>For example, knowing a fare from ' +
      '<a href="https://www.google.com/maps/dir/JFK+Airport,+NY/Whitestone,+Queens,+NY/@40.7165933,-73.9274732,11z/data=!3m1!4b1!4m13!4m12!1m5!1m1!1s0x89c26650d5404947:0xec4fb213489f11f0!2m2!1d-73.7781391!2d40.6413111!1m5!1m1!1s0x89c28aedbd3e263f:0xba6ad843be111724!2m2!1d-73.8095574!2d40.7920449">' +
      'JFK Airport, Queens to Whitestone, Queens</a> averages around $40.00, and takes approximately 25 minutes, can help a driver decide if that fare is earning enough for the amount of time ' +
      'required to complete it. This visualization can provide some insight for drivers on which trips are the most valuable in terms of the earned fare.</p><p>For passengers, this visualization ' +
      'is a means to estimate how much traveling between two zones can cost. The average fares can help taxi users budget their time and money for trips that may cost too much for them to afford, ' +
      'especially as a primary means of transportation.</p><p>This analysis can be taken further with a distribution map of trip origins and destinations across the city, as shown below.</p>'
  }, {
    attrName: 'count',
    minValue: 1,
    title: 'Trip Frequency',
    description: '<p>In this visualization, we show frequencies of origins and destinations for a specific zone. In short terms, this means that given a zone, we encode the color of other zones based on' +
      ' how often one of the two zones in a pair was the origin or destination of a taxi ride. These frequencies are based on counts of how many taxi trips we found in the original data that met the previously' +
      ' described conditions.</p><p>Taxi passengers can take this information into use when planning trips into or out of certain zones in the city. Zones that have higher frequencies have a higher probability' +
      ' of taxi presence, meaning travel in or out should be more accessible. However, this presence is based on the fact that there is a higher amount of people using taxis as their means of transportation, ' +
      'leading to a higher demand for taxis in that area.</p><p>Drivers can use the frequency map in understanding that given a taxi zone, how likely is it that a fare they pick up will take them to another ' +
      'specific zone. Combining this information with the fare price map, drivers can make better choices in the fares that they decide to pursue. If a specific fare between two zones pays well for the amount ' +
      'of time needed to complete it, but the likelihood of that fare happening is rare, it may not be worth the effort to prioritize serving that specific fare.</p><p>Overall, this view of the data helps the ' +
      'general viewers visualize which areas of the city have the largest dependence on taxis as a means of transportation. It provides insight into the usage of taxis around NYC, and may help in making ' +
      'changes to taxi rules and regulations depending on the needs of the people.</p>'
  }];

  // Margin amounts
  var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 30
  };

  margin.width = margin.left + margin.right;
  margin.height = margin.top + margin.bottom;

  d3.json('taxi_zones.json', function (taxiZones) {
    d3.json('data.json', function (taxiData) {
      taxiZones.features.forEach(function (feature) {
        var coords = [];

        /**
         * Finds the coordinates of the polygon object from the data and adds it to the coordinates property of the zone.
         *
         * @param obj The object to parse for the X and Y values of the polygon coordinate.
         */
        function findCoords(obj) {
          // Object is the point
          if (obj.length == 2 && !obj[0].length && !obj[1].length) {
            coords.push(obj);
          } else {
            // Object is higher level container
            for (var i = obj.length - 1; i >= 0; i--) {
              findCoords(obj[i]);
            }
          }
        }

        findCoords(feature.geometry.coordinates);
        feature.properties.center = [0, 0];

        // Get averaged center of polygon
        coords.forEach(function (coord) {
          feature.properties.center[0] += coord[0];
          feature.properties.center[1] += coord[1];
        });

        feature.properties.center[0] /= coords.length;
        feature.properties.center[1] /= coords.length;
      });

      // Taxi data attributes in index order
      var TAXI_ATTR_NAMES = ['count', 'time', 'fare'];

      /**
       * Returns the attribute from the data value.
       *
       * @param datum The data value to extract from.
       * @param attr The attribute name to extract.
       * @return the attribute value
       */
      function getTaxiAttr(datum, attr) {
        return datum[TAXI_ATTR_NAMES.indexOf(attr)];
      }

      /**
       * Returns the taxi data object for the month, first zone and second zone.
       *
       * @param month The month selected.
       * @param zone1 The first zone.
       * @param zone2 The second zone.
       * @return the datum object
       */
      function getTaxiDatum(month, zone1, zone2) {
        zone1 -= 1;
        zone2 -= 1;

        // Switch zones so we map lesser ID first
        if (zone1 > zone2) {
          zone1 ^= zone2;
          zone2 ^= zone1;
          zone1 ^= zone2;
        }
        return taxiData[month][zone1][zone2 - (zone1 + 1)];
      }

      var selectedMonth = 0;
      var selectedZone = 132;

      // Clear maps div on load
      $('#maps')
        .empty();

      // Enable slider view
      $monthSelector
        .css('visibility', 'visible');

      // Get update functions for each SVG canvas
      var updateCanvasFcns = TAXI_MAP_ATTRS.map(function (mapAttrData) {
        var mapAttrName = mapAttrData.attrName;

        // Add map to body
        var $mapBody = $('<div></div>')
          .addClass('map-body')
          .addClass(mapAttrName);

        // Add title text
        $mapBody.append($('<h2></h2>')
          .text(mapAttrData.title));

        // Add SVG
        var $canvas = $('<svg width="700pt" height="500pt"></svg>');
        $mapBody.append($canvas);

        // Add description text
        $mapBody.append($('<div class="map-description"></div>')
          .html(mapAttrData.description));

        $('#maps')
          .append($mapBody);

        var canvas = d3.select($canvas[0]);
        var canvasWidth = $canvas.width();
        var canvasHeight = $canvas.height();

        var minTaxiAttr = +Infinity;
        var maxTaxiAttr = -Infinity;

        // Get smallest and largest attribute
        taxiData.forEach(function (month, monthIdx) {
          month.forEach(function (zone1, zone1Idx) {
            zone1.forEach(function (zone2, zone2Idx) {
              var datum = zone2;
              if (getTaxiAttr(datum, 'count')) {
                var attrValue = getTaxiAttr(datum, mapAttrName);
                if (attrValue > 0) {
                  minTaxiAttr = Math.min(minTaxiAttr, attrValue);

                  // Clamp values of attributes
                  maxTaxiAttr = Math.max(maxTaxiAttr,
                    mapAttrName === 'time' ? 240 :
                    mapAttrName === 'fare' ? 200 :
                    attrValue);
                }
              }
            });
          });
        });

        // Draw map zones
        var geoPath = d3.geoPath(d3.geoMercator()
          .fitExtent([
            [margin.left, margin.top],
            [canvasWidth - margin.width, canvasHeight - margin.height]
          ], taxiZones));

        var taxiZoneGroups = canvas.append('g')
          .classed('taxi-zones', true)
          .selectAll('.taxi-zone')
          .data(taxiZones.features);

        taxiZoneGroups.enter()
          .append('g')
          .classed('taxi-zone', true)
          .append('path')
          .attr('d', geoPath)
          .on('mouseup', function (d) {
            selectedZone = d.properties['LocationID'];
            updateAllCanvases();
            d3.event.stopPropagation();
          })
          .on('mouseover', function (d) {
            tooltipZoneMouseOver(d);
          })
          .on('mousemove', function (d) {
            tooltipZoneMouseMove(d);
          })
          .on('mouseout', function (d) {
            tooltipMouseOut(d);
          });

        canvas.on('mouseup', function () {
          selectedZone = null;
          updateAllCanvases();
        });

        // Data attribute scale
        var attrScale = d3.scaleLog()
          .domain([mapAttrData.minValue, maxTaxiAttr])
          .range([0.05, 1.0]);

        /**
         * Selects a specific zone based on the ID and updates the maximum attribute value.
         *
         * @param zoneID The zone being selected.
         */
        function updateCanvas() {
          // Color zones based on data values
          var zones = canvas.selectAll('.taxi-zones .taxi-zone')
            .classed('selected', function (d) {
              return selectedZone === d.properties['LocationID'];
            })
            .classed('has-data', function (d) {
              var locID = d.properties['LocationID'];
              return selectedZone !== null && selectedZone !== locID && getTaxiAttr(getTaxiDatum(selectedMonth, selectedZone, locID), 'count');
            })
            .classed('no-data', function (d) {
              var locID = d.properties['LocationID'];
              return selectedZone !== null && selectedZone !== locID && !getTaxiAttr(getTaxiDatum(selectedMonth, selectedZone, locID), 'count');
            });

          // Set zone opacity
          zones.select('path')
            .attr('fill-opacity', function (d) {
              var locID = d.properties['LocationID'];

              // No zone selected
              if (selectedZone === null) return 0.3;

              // Selected zone
              if (selectedZone === locID) return 1.0;

              // Get data
              var taxiDatum = getTaxiDatum(selectedMonth, selectedZone, locID);

              // No data
              if (!getTaxiAttr(taxiDatum, 'count')) return 0.3;

              // Get appropriate attribute value
              var attrValue = getTaxiAttr(taxiDatum, mapAttrName);
              return attrScale(attrValue);
            });
        }

        /**
         * Adds the color scale based on color gradient of zones.
         */
        function addGradientScale() {
          var scaleWidth = 20;
          var scaleHeight = 200;

          // Make tick scale
          var legendScale = d3.scaleLog()
            .domain([mapAttrData.minValue, maxTaxiAttr])
            .range([canvasHeight / 2 - scaleHeight / 2, canvasHeight / 2 + scaleHeight / 2 - 1])

          var axis = d3.axisLeft(legendScale);

          // Time map
          if (mapAttrName === 'time') {
            axis.tickValues([5, 15, 30, 60, 120, 180, 240])
            axis.tickFormat(function (d) {
              // Set tick unit labels
              if (d < 60) return d + ' min' + (d == 1 ? '' : 's');
              else return (d / 60) + ' hr' + (d == 60 ? '' : 's');
            });
          } else if (mapAttrName === 'fare') {
            var ticks = [];

            // Add multiples of 1, 2, 5 to the tick values on log scale
            for (var i = Math.floor(Math.log10(mapAttrData.minValue)); i < Math.log10(maxTaxiAttr); i++) {
              if (Math.pow(10, i) >= mapAttrData.minValue && Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(Math.pow(10, i));
              }
              if (2 * Math.pow(10, i) >= mapAttrData.minValue && 2 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(2 * Math.pow(10, i));
              }
              if (5 * Math.pow(10, i) >= mapAttrData.minValue && 5 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(5 * Math.pow(10, i));
              }
            }

            axis.tickValues(ticks);

            // Format to USD units
            axis.tickFormat(function (d) {
              return '$' + Math.round(d);
            });
          } else if (mapAttrName === 'count') {
            var ticks = [];

            // Add multiples of 1, 2, 5 to the tick values on log scale
            for (var i = Math.floor(Math.log10(mapAttrData.minValue)); i < Math.log10(maxTaxiAttr); i++) {
              if (Math.pow(10, i) >= mapAttrData.minValue && Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(Math.pow(10, i));
              }
              if (2 * Math.pow(10, i) >= mapAttrData.minValue && 2 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(2 * Math.pow(10, i));
              }
              if (5 * Math.pow(10, i) >= mapAttrData.minValue && 5 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(5 * Math.pow(10, i));
              }
            }

            axis.tickValues(ticks);

            // Format normally
            axis.tickFormat(function (d) {
              return d;
            });
          }

          var defs = canvas.append('defs');

          // Add gradient color object
          var gradient = defs.append('linearGradient')
            .attr('id', 'gradient-scale-' + mapAttrName);

          // Set threshold range
          gradient
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

          // Add start and stop on gradient colors
          gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-opacity', attrScale.range()[0]);

          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-opacity', attrScale.range()[1]);

          // Add scale rectangles
          canvas.append('rect')
            .classed('legend', true)
            .attr('x', Math.floor(canvasWidth - (margin.right * 2)))
            .attr('y', canvasHeight / 2 - scaleHeight / 2)
            .attr('width', scaleWidth)
            .attr('height', scaleHeight)
            .attr('stroke', 'black')
            .attr('stroke-width', 0)
            .style('fill', 'url(#gradient-scale-' + mapAttrName + ')');

          canvas
            .append('g')
            .classed('legend-axis', true)
            .attr('transform', 'translate(' + Math.floor(canvasWidth - (margin.right * 2)) + ',0)')
            .attr('stroke-width', 1)
            .call(axis);

          // Add legend item for no data
          var legendNoData = canvas.append('g')
            .classed('legend-no-data', true)
            .attr('transform', 'translate(' + Math.floor(canvasWidth - (margin.right * 2)) + ',' + Math.floor(canvasHeight / 2 + scaleHeight / 2 + 15) + ')');

          legendNoData.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', scaleWidth)
            .attr('height', scaleWidth)
            .attr('fill', 'black')
            .attr('fill-opacity', 0.3);

          legendNoData.append('text')
            .text('No Data')
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'middle')
            .attr('x', -5)
            .attr('y', scaleWidth / 2)
            .attr('font-family', 'sans-serif')
            .attr('font-size', 10);
        }

        /**
         * Generates the tooltip text based on the view type.
         *
         * @param d The object being hovered over.
         * @return the display string
         */
        function tooltipText(d) {
          var attrstr = null;

          // There is a selected zone and we are not hovering over itself
          if (selectedZone !== null && selectedZone !== d.properties['LocationID']) {
            var datum = getTaxiDatum(selectedMonth, selectedZone, d.properties['LocationID']);
            var attrValue = getTaxiAttr(datum, mapAttrName);

            if (getTaxiAttr(datum, 'count')) {
              // Parse the time
              if (mapAttrName === 'time') {
                attrValue = Math.floor(attrValue);
                var mins = attrValue % 60;
                var hours = Math.floor(attrValue / 60);
                attrstr = '';

                // Display hours if present
                if (hours > 0) {
                  attrstr = hours + ' hr' + (hours === 1 ? '' : 's');
                }

                // Add space between hours and minutes
                if (hours > 0 && mins > 0) {
                  attrstr += ' ';
                }

                // Display minutes if present or if no hours
                if (mins > 0 || hours === 0) {
                  attrstr += mins + ' min' + (mins === 1 ? '' : 's');
                }
              } else if (mapAttrName === 'fare') {
                // Show fare average
                attrstr = '$' + (Math.round(attrValue * 100) / 100)
                  .toFixed(2);
              }
              else if (mapAttrName === 'count') {
                attrstr = attrValue;
              }
            }
            else {
              attrstr = 'No Data';
            }
          }
          return d.properties['zone'] +
            ', ' +
            d.properties['borough'] +
            (attrstr !== null ? ' (' + attrstr + ')' : '');
        }

        function tooltipZoneMouseOver(d) {
          tooltipMouseOver(d, d3.event, tooltipText(d));
        }

        function tooltipZoneMouseMove(d) {
          tooltipMouseMove(d, d3.event, tooltipText(d));
        }

        // Update on load
        updateCanvas(0, null);
        addGradientScale();

        // Return update function
        return updateCanvas;
      });

      /**
       * Updates all of the SVG elements on the page.
       */
      function updateAllCanvases() {
        updateCanvasFcns.forEach(function (updateCanvas) {
          updateCanvas();
        });
      }

      // Update map when month changes
      $monthInput.change(function () {
        selectedMonth = +$monthInput.val();
        updateAllCanvases();
      });
    });
  });

  // Tooltip
  var tooltip = d3.select('body')
    .append('div')
    .classed('tooltip', true);

  function tooltipSliderMouseOver(d, event) {
    tooltipMouseOver(d, event, MONTH_NAMES[+$monthInput.val()]);
  }

  function tooltipSliderMouseMove(d, event) {
    tooltipMouseMove(d, event, MONTH_NAMES[+$monthInput.val()]);
  }

  function tooltipMouseOver(d, event, text) {
    if (event == undefined) {
      event = d3.event;
    }

    tooltip
      .style('top', (event.pageY - 20) + 'px')
      .style('left', (event.pageX) + 'px')
      .text(text);

    tooltip.transition()
      .duration(100)
      .style('opacity', 1)
  }

  function tooltipMouseMove(d, event, text) {
    if (event == undefined) {
      event = d3.event;
    }

    tooltip
      .style('top', (event.pageY - 20) + 'px')
      .style('left', (event.pageX) + 'px')
      .text(text);
  }

  function tooltipMouseOut(d) {
    tooltip
      .transition()
      .duration(100)
      .style('opacity', 0)
  }
});
