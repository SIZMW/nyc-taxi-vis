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
    d3.text('taxi_zones.prj', function (projSpec) {
      var coordProj = proj4(projSpec);

      taxiZones.features.forEach(function (feature) {
        function convert(obj) {
          if (obj.length == 2 && !obj[0].length && !obj[1].length) {
            return coordProj.inverse(obj);
          }
          else {
            for (var i = obj.length - 1; i >= 0; i--) {
              obj[i] = convert(obj[i]);
            }
            return obj;
          }
        }

        feature.geometry.coordinates = convert(feature.geometry.coordinates);
      });

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

      var maxZoneDistance = -Infinity;

      taxiZones.features.forEach(function (feature) {
        feature.properties.distanceData = {};
        taxiZones.features.forEach(function (feature2) {
          if (feature2 === feature) return;
          var dx = feature.properties.center[0] - feature2.properties.center[0];
          var dy = feature.properties.center[1] - feature2.properties.center[1];
          var dist = Math.sqrt(dx * dx + dy * dy);
          feature.properties.distanceData[feature2.properties['LocationID']] = dist;
          if (dist > maxZoneDistance) maxZoneDistance = dist;
        });
      });

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
        .on('click', function (d) {
          selectZone(d.properties['LocationID']);
          d3.event.stopPropagation();
        });

      canvas.on('click', function () {
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
            return d.properties.distanceData[zoneID] / maxZoneDistance;
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
