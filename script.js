$(function () {
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

  // TODO Temporary month selection
  var MONTH = 6;

  d3.json('taxi_zones.json', function (taxiZones) {
    d3.json('data.json', function (taxiTimes) {
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

      var maxTaxiTime = -Infinity;
      var minTaxiTime = Infinity;

      // Get smallest and largest travel time
      Object.values(taxiTimes)
        .forEach(function (zone1) {
          Object.values(zone1)
            .forEach(function (time) {
              maxTaxiTime = Math.max(maxTaxiTime, time[MONTH].average_time);
              minTaxiTime = Math.min(minTaxiTime, time[MONTH].average_time);
            });
        });

      /**
       * Returns the time from one zone to another.
       *
       * @param zone1 The first zone.
       * @param zone2 The second zone.
       */
      function getTaxiTime(zone1, zone2) {
        if (taxiTimes[zone1] && taxiTimes[zone1][zone2]) return taxiTimes[zone1][zone2][MONTH];
        if (taxiTimes[zone2] && taxiTimes[zone2][zone1]) return taxiTimes[zone2][zone1][MONTH];
        return undefined;
      }

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
          selectedZoneID = d.properties['LocationID'];
          selectZone(d.properties['LocationID']);
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
        selectZone(null);
      });

      /**
       * Selects a specific zone based on the ID and updates the maximum time.
       *
       * @param zoneID The zone being selected.
       */
      function selectZone(zoneID) {
        if (taxiTimes[zoneID]) {
          var maxTaxiTime = -Infinity;
          Object.values(taxiTimes[zoneID])
            .forEach(function (time) {
              maxTaxiTime = Math.max(maxTaxiTime, time[MONTH].average_time);
            });
        }

        // Color zones based on data values
        var zones = canvas.selectAll('.taxi-zones .taxi-zone')
          .classed('selected', function (d) {
            return zoneID === d.properties['LocationID'];
          })
          .classed('has-data', function (d) {
            return zoneID !== null && zoneID !== d.properties['LocationID'] && getTaxiTime(zoneID, d.properties['LocationID']);
          })
          .classed('no-data', function (d) {
            return zoneID !== null && zoneID !== d.properties['LocationID'] && !getTaxiTime(zoneID, d.properties['LocationID']);
          });

        zones.select('path')
          .attr('fill-opacity', function (d) {
            if (zoneID === null) return 0.2;
            if (zoneID === d.properties['LocationID']) return 1.0;
            var time = getTaxiTime(zoneID, d.properties['LocationID']);
            if (time === undefined) return 0.2;
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

      selectZone(null);
    });
  });

  // Tooltip
  var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');
});
