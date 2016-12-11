class NavigationView {
  constructor(id) {
    this.svg = d3.select("#"+id);
    this.margin = {top: 20, right: 80, bottom: 30, left: 50},
    this.width = $('#'+id).width() - this.margin.left - this.margin.right,
    this.height = $('#'+id).height() - this.margin.top - this.margin.bottom,
    this.g = this.svg.append("g").attr(
      "transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  }

  loadData(data) {
    const unitWidth = 18;
    const unitMargin = 2;
    const values = [];
    data.forEach(function(d) {
      values.push(parseInt(d.value));
    });
    const scale = d3.scaleLinear().domain(d3.extent(values)).range([0.2,1]);

    const legend = this.g.selectAll(".timeunit")
       .data(data)
     .enter().append("g")
       .attr("class", "timeunit")
       .attr("transform", function(d, i) { return "translate(" + i * (unitWidth + unitMargin)+",0)"; });

    legend.append("rect")
        .attr("x", 0)
        .attr("width", unitWidth)
        .attr("height", unitWidth)
        .style("fill", "green")
        .attr("opacity", function(d) {
          return scale(d.value);
        });

    legend.append("text")
        .attr("x", 0)
        .attr("y", unitWidth+unitMargin)
        .attr("dy", ".35em")
        .style("alignment-baseline", "text-before-edge")
        .text(function(d,i) { if (i%5==0 || i==values.length-1) return d.date;})
  }
}

class LineView {
  constructor(id) {
    this.svg = d3.select("#" + id),
    this.margin = {top: 20, right: 80, bottom: 30, left: 50},
    this.width = $("#" + id).width() - this.margin.left - this.margin.right,
    this.height = $("#" + id).height() - this.margin.top - this.margin.bottom,
    this.g = this.svg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
    this.parseTime = d3.timeParse("%Y");

    this.x = d3.scaleTime().range([0, this.width]),
    this.y = d3.scaleLinear().range([this.height, 0]),
    this.z = d3.scaleOrdinal(d3.schemeCategory20);

    this.line = d3.line()
        .x(function(d) { return this.x(d.date); }.bind(this))
        .y(function(d) { return this.y(d.value); }.bind(this));

  }

  loadData(data) {
    var keywords = [];
    var keywordset = {};
    var dates = [];
    data.forEach(function(d) {
      if (!(d.key in keywordset)) {
        keywords.push({
          key: d.key,
          values: [],
        });
        keywordset[d.key] = keywords.length-1;
      }
      keywords[keywords.length-1].values.push({
        date: this.parseTime(d.date),
        value: parseInt(d.value),
      });
      dates.push(this.parseTime(d.date));
    }, this);

    this.x.domain(d3.extent(dates, function(d) { return d; }));

    this.y.domain([
      d3.min(keywords, function(c) { return d3.min(c.values, function(d) { return d.value; }); }),
      d3.max(keywords, function(c) { return d3.max(c.values, function(d) { return d.value; }); })
    ]);
    this.z.domain(keywords.map(function(c) { return c.key}));

    this.g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(this.x));

    this.g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(this.y))
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("fill", "#000")
        .text("Count");

    const keyword = this.g.selectAll(".city")
      .data(keywords)
      .enter().append("g")
        .attr("class", "city");

    keyword.append("path")
        .attr("class", "line")
        .attr("d", function(d) { return this.line(d.values); }.bind(this))
        .style("stroke", function(d) { return this.z(d.key); }.bind(this));

    keyword.append("text")
        .datum(function(d) { return {key: d.key, value: d.values[d.values.length - 1]}; })
        .attr("transform", function(d) {
          return "translate(" + this.x(d.value.date) + "," + this.y(d.value.value) + ")"; 
        }.bind(this))
        .attr("x", 3)
        .attr("dy", "0.35em")
        .style("font", "10px sans-serif")
        .text(function(d) { return d.key; });
  }
}

const navView = new NavigationView('navigation-view');
d3.csv("mySum.csv", function(data) {
  navView.loadData(data);
});
const lineView = new LineView('line-view');
d3.csv("mydata2.csv", function(data) {
  lineView.loadData(data);
});
