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
  $monthInput.change(function () {
    $monthNameLabel.text(MONTH_NAMES[+$monthInput.val()]);
  });
  $monthNameLabel.text(MONTH_NAMES[+$monthInput.val()]);

  // Margin amounts
  var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 30
  };

  margin.width = margin.left + margin.right;
  margin.height = margin.top + margin.bottom;

  var canvas = d3.select('#canvas');
  var canvasWidth = $('#canvas')
    .width();
  var canvasHeight = $('#canvas')
    .height();

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

      var minTaxiTime = +Infinity;
      var maxTaxiTime = -Infinity;

      // Get smallest and largest travel time
      taxiData.forEach(function (month, monthIdx) {
        month.forEach(function (zone1, zone1Idx) {
          zone1.forEach(function (zone2, zone2Idx) {
            var datum = zone2;
            minTaxiTime = Math.min(minTaxiTime, getTaxiAttr(datum, 'time'));

            // TODO Remove this
            if (getTaxiAttr(datum, 'time') > 240) {
              console.log(monthIdx + 1, zone1Idx + 1, zone2Idx + (zone1Idx + 1) + 1, datum);
            }

            // TODO Remove this
            maxTaxiTime = Math.max(maxTaxiTime, 240 /*getTaxiAttr(datum, 'time')*/ );
          });
        });
      });

      var selectedMonth = 0;
      var selectedZone = null;

      // Update map when month changes
      $monthInput.change(function () {
        selectedMonth = +$monthInput.val();
        updateCanvas();
      });

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
          updateCanvas();
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
        updateCanvas();
      });

      /**
       * Selects a specific zone based on the ID and updates the maximum time.
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

        zones.select('path')
          .attr('fill-opacity', function (d) {
            var locID = d.properties['LocationID'];
            if (selectedZone === null) return 0.2;
            if (selectedZone === locID) return 1.0;
            var taxiDatum = getTaxiDatum(selectedMonth, selectedZone, locID);
            if (!getTaxiAttr(taxiDatum, 'count')) return 0.2;
            var time = getTaxiAttr(taxiDatum, 'time');
            return time / maxTaxiTime;
          });
      }

      /**
       * Adds the color scale based on color gradient of zones.
       */
      function addGradientScale() {
        var defs = canvas.append('defs');

        // Add gradient color object
        var gradient = defs.append('linearGradient')
          .attr('id', 'gradient-scale');

        var scaleWidth = 20;
        var scaleHeight = 200;
        var minToHrConvert = 60;

        // Make tick scale
        var legendScale = d3.scalePoint()
          .domain([minTaxiTime / minToHrConvert, maxTaxiTime / minToHrConvert])
          .range([canvasHeight / 2 + scaleHeight / 2 - 1, canvasHeight / 2 - scaleHeight / 2])

        var axis = d3.axisLeft(legendScale);
        axis.tickFormat(function (d, i) {
          return d + ' hrs';
        });

        // Set threshold range
        gradient
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%")
          .attr("y2", "100%");

        // Add start and stop on gradient colors
        gradient.append("stop")
          .attr("offset", "0%")
          .attr('stop-opacity', 0.0)
          .attr("stop-color", "darkgreen");

        gradient.append("stop")
          .attr("offset", "100%")
          .attr('stop-opacity', 1.0)
          .attr("stop-color", "darkgreen");

        // Add scale rectangles
        canvas.append('rect')
          .attr('class', 'legend')
          .attr('x', Math.floor(canvasWidth - (margin.right * 2)))
          .attr('y', canvasHeight / 2 - scaleHeight / 2)
          .attr('width', scaleWidth)
          .attr('height', scaleHeight)
          .attr('stroke', 'black')
          .attr('stroke-width', 0)
          .style('fill', 'url(#gradient-scale)');

        canvas
          .append('g')
          .classed('legend-axis', true)
          .attr('transform', 'translate(' + Math.floor(canvasWidth - (margin.right * 2)) + ',0)')
          .attr('stroke-width', 1)
          .call(axis);
      }

      function tooltipZoneMouseOver(d) {
        tooltipMouseOver(d, d.properties['zone'] + ', ' + d.properties['borough'] + ' (' + d.properties['LocationID'] + ')');
      }

      function tooltipZoneMouseMove(d) {
        tooltipMouseMove(d, d.properties['zone'] + ', ' + d.properties['borough'] + ' (' + d.properties['LocationID'] + ')');
      }

      function tooltipMouseOver(d, text) {
        tooltip
          .style('top', (d3.event.pageY - 20) + "px")
          .style('left', (d3.event.pageX) + "px")
          .text(text);

        tooltip.transition()
          .duration(200)
          .style('opacity', 1)
      }

      function tooltipMouseMove(d, text) {
        tooltip
          .style('top', (d3.event.pageY - 20) + "px")
          .style('left', (d3.event.pageX) + "px")
          .text(text);
      }

      function tooltipMouseOut(d) {
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0)
      }

      updateCanvas(0, null);
      addGradientScale();
    });
  });

  // Tooltip
  var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');
});
