class KeywordData {
  constructor(data) {
    const self = this;
    this._timerange = data.timerange;
    this._keywords = data.keywords;
    this._kw_index = {};
    this._date_kw = data.data;
    const kw_date = [];
    this._kw_date = kw_date;
    $.each(this._keywords, function(i, kw) {
      self._kw_index[kw] = i;
      kw_date.push({
        key: self._keywords[i],
        values: [],
      });
    });
    $.each(this._date_kw, function(index, d) {
      $.each(d.values, function(i, v) {
        kw_date[i].values.push({
          date: d.date,
          value: v,
        });
      });
    });
    console.log(kw_date);
  }

  get timerange() { return this._timerange; }
  get keywords() { return this._keywords; }
  get date_kw() { return this._date_kw; }
  get kw_date() { return this._kw_date; }

  set subrange(value) {
    this._subrange = value;
    this.subrangeDidUpdate();
  }
  get subrange() { return this._subrange; }

}

class NavigationView {
  constructor(id) {
    this.margin = {top: 20, right: 80, bottom: 30, left: 50},
    this.width = $('#'+id).width() - this.margin.left - this.margin.right,
    this.height = $('#'+id).height() - this.margin.top - this.margin.bottom,
    this.svg = d3.select("#"+id).append("g").attr(
      "transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
    const self = this;
    this.brushed = function() {
      if (d3.event.sourceEvent.type === "brush") return;
      var d0 = d3.event.selection.map(self.x.invert),
          d1 = d0.map(d3.timeYear.round);

      // If empty when rounded, use floor instead.
      if (d1[0] >= d1[1]) {
        d1[0] = d3.timeYear.floor(d0[0]);
        d1[1] = d3.timeYear.offset(d1[0]);
      }

      d3.select(this).call(d3.event.target.move, d1.map(self.x));
      if (self._brushDidRefresh) {
        self._brushDidRefresh(d1);
      }
    };
  }

  set brushDidRefresh(value) {
    this._brushDidRefresh = value;
  }

  get brushDidRefresh() {
    return this._brushDidRefresh;
  }

  bindData(kwd) {
    this.kwd = kwd;
    this.update();
  }

  update() {
    this.x = d3.scaleTime()
      .domain(this.kwd.timerange.map(function(d) { return new Date(d); }))
      .rangeRound([0, this.width]);
    this.x.ticks(d3.timeYear.every(1));
    // this.x.nice();

    this.svg.append("g")
    .attr("class", "axis axis--grid")
    .attr("transform", "translate(0," + this.height + ")")
    .call(d3.axisBottom(this.x)
        .ticks(d3.timeYear)
        .tickSize(-this.height)
        .tickFormat(function() { return null; }));

    this.svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(this.x)
            .ticks(d3.timeYear)
            .tickPadding(0))
        .attr("text-anchor", null)
      .selectAll("text")
        .attr("x", 6);

    this.svg.append("g")
      .attr("class", "brush")
      .call(d3.brushX()
          .extent([[0, 0], [this.width, this.height]])
          .on("brush", this.brushed)
      );
  }

}

class LineView {
  constructor(id) {
    const self = this;
    this.svg = d3.select("#" + id),
    this.toolbarWidth = 150;
    this.margin = {top: 20, right: 80 + this.toolbarWidth, bottom: 30, left: 50},
    this.width = $("#" + id).width() - this.margin.left - this.margin.right,
    this.height = $("#" + id).height() - this.margin.top - this.margin.bottom,
    this.g = this.svg.append("g").attr("transform",
      "translate(" + this.margin.left + "," + this.margin.top + ")");
    this.toolbar = this.svg.append("g").attr("transform",
      "translate(" + (this.margin.left+this.width) + "," + this.margin.top + ")");
    this.parseTime = d3.timeParse("%Y");

    this.x = d3.scaleTime().range([0, this.width]),
    this.y = d3.scaleLinear().range([this.height, 0]),
    this.colorScale = d3.scaleOrdinal(d3.schemeCategory20);

    this.line = d3.line()
        .defined(function(d) {
           return self.x(d.date) >= 0 && self.x(d.date) <= self.width;
        })
        .x(function(d) { return this.x(d.date); }.bind(this))
        .y(function(d) { return this.y(d.value); }.bind(this));
    this.selectedDict = {};
    this.selectedCount = 0;
    this.t = d3.transition().duration(300);
    this.brushed = function() {
      if (d3.event.sourceEvent.type === "brush") return;
      var d0 = d3.event.selection.map(self.x.invert),
          d1 = d0.map(d3.timeYear.round);

      // If empty when rounded, use floor instead.
      if (d1[0] >= d1[1]) {
        d1[0] = d3.timeYear.floor(d0[0]);
        d1[1] = d3.timeYear.offset(d1[0]);
      }

      d3.select(this).call(d3.event.target.move, d1.map(self.x));
      // if (self._brushDidRefresh) {
      //   self._brushDidRefresh(d1);
      // }
    };
  }

  renderLineView() {
    const self = this;
    const kwData = self.g.selectAll("g.keyword").data(self.kwd.kw_date);

    // enter
    const kwDataEnter = kwData.enter().append("g").attr("class", "keyword");
    kwDataEnter.append("path").attr("class", "line")
      .on("mouseover", function(d, i) {
        d3.select(this.parentNode).moveToFront();
        d3.selectAll('.line').classed('line-dim', true);
        d3.select(this).classed('line-highlight', true);
      })
      .on("mouseout", function(d, i) {
        d3.select(this.parentNode).moveToBack();
        d3.select(this).classed('line-highlight', false);
        d3.selectAll('.line').classed('line-dim', false);
      });
    // update and enter
    kwData.merge(kwDataEnter).selectAll('path')
      .attr("id", function(d, i) { return d.key + "_path"; })
      .attr("d", function(d) { return self.line(d.values); })
      .style("stroke", function(d, i) { return self.colorScale(d.key); });
    // exit
    kwData.exit().remove();
  }

  renderLegendView() {
    const self = this;
    const selectedKeywords = Object.keys(self.selectedKeywords);
    const legends = this.toolbar.selectAll('g.keyword-legend').data(selectedKeywords);

    const legendsEnter = legends.enter()
      .append('g').attr('class', 'keyword-legend')
      .attr('transform', function(d, i) {
        return "translate(0," + i * 20 + ")";
      });
    legendsEnter.append('rect')
      .attr('x', 0)
      .attr('y', 1)
      .attr('width', 18)
      .attr('height', 18)
      .style("fill", function(d) { return self.colorScale(d); })
      .on('mouseover', function(d, i) {
        d3.select(this)
          .transition(self.t)
          .attr('width', 24);
      })
      .on('mouseout', function(d, i) {
        d3.select(this)
          .transition(self.t)
          .attr('width', 18);
      })
      .on('click', function(d, i) {
        self.select(d, false);
      });
    legendsEnter.append('text')
      .attr('x', 28)
      .attr('y', 12)
      .style("font", "10px sans-serif");
    legendsEnter.merge(legends).selectAll('text').text(function(d) {return d});
    legends.exit().remove();
  }

  renderAxis() {
    const self = this;
    // set x-date range
    if (self.kwd.subrange) {
      self.x.domain(self.kwd.subrange);
    } else {
      self.x.domain(self.kwd.timerange);
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
      .call(d3.axisBottom(self.x));
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
    this.update();
  }

  update() {
    const self = this;
    // set color scale
    // TODO: pass from outside
    self.colorScale.domain(self.kwd.keywords);
    self.renderAxis();
    // render Line view
    self.renderLineView();
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


const navView = new NavigationView('navigation-view');
const lineView = new LineView('line-view');
let flag = false;
d3.json('data.json', function(data) {
  const kwd = new KeywordData(data);
  lineView.bindData(kwd);
  navView.bindData(kwd);
  kwd.subrangeDidUpdate = function() {
    lineView.update();
  };
  navView.brushDidRefresh = function(d) {
    kwd.subrange = d;
  };
})
