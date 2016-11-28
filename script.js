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

  var canvasWidth = $('#canvas').width();
  var canvasHeight = $('#canvas').height();


  d3.json('taxi_zones.json', function (taxiZones) {
    d3.json('data.json', function (taxiTimes) {
      taxiZones.features.forEach(function (feature) {
        var coords = [];

        function findCoords(obj) {
          if (obj.length == 2 && !obj[0].length && !obj[1].length) {
            coords.push(obj);
          }
          else {
            for (var i = obj.length - 1; i >= 0; i--) {
              findCoords(obj[i]);
            }
          }
        }

        findCoords(feature.geometry.coordinates);

        feature.properties.center = [0, 0];
        coords.forEach(function (coord) {
          feature.properties.center[0] += coord[0];
          feature.properties.center[1] += coord[1];
        });
        feature.properties.center[0] /= coords.length;
        feature.properties.center[1] /= coords.length;
      });

      var maxTaxiTime = -Infinity;
      var minTaxiTime = Infinity;

      Object.values(taxiTimes).forEach(function (zone1) {
        Object.values(zone1).forEach(function (time) {
          maxTaxiTime = Math.max(maxTaxiTime, time.average);
          minTaxiTime = Math.min(minTaxiTime, time.average);
        });
      });

      function getTaxiTime(zone1, zone2) {
        if (taxiTimes[zone1] && taxiTimes[zone1][zone2]) return taxiTimes[zone1][zone2];
        if (taxiTimes[zone2] && taxiTimes[zone2][zone1]) return taxiTimes[zone2][zone1];
        return undefined;
      }

      var geoPath = d3.geoPath(d3.geoMercator()
        // .parallels([40.4, 40.9])
        // .center([-73.919142, 40.768916])
        // .scale(20000)
        // .translate([canvasWidth / 2, canvasHeight / 2]);
        .fitExtent([[margin.left, margin.top], [canvasWidth - margin.width, canvasHeight - margin.height]], taxiZones));

      // console.log(geoPath(taxiZones));

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
          selectZone(d.properties['LocationID']);
          d3.event.stopPropagation();
        });

      canvas.on('mouseup', function () {
        selectZone(null);
      });

      function selectZone(zoneID) {
        var zones = canvas.selectAll('.taxi-zones .taxi-zone')
          .classed('selected', function (d) {
            return zoneID === d.properties['LocationID'];
          });
        zones.select('path')
          .attr('fill-opacity', function (d) {
            if (zoneID === null) return 0.5;
            if (zoneID === d.properties['LocationID']) return 1.0;
            var time = getTaxiTime(zoneID, d.properties['LocationID']);
            if (time === undefined) return 0.0;
            return time.average / maxTaxiTime;
          });
      }
      selectZone(null);
    });
  });



  // Tooltip
  var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  /**
   * Loads the data file.
   */
  function loadTSV() {
    d3.tsv('data.tsv', function(d) {
      return d;
    }, function(error, data) {

      if (error) {
        console.log('Read error');
        return;
      }

      console.log(data);
    });
  }

  // loadTSV();

});
