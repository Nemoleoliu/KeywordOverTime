const margin = {top: 20, right: 30, bottom: 30, left: 50};
// var contentFilter = [];
// initFilter(contentFilter,"Use content to filter the dataset...", "contentFilter");

function initFilter(dataset, placeholder, containerName){
  var list = d3.select("#" + containerName).select(".filterList").select("h5");
  var container = $("#"+containerName);
  container.find(".filterInput").attr("placeholder", placeholder);
  container.find(".filterButton").click(
    function handleClick(event){
      appendNewValue(container.find(".filterInput.tt-input").val());
      container.find(".filterInput.tt-input").val("");
    }
  )

  function appendNewValue(val){
    if (dataset.includes(val)) return;
    dataset.push(val);
    render();
  }

  function render(){
    var listItem = list.selectAll("span")
            .data(dataset);
    var listItemEnter = listItem.enter()
      .append("span")
      .attr("class","tag tag-warning")
      .on('click', function(d,i){
        removeItem(d);
      });
    listItem.merge(listItemEnter).text(function(d,i){return d;});
    listItem.exit().remove();
  }

  function removeItem(key){
    dataset.splice(dataset.indexOf(key), 1);
    render();
  }

  function highlight(name,id){
    list.selectAll("span")
      .style("background-color", function(d, i){
        return i == id ? "black": undefined
      })
      .style("color", function(d, i){
        return i == id ? "white": undefined
      })
  }

  function unhighlight(){
    list.selectAll("span")
      .style("background-color", undefined)
      .style("color", undefined)
  }
}
class KeywordData {
  constructor() {
    this._timerange = [];
    this._keywords = [];
    this._dates = [];
    this._kw_index = new Map();
    this._date_sum = [];
    this._date_kw = new Map();
    this._kw_date = [];
    this._kw_date_ranking = [];
    this._date_kw_ranking = new Map();
    this._initialized = false;
  }

  updateData(dst, src) {
    dst.length = 0;
    $.each(src, function(i, d) {
      dst.push(d);
    })
  }

  load(data) {
    const self = this;
    this._timerange.length = 0;
    this._keywords.length = 0;
    this._kw_index.clear();
    this._date_sum.length = 0;
    this._date_kw.clear();
    this._kw_date.length = 0;
    this._kw_date_ranking.length = 0;
    this._date_kw_ranking.clear();

    this.updateData(this._timerange, data.timerange);
    this.updateData(this._keywords, data.keywords);
    this._timeunit =  data.timeunit;

    // init time interval
    if (this._timeunit == 'year') {
      this._time_interval = d3.timeYear;
    } else {
      this._time_interval = d3.timeInterval(
        function(date) {
          let m = date.getTime();
          date.setTime(m - m % self._timeunit);
        },
        function(date, offset) {
          let m = date.getTime();
          date.setTime(m + offset * self._timeunit);
        },
        function(start, end) {
          return (end.getTime() - start.getTime()) / self._timeunit;
        }
      );
    }
    // init color scale
    this._colorScale = d3.scaleOrdinal(d3.schemeCategory20).domain(this._keywords);
    this._dates = [];

    $.each(data.data, function(i, d) {
      self._dates.push(d.date);
      self._date_kw.set(d.date, d);
    });
    this._dates.sort();
    $.each(this._dates, function(i, date) {
      self._date_sum.push({
        date: date,
        value: d3.sum(self._date_kw.get(date).values)
      });
    })
    // init kw_date
    $.each(this._keywords, function(i, kw) {
      self._kw_index.set(kw, i);
      self._kw_date.push({
        key: self._keywords[i],
        values: [],
      });
    });

    $.each(this._dates, function(index, dd) {
      let d = self._date_kw.get(dd);
      $.each(d.values, function(i, v) {
        self._kw_date[i].values.push({
          date: d.date,
          value: v,
        });
      });
    });

    $.each(self._keywords, function(i, kw) {
      self._kw_date_ranking.push({
        key: self._keywords[i],
        values: [],
      });
    });
    $.each(this._dates, function(index, date) {
      let d = self._date_kw.get(date);
      const len = d.values.length;
      const indices = new Array(len);
      const indexes = new Array(len);
      for (let i = 0; i < len; ++i) indices[i] = i;
      indices.sort(function (a, b) {
        if (d.values[a] > d.values[b]) return -1;
        if (d.values[a] < d.values[b]) return 1;
        return d3.ascending(self._keywords[a], self._keywords[b]);
      });
      const rankings = new Array(len);
      $.each(indices, function(i, v) {
        rankings[indices[i]] = i;
      });
      self._date_kw_ranking.set(date, {
        date: date,
        values: rankings
      });
      let rank = 0;
      $.each(indices, function(i, v) {
        self._kw_date_ranking[v].values.push({
          date: date,
          value: i,
        });
      });
    });
    this._highlight_kw = null;
    this.subrange = null;
    this._initialized = true;
    if (this.dataDidLoad) this.dataDidLoad();
  }

  get initialized() { return this._initialized; }
  get timerange() { return this._timerange; }
  get time_interval() { return this._time_interval; }
  get keywords() { return this._keywords; }
  get kw_index() { return this._kw_index; }
  get date_kw() { return this._date_kw; }
  get date_sum() { return this._date_sum; }
  get kw_date() { return this._kw_date; }
  get colorScale() { return this._colorScale; }
  get kw_date_ranking() { return this._kw_date_ranking; }
  get date_kw_ranking() { return this._date_kw_ranking; }
  // get timeunit() { return this._timeunit; }
  get subrange_sum() { return this._subrange_sum; }
  get subrange_sum_ranking() { return this._subrange_sum_ranking; }

  set x(value) {
    this._x = value;
  }
  get x() {
    const self = this;
    if (!this._x) return this._x;
    // set x-date range
    if (this.subrange) {
      this._x.domain(this.subrange);
    } else {
      this._x.domain(this.timerange);
    }
    return this._x;
  }

  set y(value) { this._y = value; }
  get y() { return this._y; }

  set cursor(value) {
    this._cursor = value;
    if (this.cursorDidUpdate) this.cursorDidUpdate();
  }
  get cursor() { return this._cursor; }
  get cursor_date() {
    if (this._cursor == null || this.x == null) return null;
    const cd = this._x.invert(this._cursor[0]);
    return this.time_interval.floor(cd).valueOf();
  }

  set highlight_kw(value) {
    this._highlight_kw = value;
    if (this.highlightDidUpdate) this.highlightDidUpdate();
  }
  get highlight_kw() { return this._highlight_kw; }

  set visible_ranking_range(value) {
    this._visible_ranking_range = value;
    if (this.visibleRangeDidUpdate) this.visibleRangeDidUpdate();
  }
  get visible_ranking_range() { return this._visible_ranking_range; }

  set subrange(value) {
    this._subrange = value;
    const self = this;
    if (!value) {
      value = this.timerange;
      if (!this.timerange) return;
    }

    const indices = new Array(this.keywords.length);
    $.each(indices, function(i, d) {
      indices[i] = i;
    });
    this._subrange_sum = new Array(this.keywords.length);
    this._subrange_sum.fill(0);
    $.each(this._dates, function(i, date) {
      if (date >= value[0] && date<= value[1]) {
        $.each(self._date_kw.get(date).values, function(i, c) {
          self._subrange_sum[i] = self._subrange_sum[i] + c;
        });
      }
    });
    indices.sort(function (a, b) {
      return self._subrange_sum[a] > self._subrange_sum[b] ? -1 : self._subrange_sum[a] < self._subrange_sum[b] ? 1 : 0;
    });
    this._subrange_sum_ranking = new Array(this.keywords.length);
    $.each(indices, function(i, v) {
      self._subrange_sum_ranking[indices[i]] = i;
    });

    if (this.subrangeDidUpdate) this.subrangeDidUpdate();
  }
  get subrange() { return this._subrange; }
}

class CursorView {
  constructor(id) {
    const self = this;
    this.svg = d3.select('#' + id);
    this.width = $('#'+id).width() - margin.left - margin.right;
    this.height = $('#'+id).height() - margin.top - margin.bottom;
    this.g = this.svg.append("g").attr('class', 'cursor-view').attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");
    this.gCursor = this.g.append('g').attr('class', 'gCursor');
    const bg = this.gCursor.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('visibility', 'hidden');
    this.cursor = this.gCursor.append('rect')
      .attr('width', 2)
      .attr('height', this.height)
      .attr('fill', 'red')
      .attr('visibility', 'hidden')
      .style('pointer-events', 'none');
    d3.select(window).on("mousemove", mousemove);
    function mousemove(d, i) {
      const coord = d3.mouse(bg.node());
      if (coord[0] >= 0 && coord[0] <= self.width && coord[1] >= 0 && coord[1] <= self.height) {
        self.cursor.attr('x', coord[0]).attr('visibility','visible');
        if (self.kwd) {
          self.kwd.cursor = coord;
        }
      } else {
        self.cursor.attr('visibility','hidden');
        if (self.kwd)
          self.kwd.cursor = null;
      }
    };
  }

  bindData(kwd) {
    this.kwd = kwd;
  }

  update() {
    if (!this.kwd.initialized) return;
    this.cursor.attr('visibility', 'visible');
  }
}

class NavigationView {
  constructor(id) {
    const self = this;
    this.width = $('#'+id).width() - margin.left - margin.right,
    this.height = $('#'+id).height() - margin.top - margin.bottom,
    this.svg = d3.select("#"+id).append("g").attr(
      "transform", "translate(" + margin.left + "," + margin.top + ")");
    this.brushed = function() {
      if (d3.event.sourceEvent.type === "brush") return;
      let d1 = null;
      if (d3.event.selection !== null) {
        let d0 = d3.event.selection.map(self.x.invert);
        d1 = d0.map(self.kwd.time_interval.round);
        // If empty when rounded, use floor instead.
        if (d1[0] >= d1[1]) {
          d1[0] = self.kwd.time_interval.floor(d0[0]);
          d1[1] = self.kwd.time_interval.offset(d1[0]);
        }
        d3.select(this).call(d3.event.target.move, d1.map(self.x));
      }
      if (self._brushDidRefresh) {
        self._brushDidRefresh(d1);
      }
    };
    this.brushEnd = function() {
      if (d3.event.selection === null) {
        if (self._brushDidRefresh) {
          self._brushDidRefresh(null);
        }
      }
    }
    this.y = d3.scaleLinear().range([this.height, 0]);
    this.x = d3.scaleTime().range([0, this.width]);
  }

  set brushDidRefresh(value) {
    this._brushDidRefresh = value;
  }

  get brushDidRefresh() {
    return this._brushDidRefresh;
  }

  bindData(kwd) {
    this.kwd = kwd;
  }

  update() {
    if (!this.kwd.initialized) return;
    const self = this;
    this.x.domain(this.kwd.timerange.map(function(d) { return new Date(d); }))
    this.x.ticks(self.kwd.time_interval.every(1));
    this.y.domain([0, d3.max(self.kwd.date_sum, function(d) {
      return d.value;
    })]);

    this.svg.selectAll('*').remove();

    this.svg.append("g")
    .attr("class", "axis axis--grid")
    .attr("transform", "translate(0," + this.height + ")")
    .call(d3.axisBottom(this.x)
        .ticks(self.kwd.time_interval)
        .tickSize(-this.height)
        .tickFormat(function() { return null; }));

    this.svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(this.x)
            .ticks(10))
        .selectAll('path.domain').classed('brush', true);

    const brush = this.svg.append("g")
      .attr("class", "brush")
      .call(d3.brushX()
          .extent([[0, 0], [this.width, this.height]])
          .on("brush", this.brushed)
          .on('end', this.brushEnd)
      );
    const line = d3.line()
      .x(function(d) { return self.x(d.date); })
      .y(function(d) { return self.y(d.value); });
    brush.append("path")
      .datum(self.kwd.date_sum)
      .attr("class", "line")
      .attr("d", line)
      .attr('stroke', 'grey')
      .attr('stroke-width', '1px');

  }
}

class LineView {
  constructor(id) {
    const self = this;
    this.svg = d3.select("#" + id);
    this.width = $("#" + id).width() - margin.left - margin.right;
    this.height = $("#" + id).height() - margin.top - margin.bottom;
    this.g = this.svg.append("g").attr('class', 'line-view').attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");
    this.clip = this.g.append("defs").append("svg:clipPath")
      .attr("id", "clip1")
      .append("svg:rect")
      .attr("id", "clip-rect")
      .attr("x", "0")
      .attr("y", "0")
      .attr("width", this.width)
      .attr("height", this.height);
    this.brushed = function() {
      if (d3.event.sourceEvent.type === "brush") return;
      if (d3.event.selection === null) return;
      var d0 = d3.event.selection.map(self.x.invert);
      var d1 = d0.map(function(d){
        return self.kwd.time_interval.round(d);
      });
      d3.select(this).call(d3.event.target.move, d1.map(self.x));
      if (self._brushDidRefresh) {
        self._brushDidRefresh([self.x(d1[0]),self.x(d1[1])]);
      }
    };
    this.brush = d3.brushX()
        .extent([[0, 0], [this.width, this.height]])
        .on("brush", this.brushed);
    this.gBrush = this.g.append("g")
      .attr("class", "brush")
      .call(this.brush);
    this.gLine = this.g.append("g").attr('class', 'gLine').attr("clip-path", "url(#clip1)");
    this.x = d3.scaleTime().range([0, this.width]),
    this.y = d3.scaleLinear().range([this.height, 0]),
    this.line = d3.line()
        .x(function(d) { return self.kwd.x(d.date); })
        .y(function(d) { return self.y(d.value); });
    this.t = d3.transition().duration(300);
  }

  set brushDidRefresh(value) { this._brushDidRefresh = value; }
  get brushDidRefresh() { return this._brushDidRefresh; }

  unSelectBrush() {
    this.gBrush.call(this.brush.move, null);
  }

  renderLineView() {
    const self = this;
    const kwData = self.gLine.selectAll("g.keyword").data(self.kwd.kw_date);
    // enter
    const kwDataEnter = kwData.enter().append("g").attr("class", "keyword");
    kwDataEnter.append("path").classed('line', true).classed('main-line', true)
      .on("mouseenter", function(d, i) {
        self.kwd.highlight_kw = d.key;
        d3.select(this.parentNode).moveToFront();
      })
      .on("mouseleave", function(d, i) {
        self.kwd.highlight_kw = null;
        d3.select(this.parentNode).moveToBack();
      });
    // update and enter
    kwData.merge(kwDataEnter).select('path')
      .attr("id", function(d) {
        return d.key + "_path"; })
      .attr("d", function(d) { return self.line(d.values); })
      .classed('line-highlight', function(d) {
        return (self.kwd.highlight_kw !== null) && (self.kwd.highlight_kw === d.key);
      })
      .classed('line-dim', function(d) {
        return (self.kwd.highlight_kw !== null) && (self.kwd.highlight_kw !== d.key);
      })
      .style("stroke", function(d, i) { return self.kwd.colorScale(d.key); });
    // exit
    kwData.exit().remove();
  }

  renderAxis() {
    const self = this;
    if (!self.kwd.x) {
      self.kwd.x = this.x;
    }

    // set y-count range
    self.y.domain([
      d3.min(self.kwd.kw_date, function(c) { return d3.min(c.values, function(d) { return d.value; }); }),
      d3.max(self.kwd.kw_date, function(c) { return d3.max(c.values, function(d) { return d.value; }); })
    ]);
    // render Axis x
    self.g.selectAll('.axis').remove();
    self.g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + self.height + ")")
      .call(d3.axisBottom(self.kwd.x).ticks(10));
    // render Axis y and text
    self.g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(self.y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .text("Count");
  }

  bindData(kwd) {
    this.kwd = kwd;
  }

  update() {
    if (!this.kwd.initialized) return;
    const self = this;
    // set color scale
    // TODO: pass from outside
    self.renderAxis();
    // render Line view
    self.renderLineView();
  }

  updateVisible() {
    if (this.kwd.visible_ranking_range !== null) {
      this.dim = true;
    } else {
      this.dim = false;
    }
  }

  set dim(value) {
    const self = this;
    if (this._dim !== value) {
      if (value) {
        this.g.append('rect')
          .attr('class', 'dim')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', this.width)
          .attr('height', this.height)
          .attr('fill', 'black')
          .attr('opacity', 0.0)
          .on('click', function(){
            self.kwd.visible_ranking_range = null;
          })
          .transition(d3.transition().duration(1000))
          .attr('opacity',0.2);
      } else {
        self.unSelectBrush();
        this.g.selectAll('.dim').transition(this.t).attr('opacity', 0.0).remove();
      }
    }
    this._dim = value;
  }

  get dim() { return this._dim; }
}

class RankingView {
  constructor(id) {
    const self = this;
    this.svg = d3.select("#" + id);
    this.width = $("#" + id).width() - margin.left - margin.right;
    this.height = $("#" + id).height() - margin.top - margin.bottom;
    this.g = this.svg.append("g").attr('class', 'ranking-view').attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

    this.clip = this.g.append("defs").append("svg:clipPath")
      .attr("id", "clip2")
      .append("svg:rect")
      .attr("id", "clip-rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 0)
      .attr("height", this.height);

    this.gBg = this.g.append('g').attr('class', 'gBg').attr("clip-path", "url(#clip2)");
    this.gBg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill','white')
      .style('pointer-events', 'none');

    this.gLines = this.g.append('g').attr('class', 'gLines').attr('clip-path', 'url(#clip2)');
    this.gPoints = this.g.append("g").attr('class', 'gPoints').attr("clip-path", "url(#clip2)");
    this.x = d3.scaleTime().range([0, this.width]);
    this.x2 = d3.scaleBand().range([0, this.width]);
    this.y = d3.scalePoint().range([0, this.height]).padding(0.5);

    this.line = d3.line()
        .x(function(d) { return self.x(d.date); })
        .y(function(d) { return self.y(d.value); });
  }

  renderLineView() {
    const self = this;
    const x = self.kwd.x;
    const gLine = this.gLines.selectAll("g.gLine").data(this.kwd.kw_date_ranking);
    const gLineEnter = gLine.enter().append('g').attr('class', "gLine");
    gLine.merge(gLineEnter).each(function(c, i) {
      d3.select(this).selectAll('path').remove();
      var lineFunc = d3.line()
    		.x(function (d) { return d.x; })
    		.y(function (d) { return d.y; });
      const ps = [];
      $.each(c.values, function(i, d) {
        ps.push({
          x: x(d.date) - self.x2.step()/4,
          y: self.y(d.value)
        });
        ps.push({
          x: x(d.date) + self.x2.step()/4,
          y: self.y(d.value)
        });
      });

      d3.select(this).append("path").classed('line', true).classed('data-line', true)
        .classed('line-highlight', function(d) {
          return (self.kwd.highlight_kw !== null) && (self.kwd.highlight_kw === c.key);
        })
        .classed('line-dim', function(d) {
          return (self.kwd.highlight_kw !== null) && (self.kwd.highlight_kw !== c.key);
        })
    		.attr("d", function() { return lineFunc(ps); })
        .on("mouseenter", function(d, i) {
          self.kwd.highlight_kw = c.key;
          d3.select(this.parentNode).moveToFront();
        })
        .on("mouseleave", function(d, i) {
          self.kwd.highlight_kw = null;
          d3.select(this.parentNode).moveToBack();
        })
    		.attr("stroke", self.kwd.colorScale(c.key))
    		.attr("stroke-width", function(d) {
          if (self.x2.step() <= 35) {
            return 2;
          } else if(self.x2.step() <= 60) {
            return 3;
          } else {
            return 6;
          }
        })
    		.attr("fill", "none");
    });
    gLine.exit().remove();
  }

  renderRankings() {
    const self = this;
    const x = self.kwd.x;
    const gPoint = this.gPoints.selectAll("g.gPoint").data(this.kwd.keywords);
    const gPointEnter = gPoint.enter().append('g').attr('class', "gPoint");
    gPoint.merge(gPointEnter).each(function(key, i) {
      if (key === self.kwd.highlight_kw) {
        const point = d3.select(this).selectAll('circle.point')
          .data(self.kwd.kw_date_ranking[self.kwd.kw_index.get(key)].values);
        const pointEnter = point.enter().append('circle').attr('class', 'point');
        point.merge(pointEnter)
          .attr('cx', function(d) { return x(d.date); })
          .attr('cy', function(d) { return self.y(d.value); })
          .attr('stroke', function(d) { return self.kwd.colorScale(key); })
          .attr('fill', "white")
          .attr('stroke-width', 4)
          .attr('r', 8)
          .style('pointer-events', 'none');

        const text = d3.select(this).selectAll('text.ranking')
          .data(self.kwd.kw_date_ranking[self.kwd.kw_index.get(key)].values);
        const textEnter = text.enter().append('text').attr('class', 'ranking');
        text.merge(textEnter)
          .text(function(d) { return d.value+1; })
          .attr('x', function(d) { return x(d.date); })
          .attr('y', function(d) { return self.y(d.value); })
          .attr('fill', function(d) { return self.kwd.colorScale(key); })
          .attr('alignment-baseline', 'central')
    	    .attr('text-anchor', 'middle')
          .attr('font-size','10px')
          .style('pointer-events', 'none');

      } else {
        d3.select(this).remove();
      }
    });
    gPoint.exit().remove();
  }

  renderAxis() {
    const self = this;
    function extend(range) {
      let d1 = new Date(range[0]);
      let d2 = new Date(range[1]);
      self.kwd.time_interval.offset(d1, -0.5);
      self.kwd.time_interval.offset(d2, 0.5);
      return [d1.valueOf(), d2.valueOf()];
    }
    // set x-date range
    if (!self.kwd.x) {
      self.kwd.x = this.x;
    }

    if (self.kwd.subrange) {
      self.x2.domain(self.kwd.time_interval.range(self.kwd.subrange[0], self.kwd.subrange[1]));
    } else {
      self.x2.domain(self.kwd.time_interval.range(self.kwd.timerange[0], self.kwd.timerange[1]));
    }
    // set y-count range
    self.y.domain(
      d3.range(
        d3.max(self.kwd.kw_date_ranking, function(d) {
          return d3.max(d.values, function(c) {
            return c.value;
          })
        }) + 1
      )
    );
  }

  bindData(kwd) {
    this.kwd = kwd;
  }

  update() {
    if (!this.kwd.initialized) return;
    this.updateVisible();
    this.renderAxis();
    // render Line view
    this.renderLineView();
    this.renderRankings();
  }

  updateVisible() {
    if (this.kwd.visible_ranking_range) {
      this.clip.attr('x', this.kwd.visible_ranking_range[0]).attr('width', this.kwd.visible_ranking_range[1]);
    } else {
      this.clip.attr('x', 0).attr('width', 0);
    }
  }
}

class KeywordsView {
  constructor(id) {
    const self = this;
    this.svg = d3.select("#" + id);
    this.width = $("#" + id).width();
    this.height = $("#" + id).height();
    this.g = this.svg.append("g").attr('class', 'keywords-view');
    this.y = d3.scaleBand().range([0, this.height]);
    this.x = d3.scaleLinear().range([0, this.width]);
  }

  update() {
    if (!this.kwd.initialized) return;
    this.renderKeywords();
  }

  renderKeywords() {
    const r = 8;
    const self = this;
    let values = null;
    let rankings = null;
    if (self.kwd.cursor_date && self.kwd.date_kw.get(self.kwd.cursor_date)) {
      values = self.kwd.date_kw.get(self.kwd.cursor_date).values;
      rankings = self.kwd.date_kw_ranking.get(self.kwd.cursor_date).values;
    }
    if (!self.kwd.cursor_date) {
      values = self.kwd.subrange_sum;
      rankings = self.kwd.subrange_sum_ranking;
    }
    self.x.domain([0, d3.max(values)]);
    self.y.domain(d3.range(self.kwd.keywords.length));
    const gKeywords = self.g.selectAll('g.gKeyword').data(self.kwd.keywords);
	  const gKeywordsEnter = gKeywords.enter()
			.append('g').attr('class', 'gKeyword');
    gKeywords.exit().remove();

    gKeywordsEnter.append('rect').attr('class', 'keyword-bg');
    gKeywordsEnter.append('rect').attr('class', 'keyword-bar');
	  gKeywordsEnter.append('text').attr('class', 'keyword-label');
    gKeywordsEnter.append('rect').attr('class', 'keyword-action');
   	gKeywords.merge(gKeywordsEnter).select('rect.keyword-bar')
      .attr('x', 0)
  	  .attr('rx', r)
  	  .attr('ry', r)
      .attr('height', self.y.step())
      .attr('fill', function(key) {
        return self.kwd.colorScale(key); })
      .attr('y', function(key) {
        return self.y(rankings[self.kwd.kw_index.get(key)]); })
      .attr('width', function(key) {
        return self.x(values[self.kwd.kw_index.get(key)]); })
      .attr('opacity', function(key) {
        if (self.kwd.highlight_kw) {
          if (key == self.kwd.highlight_kw) {
            return 1.0;
          } else {
            return 0.2;
          }
        } else {
          return 1.0;
        }
      });

    gKeywords.merge(gKeywordsEnter).select('rect.keyword-bg')
      .attr('x', 0)
      .attr('y', function(key) {
        return self.y(rankings[self.kwd.kw_index.get(key)]); })
  	  .attr('rx', r)
  	  .attr('ry', r)
      .attr('width', self.width)
      .attr('height', self.y.step())
      .attr('fill', function(key) { return self.kwd.colorScale(key); })
      .attr('opacity', function(key) {
        if (self.kwd.highlight_kw) {
          if (key == self.kwd.highlight_kw) {
            return 0.2;
          } else {
            return 0.0;
          }
        } else {
          return 0.2;
        }

      });
    gKeywords.merge(gKeywordsEnter).select('text.keyword-label')
      .text(function (key) { return key + " " + values[self.kwd.kw_index.get(key)]; })
      .attr('x', 4)
      .attr('y', function(key) {
        return self.y(rankings[self.kwd.kw_index.get(key)]) + self.y.step()/2; })
      .attr('alignment-baseline', 'central')
	    .attr('text-anchor', 'start')
      .attr('fill','#444444');

    gKeywords.merge(gKeywordsEnter).select('rect.keyword-action')
      .attr('x', 0)
      .attr('height', self.y.step())
      .attr('y', function(key) {
        return self.y(rankings[self.kwd.kw_index.get(key)]); })
      .attr('width', function(key) {
        return self.width; })
      .attr('opacity', 0.0)
      // .attr('visibility', 'hidden')
      .on('mouseenter', function(key) {
        self.kwd.highlight_kw = key;
      })
      .on('mouseleave', function(key) {
        self.kwd.highlight_kw = null;
      });

  }

  bindData(kwd) {
    this.kwd = kwd;
  }
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};

$('document').ready(function(){
  const keywordFilter = [];
  initFilter(keywordFilter,"Use keywords to filter the dataset...", "keywordFilter");
  const navView = new NavigationView('navigation-view');
  const lineView = new LineView('line-view');
  const rankingView = new RankingView('line-view');
  const keywordsView = new KeywordsView('keywords-view');
  const cursorView = new CursorView('line-view');
  const kwd = new KeywordData();
  lineView.bindData(kwd);
  rankingView.bindData(kwd);
  navView.bindData(kwd);
  keywordsView.bindData(kwd);
  cursorView.bindData(kwd);
  kwd.subrangeDidUpdate = function() {
    rankingView.update();
    lineView.update();
  };
  kwd.visibleRangeDidUpdate = function() {
    rankingView.updateVisible();
    lineView.updateVisible();
  };
  kwd.highlightDidUpdate = function() {
    rankingView.update();
    lineView.update();
    keywordsView.update();
  };
  kwd.cursorDidUpdate = function() {
    keywordsView.update();
  };
  kwd.dataDidLoad = function() {
    lineView.update();
    rankingView.update();
    navView.update();
    keywordsView.update();
    cursorView.update();
  }
  lineView.brushDidRefresh = function(d) {
    if (d[0] == d[1]) {
      kwd.visible_ranking_range = null;
    } else {
      kwd.visible_ranking_range =[d[0], d[1] - d[0]];
    }
  };
  navView.brushDidRefresh = function(d) {
    kwd.subrange = d;
    kwd.visible_ranking_range = null;
  };

  d3.json('word10.json', function(data) {
    kwd.load(data);
  })

  $("#submit_btn").click(function(){
    let timeunit = $('#timeunit').val() * 1000;
    if (timeunit <= 0) return;
    let sep = '';
    let keywords = '';
    $.each(keywordFilter, function(i, d) {
      keywords = keywords+sep+d;
      sep = ',';
    });
    let url = 'http://www.nemoleoliu.com/data?';
    url = url + 'timeunit=' + timeunit +'&';
    url = url + 'keywords=' + keywords;

    d3.json(url, function(error, json) {
      if (error) return console.warn(error);
      kwd.load(json);
    });
  });
  var countries = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      // The url points to a json file that contains an array of country names
      prefetch: '../typeahead'
  });

  // Initializing the typeahead with remote dataset
  $('.typeahead').typeahead(null, {
      name: 'countries',
      source: countries,
      limit: 10 /* Specify maximum number of suggestions to be displayed */
  });

});
