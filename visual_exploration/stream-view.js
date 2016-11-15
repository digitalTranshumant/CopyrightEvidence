(function() {
    var svg_width = 1024;
    var width = svg_width - 50;
    var svg_height = 500;
    var height = svg_height - 60;
    var n_layers = 5;
    var interpolation = 'cardinal';
    var offset = 'base';
    var variable = 'entity_count';

    // husl
    var palette= ['#320a5e', '#781c6d', '#bc3754', '#ed6925', '#fbb61a']

    var stream = {};

    stream.render_items = function (items) {
        console.info('items', items);
        var self = this;

        require(['d3', 'legend'], function (d3, d3legend) {
            var vocabulary = {};
            var all_words = {};
            var yearly_count = {};

            // some articles have invalid years...
            var nested = d3.nest()
                .key(function (d) { return +d.year; })
                .entries(items.filter(function(d) { return +d.year > 0; }));

            nested.forEach(function (d) {
                var year = +d.key;
                var items = d.values;
                var wordcounts = {};
                items.forEach(function (item) {
                    if (!item.hasOwnProperty('abstract') || typeof item.abstract != 'string') {
                        return;
                    }

                    d3.entries(item[variable]).forEach(function (d) {
                        if (!vocabulary.hasOwnProperty(d.key)) {
                            vocabulary[d.key] = {};
                        }

                        vocabulary[d.key].hasOwnProperty(year) ?
                            vocabulary[d.key][year] += d.value :
                            vocabulary[d.key][year] = d.value;

                        all_words.hasOwnProperty(d.key) ?
                            all_words[d.key] += d.value :
                            all_words[d.key] = d.value;
                    });
                });
            });

            //console.log('all words', d3.entries(all_words).sort(function(a, b) { return d3.descending(a.value,
            // b.value); }).slice(5));
            var interesting_words = d3.set(
                d3.entries(all_words)
                .sort(function(a, b) { return d3.descending(a.value, b.value); })
                .slice(0, n_layers)
                .map(function(d) { return d.key; })
            );
            console.log('interesting words', interesting_words);


            var word_layers = [];
            var years = nested.map(function(d) { return +d.key; });

            d3.keys(vocabulary).forEach(function(word) {
                years.forEach(function(year) {
                    if (!vocabulary[word].hasOwnProperty(year)) {
                        vocabulary[word][year] = 0;
                    }
                })
            });

            console.info('vocabulary', vocabulary);

            var x_position = d3.scale.linear()
                .domain(years)
                .range([0, width]);

            var layers = d3.entries(vocabulary)
                .filter(function(d) { return interesting_words.has(d.key); })
                .map(function(d) {
                    var values = d3.entries(d.value);
                    var max_year = years[0];
                    var max_value = values[0].value;

                    values.forEach(function(v) {
                        v.x = +v.key;
                        v.y = v.value;
                        if (v.value > max_value) {
                            max_year = v.x;
                            max_value = v;
                        }
                    });
                    return {key: d.key, values: values, 'max_year': max_year, 'max_value': max_value};
                });

            console.log('layers', layers.length, layers[0]);
            var n = layers.length; //num de series
            var m = years.length; // num de instantes de tiempo
            var stack = d3.layout.stack()
                .offset(offset)
                .values(function (d) { return d.values; });

            var layers = stack(layers);
            console.log('stacked layers', layers);

            var max_height_layers = d3.max(layers, function (d) {
                return d3.max(d.values, function (d) {
                    return d.y0 + d.y;
                });
            });
            console.log(max_height_layers);

            var color = d3.scale.ordinal()
                .range(palette)
                .domain(interesting_words.values());

            var x = d3.scale.linear()
                .domain(d3.extent(years))
                .range([0, width]);

            var x_axis = d3.svg.axis()
                .scale(x)
                .orient("bottom");
                //.ticks(d3.time.minutes, 60)
                //.tickFormat(d3.time.format("%H:%M"));

            var y = d3.scale.linear()
                .domain([0, max_height_layers])
                .range([height, 0]);

            var y_axis = d3.svg.axis()
                .scale(y)
                .orient("right");

            var area = d3.svg.area()
                .interpolate(interpolation)
                .x(function (d) { return x(d.x); })
                .y0(function (d) { return y(d.y0); })
                .y1(function (d) { return y(d.y0 + d.y); });

            var container = d3.select(self._dom.plotContainer)
                .selectAll('svg.stream')
                .data([1]);

            container.enter().append('svg')
                .classed('stream', 1)
                .attr({'width': svg_width, 'height': svg_height})
                .append("g")
                .classed('main_canvas', true)
                .attr('transform', 'translate(' + [(svg_width - width) * 0.5, (svg_height - height) * 0.5] + ')');

            var svg = container.select('g.main_canvas');

            var stream_p = svg.selectAll("path")
                .data(layers, function(d) { return d.key; })

            stream_p.enter().append("path").attr('opacity', 0);

            stream_p
                .transition(500)
                .attr("d", function (d) { return area(d.values); })
                .style("fill", function (d) { return color(d.key); })
                .attr("opacity", 1);

            stream_p.exit().transition(500).attr('opacity', 0).remove();

            var legend_g = container.selectAll('g.legend')
                .data([1]);

            legend_g.enter()
                .append("g")
                .attr("class", "legend");

            console.log('legend', legend_g.node().getBBox());

            var legendOrdinal = d3legend.color()
                .shapePadding(100)
                .scale(color)
                .orient('horizontal');

            legend_g
                .call(legendOrdinal)
                .attr("transform", function() {
                    var bbox = this.getBBox();
                    var w = (width - bbox.width) * 0.5;
                    return "translate(" + [w,20] + ")";
                });

            var axis_x = svg.selectAll("g.x_axis")
                .data([1]);

            axis_x.enter().append('g').classed('x_axis axis', true);

            axis_x.attr("transform", "translate(0," + (height) + ")")
                  .call(x_axis);

            var axis_y = svg.selectAll("g.y_axis")
                .data([1]);

            axis_y.enter().append('g').classed('y_axis axis', true);

            axis_y.attr("transform", "translate(" + (width) + ",0)")
                  .call(y_axis);

        });
    };

    Exhibit.VisExtension.build_view('Streamgraph', stream);
}());