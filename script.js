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

  var TAXI_MAP_ATTRS = [
    {
      attrName: 'time',
      title: 'Travel Time',
      description: 'some <b>HTML</b>'
    },
    {
      attrName: 'fare',
      title: 'Trip Fare',
      description: 'some <b>HTML</b>'
    },
    {
      attrName: 'count',
      title: 'Trip Frequency',
      description: 'some <b>HTML</b>'
    }
    ];

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
      var selectedZone = null;

      $('#maps').empty();
      var updateCanvasFcns = TAXI_MAP_ATTRS.map(function (mapAttrData) {
        var mapAttrName = mapAttrData.attrName;

        var $mapBody = $('<div></div>')
          .addClass('map-body')
          .addClass(mapAttrName);

        $mapBody.append($('<h2></h2>').text(mapAttrData.title));

        var $canvas = $('<svg width="800pt" height="500pt"></svg>');
        $mapBody.append($canvas);

        $mapBody.append($('<div></div>').html(mapAttrData.description));

        $('#maps').append($mapBody);

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
              var attrValue = getTaxiAttr(datum, mapAttrName);

              minTaxiAttr = Math.min(minTaxiAttr, attrValue);

              // TODO Remove this
              maxTaxiAttr = Math.max(maxTaxiAttr,
                mapAttrName === 'time' ? 240 :
                mapAttrName === 'fare' ? 200 :
                attrValue);
            });
          });
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

        var attrScale = d3.scaleLog()
          .domain([1.0, maxTaxiAttr])
          .range([0.2, 1.0])

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

          zones.select('path')
            .attr('fill-opacity', function (d) {
              var locID = d.properties['LocationID'];
              if (selectedZone === null) return 0.2;
              if (selectedZone === locID) return 1.0;
              var taxiDatum = getTaxiDatum(selectedMonth, selectedZone, locID);
              if (!getTaxiAttr(taxiDatum, 'count')) return 0.2;
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
            .domain([1.0, maxTaxiAttr])
            .range([canvasHeight / 2 - scaleHeight / 2, canvasHeight / 2 + scaleHeight / 2 - 1])

          var axis = d3.axisLeft(legendScale);
          if (mapAttrName === 'time') {
            axis.tickValues([1, 5, 15, 30, 60, 120, 180, 240])
            axis.tickFormat(function (d) {
              if (d < 60) return d + ' min' + (d == 1 ? '' : 's');
              else return (d / 60) + ' hr' + (d == 60 ? '' : 's');
            });
          }
          else if (mapAttrName === 'fare') {
            var ticks = [];
            for (var i = 0; i < Math.log10(maxTaxiAttr); i++) {
              ticks.push(Math.pow(10, i));
              if (2 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(2 * Math.pow(10, i));
              }
              if (5 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(5 * Math.pow(10, i));
              }
            }
            axis.tickValues(ticks);
            axis.tickFormat(function (d) {
              return '$' + Math.round(d);
            });
          }
          else if (mapAttrName === 'count') {
            var ticks = [];
            for (var i = 0; i < Math.log10(maxTaxiAttr); i++) {
              ticks.push(Math.pow(10, i));
              if (2 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(2 * Math.pow(10, i));
              }
              if (5 * Math.pow(10, i) <= maxTaxiAttr) {
                ticks.push(5 * Math.pow(10, i));
              }
            }
            axis.tickValues(ticks);
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
            // .attr('stop-color', 'darkgreen');

          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-opacity', attrScale.range()[1]);
            // .attr('stop-color', 'darkgreen');

          // Add scale rectangles
          canvas.append('rect')
            .attr('class', 'legend')
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
        }

        function tooltipText(d) {
          var attrstr = null;
          if (selectedZone !== null && selectedZone !== d.properties['LocationID']) {
            var datum = getTaxiDatum(selectedMonth, selectedZone, d.properties['LocationID']);
            var attrValue = getTaxiAttr(datum, mapAttrName);
            if (mapAttrName !== 'count') {
              if (getTaxiAttr(datum, 'count')) {
                if (mapAttrName === 'time') {
                  attrValue = Math.floor(attrValue);
                  var mins = attrValue % 60;
                  var hours = Math.floor(attrValue / 60);
                  attrstr = '';
                  if (hours > 0) {
                    attrstr = hours + ' hr' + (hours === 1 ? '' : 's');
                  }
                  if (hours > 0 && mins > 0) {
                    attrstr += ' ';
                  }
                  if (mins > 0 || hours === 0) {
                    attrstr += mins + ' min' + (mins === 1 ? '' : 's');
                  }
                }
                else if (mapAttrName === 'fare') {
                  attrstr = '$' + (Math.round(attrValue * 100) / 100).toFixed(2);
                }
              }
            }
            else {
              attrstr = attrValue;
            }
          }
          return d.properties['zone'] +
                 ', ' +
                 d.properties['borough'] +
                 (attrstr ? ' (' + attrstr + ')' : '');
        }

        function tooltipZoneMouseOver(d) {
          tooltipMouseOver(d, tooltipText(d));
        }

        function tooltipZoneMouseMove(d) {
          tooltipMouseMove(d, tooltipText(d));
        }

        function tooltipMouseOver(d, text) {
          tooltip
            .style('top', (d3.event.pageY - 20) + 'px')
            .style('left', (d3.event.pageX) + 'px')
            .text(text);

          tooltip.transition()
            .duration(200)
            .style('opacity', 1)
        }

        function tooltipMouseMove(d, text) {
          tooltip
            .style('top', (d3.event.pageY - 20) + 'px')
            .style('left', (d3.event.pageX) + 'px')
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

        return updateCanvas;
      });

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
    .attr('class', 'tooltip');
});
