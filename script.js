$(function () {

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

  $('input[type=range]').on('input', function () {
      $(this).trigger('change');
  });

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

      var TAXI_ATTR_NAMES = ['count', 'time', 'fare_base', 'fare_extra', 'fare_mta_tax', 'fare_tip', 'fare_tolls'];
      function getTaxiAttr(datum, attr) {
        return datum[TAXI_ATTR_NAMES.indexOf(attr)];
      }

      function getTaxiDatum(month, zone1, zone2) {
        zone1 -= 1;
        zone2 -= 1;
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
      taxiData.forEach(function (month) {
        month.forEach(function (zone1) {
          zone1.forEach(function (zone2) {
            var datum = zone2;
            minTaxiTime = Math.min(minTaxiTime, getTaxiAttr(datum, 'time'));
            maxTaxiTime = Math.max(maxTaxiTime, getTaxiAttr(datum, 'time'));
          });
        });
      });

      var selectedMonth = 0;
      var selectedZone = null;

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
            return time.average_time / maxTaxiTime;
          });
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
    });
  });

  // Tooltip
  var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');
});
