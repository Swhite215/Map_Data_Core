var shadowRoot;
var shadowDealers = [];
var shadowData = {};

function main(o, data) {
  var root,
      opts = $.extend(true, {}, defaults, o),
      formatNumber = d3.format(opts.format),
      formatPercentage = d3.format(",.2f"),
      rname = opts.rootname,
      margin = opts.margin,
      theight = 36 + 16;

  $('#chart').width(opts.width).height(opts.height);
  var width = opts.width - margin.left - margin.right,
      height = opts.height - margin.top - margin.bottom - theight,
      transitioning;


  // var color = d3.scale.category20c();
  var color = function() {
    var randomColors = ['transparent']
    var index = Math.floor(randomColors.length * Math.random());

    return randomColors[index];
  }

  var x = d3.scale.linear()
      .domain([0, width])
      .range([0, width]);

  var y = d3.scale.linear()
      .domain([0, height])
      .range([0, height]);

  var treemap = d3.layout.treemap()
      .children(function(d, depth) { return depth ? null : d._children; })
      .sort(function(a, b) { return a.value - b.value; })
      .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
      .round(false);

  var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges");

  var grandparent = svg.append("g")
      .attr("class", "grandparent");

  grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top);

  grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - margin.top)
      .attr("dy", ".75em");

  if (opts.title) {
    $("#chart").prepend("<p class='title'>" + opts.title + "</p>");
  }

  if (data instanceof Array) {
    root = { key: rname, values: data };
  } else {
    root = data;
    practice = root;
  }

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
    shadowRoot = root;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when layout is computed.
  function accumulate(d) {
    return (d._children = d.values)
        ? d.value = d.values.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
        .datum(d.parent)
        .on("click", transition)
      .select("text")
        .text(name(d))
        .attr("fill", "white");

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children || [d]; })
          .classed("children", true)
          .on("click", transition);

    var children = g.selectAll(".child")
        .data(function(d) { return d._children; })
      .enter().append("g");

    children.append("rect")
        .attr("class", "child")
        .call(rect)
      .append("title")
        .text(function(d) { return d.key + " (" + formatNumber(d.value) + ")"; });

    g.append("rect")
        .attr("class", "parent")
        .call(rect);

    var t = g.append("text")
        .attr("class", "ptext")
        .attr("dy", ".75em")


    t.append("tspan")
        .text(function(d) { return d.key;});

    if (d._children[0]._children[0].key === "Joxos") {
      g.append("image")
        .attr("class", "test-image")
        .attr("xlink:href", "http://res.cloudinary.com/debrs2fke/image/upload/v1507566619/Aegis_Background_pdd4fp.png")
        .attr("width", "100%")
        .attr("height", "100%");
    }

    if (d._children[0]._children[0].category === "Character" || d._children[0]._children[0].category === "Monster") {
      console.log(d);
      console.log(d._children[0].age);
      t.append("tspan")
        .attr("dy", "1.0em")
        .text(function(d) { return "Age: " + d._children[0].age; });

      t.append("tspan")
        .attr("dy", "1.0em")
        .text(function(d) { return "Health: " + d._children[0].health; });

      t.append("tspan")
        .attr("dy", "1.0em")
        .text(function(d) { return "Mana: " + d._children[0].mana; });
    }

    t.call(text);

    g.selectAll("rect")
        .style("fill", function(d) { return color(d.key); });

    function transition(d) {
      //Don't transition if at lowest nest depth.
      if (d._children[0]._children ===  undefined) {
        return;
      }

      if (transitioning || !d) return;
      transitioning = true;

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      //Total Conversions, », Region, », LMA, », Dealer Name
      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
      t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
      t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
      t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    checkState();
    return g;
  }


  function checkState() {
    state = jQuery(".grandparent").text().trim();

    if (state === "Key Components") {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606942/whole_map_no_selection_CT_tkptc5.png');
    } else if (state.indexOf("Ecric") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_ecric_selection_CT_eyy52a.png');
    }  else if (state.indexOf("Vi Citadel") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_citadel_selection_CT_azvvr0.png');
    }  else if (state.indexOf("Elgin") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_elgin_selection_CT_gnd2v5.png');
    }  else if (state.indexOf("Herl") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_herl_selection_CT_u4mmvn.png');
    }  else if (state.indexOf("Mundi Forest") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_mundi_selection_CT_oi34s8.png');
    }  else if (state.indexOf("Hope's Haven") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606941/whole_map_hope_selection_CT_pdvjlm.png');
    }  else if (state.indexOf("Northern Reaches") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606942/whole_map_northern_selection_CT_xbmfzf.png');
    }  else if (state.indexOf("Stiel") > -1) {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606942/whole_map_stiel_selection_CT_ymp3vo.png');
    } else {
      jQuery(".section-01").attr('src' , 'http://res.cloudinary.com/debrs2fke/image/upload/v1508606942/whole_map_no_selection_CT_tkptc5.png');
    }
  }


  function text(text) {
    text.selectAll("tspan")
        .attr("x", function(d) { return x(d.x) + 12; })
    text.attr("x", function(d) { return x(d.x) + 6; })
        .attr("fill", "white")
        .attr("y", function(d) { return y(d.y) + 6; })
        .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });

  }

  function text2(text) {
    text.attr("x", function(d) { return x(d.x + d.dx) - this.getComputedTextLength() - 6; })
        .attr("y", function(d) { return y(d.y + d.dy) - 6; })
        .attr("fill", "white")
        .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
        .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + " » " + d.key
        : d.key + " ";
  }

  initialize(root);
  accumulate(root);
  layout(root);
  display(root);


  if (window.parent !== window) {
    var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({height: myheight}, '*');
  }

}

var defaults = {
    margin: {top: 24, right: 0, bottom: 0, left: 0}, //Margins
    rootname: "TOP", //Default Name
    format: ",d", //Format for Numbers
    title: "", //Empty value to be filled in later.
    width: 1000, //Width of the graph
    height: 680 //Height of the graph
};

if (window.location.hash === "") {
  //Intial Ajax Request

  //Current d3.json method
    d3.json("genesis_data.json", function(err, res) {
        if (!err) {
            //Create a data variable that is a nested object.
            var data = d3.nest().key(function(d) { return d.location; }).key(function(d) { return d['category']; }).key(function(d) { return d.key; }).key(function(d) { return d.key; }).entries(res);

            shadowData = data;

            main({title: "Aegis Data Core"}, {key: "Key Components", values: data});
        }
    });
}

$(document).ready(function() {

  $(".child").on("hover", function() {
    console.log(this);

  });

});
