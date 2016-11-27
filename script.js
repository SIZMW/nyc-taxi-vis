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
  console.log(canvasWidth, canvasHeight);


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
        .attr('fill-opacity', function (d) { return Math.random(); });

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
