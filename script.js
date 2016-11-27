// Margin amounts
var margin = {
  top: 20,
  right: 20,
  bottom: 30,
  left: 30
};

var canvasWidth = 1000;
var canvasHeight = 500;

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
    var svg = d3.select('#canvas')
      .attr('width', canvasWidth)
      .attr('height', canvasHeight);

    if (error) {
      console.log('Read error');
      return;
    }

    console.log(data);
  });
}

loadTSV();
