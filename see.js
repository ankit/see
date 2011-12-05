var See = function() {
  this.rootUrl = location.href,
  this.force,
  this.vis,
  this.view = 0,
  this.colors = [
    "#1f77b4",
    "#aec7e8",
    "#ff7f0e",
    "#ffbb78",
    "#2ca02c",
    "#98df8a",
    "#d62728",
    "#ff9896",
    "#9467bd",
    "#c5b0d5",
    "#8c564b",
    "#c49c94",
    "#e377c2",
    "#f7b6d2",
    "#7f7f7f",
    "#c7c7c7",
    "#bcbd22",
    "#dbdb8d",
    "#17becf",
    "#9edae5"
  ],

  this.selection = {
    entityName: null,
    entityType: null,
    dataset: null,
    entities: [],
    node: null,
    connection: null
  },

  // todo: user should be able to provide any csv with the pre-defined headers,
  // instead of hard coding for specific datasets
  this.datasets = {
    "crescent": {
      entityTypes: [
        "date",
        "document",
        "location",
        "organization",
        "person",
        "phone",
        "money"
      ],
      cache: {
        biclusters: null,
        links: null,
        documents: null
      }
    },

    "atlanticstorm" : {
      entityTypes: [
        "date",
        "document",
        "organization",
        "place",
        "person",
        "money"
      ],
      cache: {
        biclusters: null,
        links: null,
        documents: null
      }
    }
  },

  this.size = {
    w: window.innerWidth - 20,
    h: window.innerHeight - 10
  },

  this.props = {
    fill: d3.scale.category20(),
    fontSize: d3.scale.sqrt().domain([0, 200]).range([0, 40]),
    textPadding: {x: 20, y: 10},
    fadeDuration: 500,
    linkDistance: 50,
    charge: -20,
    gravity: 0.1,
    minNodeRadius: 3
  };
}

See.prototype.birth = function() {
  // Save a force-layout for reuse later
  this.force = d3.layout.force()
  .size([this.size.w, this.size.h]);

  // Add the DOM element for visualization
  this.vis = d3.select("#viz").append("svg:svg")
  .attr("id", "drawing")
  .attr("width", this.size.w)
  .attr("height", this.size.h);

  this.attachListeners();
  this.visualizeDataset("atlanticstorm");
  this.buildTooltips();
}

See.prototype.reset = function() {
  this.selection.node = null;
  this.selection.connection = null;
  this.selection.entityName = null;
  this.hideDetailView();
  this.hideBackButton();
  this.visualizeEntityType(this.selection.entityType);
  this.detachEscapeListener(this);
}

// Visualize a particular data set
See.prototype.visualizeDataset = function(dataset) {
  this.selection.dataset = dataset;
  this.selection.entities = this.datasets[this.selection.dataset].entityTypes;
  this.drawEditor();
  this.visualizeAllEntities();
  this.header(this.selection.dataset + " " + this.selection.entityType + " Biclusters");
}

See.prototype.visualizeAllEntities = function() {
  this.visualizeEntityType("all");
}

// Visualize a specific entity
See.prototype.visualizeEntityType = function(anEntityType) {
  var self = this;
  self.header(self.selection.dataset + " " + anEntityType + " Biclusters");
  self.view = 0;

  if (anEntityType)
    self.selection.entityType = anEntityType;

  // Remove the checkbox for the entity we are viewing
  $(".toggleEntityLabel").show();
  $("#toggleEntity" + anEntityType).hide();

  var cache = self.datasets[self.selection.dataset].cache;

   if (!cache.biclusters) {
    d3.csv(self.rootUrl + "data/" + self.selection.dataset + "_mining.csv", function(b) {
      cache.biclusters = b;
      self.data.buildNodes(b, self.selection);

      d3.csv(self.rootUrl + "data/" + self.selection.dataset + "_chaining.csv", function(bLinks) {
        cache.links = bLinks;
        self.hideLoading();
        self.draw();
        self.force.on("tick", function(e) {
          if (self.data.foci.length != 0) {
            var k = 0.15 * e.alpha;

            self.data.nodes.forEach(function(o, i) {
              o.y += (self.data.foci[o.group].y - o.y) * k;
              o.x += (self.data.foci[o.group].x - o.x) * k;
            });
          }

          self.vis.selectAll("g.node")
          .data(self.data.nodes)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

          self.vis.selectAll("line.link")
          .data(self.data.links)
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
        });
      });
    });
  }

  else {
    self.data.buildNodes(cache.biclusters, self.selection);
    self.draw();
  }

  if (!cache.documents) {
    d3.csv(self.rootUrl + "data/" + self.selection.dataset + "_documents.csv", function(d) {
      cache.documents = d;
      self.data.buildDocuments(d, self.selection);
      self.drawDocuments();
    });
  } else {
    self.data.buildDocuments(cache.documents, self.selection);
    self.drawDocuments();
  }
  self.buildTooltips();
}

See.prototype.visualizeEntity = function(anEntity) {
  this.view = 0;
  this.header("Biclusters containing '" + anEntity + "'");
  this.selection.node = null;
  this.selection.connection = null;
  this.selection.entityName = anEntity;
  this.data.buildNodes(this.datasets[this.selection.dataset].cache.biclusters, this.selection);
  this.draw();
  this.showBackButton();
  this.attachEscapeListener(this);
  this.data.buildDocuments(this.datasets[this.selection.dataset].cache.documents, this.selection);
  this.drawDocuments();
  this.history.add(anEntity);
  this.buildTooltips();
}

See.prototype.visualizeBiclusterConnections = function(d) {
  this.view = 1;
  this.data.buildConnections(this.datasets[this.selection.dataset].cache.links, this.selection);
  this.header("Biclusters Connected To:");
  this.draw();
  this.showDetailView(d);
  this.showBackButton();
  this.attachEscapeListener(this);
}

See.prototype.hideLoading = function() {
  $("#loading").fadeOut(this.props.fadeDuration);
}

See.prototype.header = function(text) {
  $("#title").text(text);
}

See.prototype.openDocument = function(docName) {
  var self = this;
  var docs = self.datasets[self.selection.dataset].cache.documents;
  if (!docs)
    return;
  var len = docs.length;
  for (var i = 0; i < len; i++) {
    var w = 550;
    var h = 300;
    var l = 500;
    if (docs[i].id == docName) {
      if (window.screen) {
        w = window.screen.availWidth * 0.4;
        l = window.screen.availWidth * 0.6;
      }

      if (self.selection.node) {
        window.open("document.html?text=" + unescape(docs[i].text) + "&entities=" + self.selection.node.rows.join(",") + "," + self.selection.node.columns.join(","), docName, 'height='+h+', width='+w+', left='+l);
      }

      else if (self.selection.entityName) {
        window.open("document.html?text=" + unescape(docs[i].text) + "&entity=" + self.selection.entityName, docName, 'height='+h+', width='+w+', left='+l);
      }

      else {
        window.open("document.html?text=" + unescape(docs[i].text), docName, 'height='+h+', width='+w+', left='+l);
      }

      return;
    }
  }
}

// changes the environment drawing parameters based on number of nodes
// work in progress
See.prototype.updateDrawEnvironment = function() {
  console.log(this.data.nodes.length);
  if (this.data.nodes.length <= 100) {
    this.props.charge = -200;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([4, 120]);
    this.data.coord.x = 400;
    this.data.coord.y = 250;
    this.data.coord.dx = 200;
    this.data.coord.dy = 250;
    this.props.gravity = 0.1;
  }
  else if (this.data.nodes.length > 100 && this.data.nodes.length < 500) {
    this.props.charge = -40;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([1.8, 60]);
    this.data.coord.x = 350;
    this.data.coord.y = 250;
    this.data.coord.dx = 200;
    this.data.coord.dy = 250;
    this.props.gravity = 0.1;
  }
  else if (this.data.nodes.length >= 500 && this.data.nodes.length < 1000) {
    this.props.charge = -30;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([1.5, 100]);
    this.data.coord.x = 400;
    this.data.coord.y = 300;
    this.data.coord.dx = 100;
    this.data.coord.dy = 100;
    this.props.gravity = 0.1;
   }
   else if (this.data.nodes.length >= 1000) {
     this.props.charge = -30;
     this.props.r = d3.scale.sqrt().domain([0, 1000]).range([2, 100]);
     this.data.coord.x = 350;
     this.data.coord.y = 250;
     this.data.coord.dx = 80;
     this.data.coord.dy = 100;
     this.props.gravity = 0.3;
   }

   this.data.buildFoci(this.selection);
}

// Drawing
See.prototype.draw = function() {
  var self = this;

  self.updateDrawEnvironment();
  self.drawLegend();

  // Start simulation to lay out nodes
  self.force
  .nodes(self.data.nodes)
  .links(self.data.links)
  .gravity(self.props.gravity)
  .charge(self.props.charge)
  .linkDistance(self.props.linkDistance)
  // todo: Use Jaccard's coefficient (or something similar) here, instead of node weight for link strength
  // this is for the second view (when visualizing individual bicluster connections)
  .linkStrength(function(d) {
    if (d.target.cWeight == undefined)
      return 0.1;
    else
      return d.target.cWeight;
  })
  .start();

  // Select all SVG groups that are classed .node and join with data
  var node = self.vis.selectAll("g.node")
    .data(self.data.nodes);

  // If there are more items in data than existing nodes, append new
  // SVG groups with the default values
  node.enter()
    .append("svg:g")
    .attr("class", "node")
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .call(self.drawCircle, this)
    .call(self.force.drag);

  // Setup any circles that were just created
  //  - Circle radius set from node weight
  //  - Circle fill/stroke (color) set from node ID (e.g. random for now)
  d3.selectAll(".circle")
    .data(self.data.nodes)
    .attr("r", function(d) {
      return Math.max(self.props.r(parseFloat(d.dWeight) * 100), self.props.minNodeRadius); } )
    .style("fill", function(d) {
      return d3.rgb(self.props.fill(d.group)).brighter(1); } )
    .style("stroke", function(d) {
      return d3.rgb(self.props.fill(d.group)).darker(1); } )
    .style("stroke-width", function(d) {
      if (self.selection.node && d.id == self.selection.node.id)
        return 10;
      else
        return 1;
    } )
    // Fade out/remove any circles for deleted nodes
    .exit()
    .transition()
    .duration(self.props.fadeDuration)
      .style("opacity", 0)
      .remove();

  node.exit().transition().duration(self.props.fadeDuration).style("opacity", 0).remove();
}

See.prototype.drawCircle = function(node, self) {
  node.append("svg:circle")
  .attr("class", "circle")
  .attr("r", function(d) {
    return Math.max(self.props.r(parseFloat(d.dWeight) * 100), self.props.minNodeRadius);
  })
  .style("fill", function(d) {
    return d3.rgb(self.props.fill(d.group)).brighter(1);
  })
  .style("stroke", function(d) {
    return d3.rgb(self.props.fill(d.group)).darker(1);
  })
  .style("stroke-width", function(d) {
    return 1;
  })
  .on("click", function(e) {
    self.onNodeClick(e, this);
  })
  .on("dblclick", function(e) {
    self.onNodeDoubleClick(e, this);
  })
  .on("mouseover", function(e) {
    self.onNodeMouseover(e);
  })
  .on("mouseout", function(e) {
    self.onNodeMouseout(e);
  });
}

See.prototype.drawEditor = function() {
  var self = this;
  var entityTypes = self.datasets[self.selection.dataset].entityTypes;
  var len = entityTypes.length;

  var datasetsHTML = function() {
    var html = "";
    for (dataset in self.datasets)
      html += "<option value = '" + dataset +"'>" + dataset + "</option>";
    return html;
  }

  var entitySelectorHTML = function() {
    var html = "<option value='all'>all</option>";
    for (var i = 0; i < len; i ++)
      html += "<option value = '" + entityTypes[i] +"'>" + entityTypes[i] + "</option>";
    return html;
  }

  var entityFiltersHTML = function() {
    var html = "";
    for (var i = 0; i < len; i ++) {
      html += "<label class='toggleEntityLabel' id='toggleEntity" + entityTypes[i] + "'>"
      html += "<input value='" + entityTypes[i] + "' type='checkbox' checked class='toggleEntity'/>" + entityTypes[i];
      html += "</label>";
    }
    return html;
  }

  var attachEntityFilterListeners = function() {
    // attach events to checkboxes
    d3.selectAll(".toggleEntity").on("change", function(e) {
      if (this.checked)
        self.selection.entities.push(this.value);
      else
        self.selection.entities.splice(self.selection.entities.indexOf(this.value), 1);
      self.data.buildNodes(self.datasets[self.selection.dataset].cache.biclusters, self.selection);
      self.draw();
    });
  }

  var editor = d3.select("#editor");
  var isEditorInitialized = editor.classed("initialized");
  var entitySelector = d3.select("#entity-selector");

  entitySelector.html(entitySelectorHTML());

  d3.select("#filters").html(entityFiltersHTML());
  attachEntityFilterListeners();

  if (!isEditorInitialized) {
    // mark the editor as initialized, so that events are not attached again
    editor.classed("initialized", true);

    // make the editor draggable
    $("#editor").drag(function(e, d) {
      $(this).css({
         top: d.offsetY,
         left: d.offsetX
      });
    });

    // attach event to entity selector
    entitySelector.on("change", function(e) {
      self.visualizeEntityType(this.value);
    });

    // attach event to entity search box
    $("#search").bind("change", function(e) {
      self.visualizeEntity(this.value);
      $(this).attr("value", "");
    });

    // // add the data sets. they only need to intialized once
    // var dataSelector = d3.select("#dataSelector");
    // dataSelector.html(datasetsHTML());
    // dataSelector.on("change", function(e) {
    //   self.visualizeDataset(this.value);
    // });
  }
}

See.prototype.drawDocuments = function() {
  var len = this.data.documents.length;
  var html = "";
  for (var i = 0; i < len; i ++) {
    html += "<a rel='tipsy' title='Open " + this.data.documents[i].id + "' class='document'>" + this.data.documents[i].id + "</a>";
  }
  $("#document-viewer").html(html);
}

See.prototype.drawLegend = function() {
  var self = this;
  $("#legend").html("");
  var len = self.data.groups.length;
  for (var i = 0; i < len; i ++)
    self.drawLabel(i, self.data.groups[i]);
}

See.prototype.drawLabel = function(keyIndex, group) {
  var self = this;
  var text = group.rowType ? group.rowType + " + " + group.columnType : (group.firstType + " + " + group.secondType + (group.thirdType ? " + " + group.thirdType : ""));
  var color = keyIndex <=20 ? self.colors[keyIndex] : "grey";
  var html = "<div class='pair'>";
  html += "<div class='key' style='background-color: " + color + "'></div>";
  html += "<div class='value'>" + text + "</div></div>";
  $("#legend").append(html);
}

See.prototype.buildTooltips = function() {
  $('[rel=tipsy]').tipsy({
    gravity: 'w'
  });
  $('[rel=tipsy-left]').tipsy({
    gravity: 'e'
  });
}

// Events
See.prototype.onNodeClick = function(d, node) {
  var self = this;
  var circle = d3.select(node);

  if (circle.classed("selected"))
    self.deselectNode(circle);
  else
    self.selectNode(d, circle);
  self.data.buildDocuments(self.datasets[self.selection.dataset].cache.documents, self.selection);
  self.drawDocuments();
  self.buildTooltips();
}

See.prototype.onNodeDoubleClick = function(d, node) {
  var self = this;
  var circle = d3.select(node);
  self.openNode(d, circle);
}

See.prototype.onNodeMouseover = function(d) {
  var self = this;
  if (self.view == 0) {
    if (!self.selection.node)
      self.showDetailView(d);
  }
  else {
    if (!self.selection.connection)
      self.showConnectionView(d);
    else
      self.showConnectionView(self.selection.connection);
  }
}

See.prototype.onNodeMouseout = function(d) {
  var self = this;
  if (!self.selection.node)
    self.hideDetailView();
  else if (!self.selection.connection)
    self.showDetailView(self.selection.node);
  else
    self.showConnectionView(self.selection.connection);
}

// Visualize a bicluster node connections
See.prototype.openNode = function(d, circle) {
  var self = this;
  self.selection.node = d;
  self.visualizeBiclusterConnections(d);
  d3.selectAll(".selected")
  .style("stroke", function(d) {
    return d3.rgb(self.props.fill(d.group)).darker(1); } )
  .classed("selected", false);
}

// Select a bicluster node
See.prototype.selectNode = function(d, circle) {
  var self = this;
  if (self.view == 1) {
    self.selection.connection = d;
    self.showConnectionView(d);
  } else {
    self.selection.node = d;
    self.showDetailView(d);
  }
  d3.selectAll(".selected").classed("selected", false);
  circle
  .style("stroke", function(d) {
    return d3.rgb(self.props.fill(d.group)).darker(3);
  })
  .classed("selected", true);
}

// Takes focus away from a selected bicluster node. Brings back the overall view
See.prototype.deselectNode = function(circle) {
  var self = this;
  if (self.view == 0)
    self.selection.node = null;
  else
    self.selection.connection = null;
  circle
  .style("stroke", function(d) {
    return d3.rgb(self.props.fill(d.group)).darker(1); } )
  .classed("selected", false);
}

See.prototype.onEscape = function(e) {
  if (e.keyCode != 27)
    return;
  e.data.self.reset();
}

See.prototype.attachListeners = function() {
  var self = this;
  $("#back-btn").click(function(e) {
    self.reset();
  });

  $("#search-btn").click(function(e) {
    self.visualizeEntity($("#search").val());
  });

  // attach live listeners for entities and documents
  $(".entityName").live("click", function(e) {
    self.visualizeEntity(this.innerText);
  });

  $(".document").live("click", function(e) {
    self.openDocument(this.innerText);
  });

  $(".search-query").live("click", function(e) {
    self.visualizeEntity(this.innerText);
  });

  $(".search-close-btn").live("click", function(e) {
    self.history.remove($(this).prev('.search-query').text());
  })
}

See.prototype.attachEscapeListener = function(self) {
  $(document).bind('keydown', {self: self}, self.onEscape);
}

See.prototype.detachEscapeListener = function(self) {
  $(document).unbind('keydown', self.onEscape);
}

// Shows the contents of a bicluster in a tabular layout
See.prototype.showDetailView = function(d) {
  var self = this;

  d3.select("#entity-viewer")
  .style("display", "block")
  .html(self.biclusterHTML(d));

  self.buildTooltips();
}

// Hides the contents of bicluster(s)
See.prototype.hideDetailView = function() {
  d3.select("#entity-viewer")
  .style("display", "none");
}

// Shows the contents of the selected biclusters
See.prototype.showConnectionView = function(d) {
  var self = this;

  d3.select("#entity-viewer")
  .html(self.biclusterConnectionHTML(self.selection.node, d))
  .style("display", "block");
  self.buildTooltips();
}

See.prototype.showBackButton = function() {
  $("#back-btn").show();
}

See.prototype.hideBackButton = function() {
  $("#back-btn").hide();
}

// Returns the HTML table for the union of two biclusters b1 and b2.
// The new entities added from b2 are highlighted
// todo: optimize this
// todo: cleanup this method
See.prototype.biclusterConnectionHTML = function(b1, b2) {
  var self = this;
  var entities = {};

  // Given two sets of entities, does a union of both sets
  // For common entities, sets the "common" flag to true
  // For entities in entitySet2, not present in entitySet1, sets the "isNew" flag to true
  function buildEntities(type, entitySet1, entitySet2) {
    entities[type] = [];

    var set1_length = entitySet1.length;
    var set2_length = entitySet2.length;
    var commonEntityIndicesInSet2 = [];

    for (var i = 0; i < set1_length; i ++) {
      if (entitySet2[i]) {
        var isCommon = false;

        // iterate through the second entity set to find a matching entity if it exists
        for (var j = 0; j < set2_length; j ++ ) {
          if (entitySet1[i].trim() === entitySet2[j].trim()) {
            isCommon = true;
            commonEntityIndicesInSet2.push(j);
            break;
          }
        }
      }

      entities[type].push({
        value: entitySet1[i],
        common: isCommon
      });
    }

    // Add any remaining entities in the second entity set
    for (var i = 0; i < set2_length ; i ++) {
      // Check that the entity isn't already added
      if (commonEntityIndicesInSet2.indexOf(i) == -1)
      entities[type].push({
        value: entitySet2[i],
        common: false,
        isNew: true
      });
    }
  }

  var shouldPushRowTypeOfB2 = true;
  var shouldPushColTypeOfB2 = true;

  // detect common row/column types in the two biclusters, to avoid multiple columns for similar types
  // and do the union of the common types
  if (b1.columnType === b2.columnType) {
    shouldPushColTypeOfB2 = false;
    buildEntities(b1.columnType, b1.columns, b2.columns);
  }
  else if (b1.columnType === b2.rowType) {
    shouldPushRowTypeOfB2 = false;
    buildEntities(b1.columnType, b1.columns, b2.rows);
  }
  else
    entities[b1.columnType] = b1.columns;

  if (b1.rowType === b2.columnType) {
    shouldPushColTypeOfB2 = false;
    buildEntities(b1.rowType, b1.rows, b2.columns);
  } else if (b1.rowType === b2.rowType) {
    shouldPushRowTypeOfB2 = false;
    buildEntities(b1.rowType, b1.rows, b2.rows);
  } else
    entities[b1.rowType] = b1.rows;

  if (shouldPushRowTypeOfB2)
    entities[b2.rowType] = b2.rows;
  if (shouldPushColTypeOfB2)
    entities[b2.columnType] = b2.columns;

  var html = "<table><tr>";
  var types = [];

  for (type in entities)
    types.push(type);

  // stick the selected entity to the first column
  if (types[1] == self.selection.node.rowType) {
    temp = types[1];
    types[1] = types[0];
    types[0] = temp;
  } else if (types[2] && types[2] == self.selection.entityType) {
    temp = types[2];
    types[2] = types[0];
    types[0] = temp;
  }

  var len = types.length;
  for (i = 0; i < len; i ++)
    html += "<th>" + types[i] + "</th>";

  html += "</tr>";

  var len = Math.max(entities[types[0]].length, entities[types[1]].length, types[2] ? entities[types[2]].length : 0);

  for (var i = 0; i < len; i ++) {
    html += "<tr>";

    var t_len = types.length;
    for (var j = 0; j < t_len; j ++) {
      var type = types[j];
      if (entities[type][i])
        html += self.biclusterEntityHTML(entities[type][i].value ? entities[type][i].value : entities[type][i],
        entities[type][i].common, entities[type][i].isNew);
      else
        html += self.biclusterEntityHTML(null);
    }

    html += "</tr>";
  }

  html += "</table>";
  return html;
}

// Returns the HTML table for an individual bicluster
See.prototype.biclusterHTML = function(d) {
  var firstCol, secondCol;
  var html;
  var self = this;
  if (d.columnType == self.selection.entityType) {
    html = "<table><tr><th>" + d.columnType + "</th><th>" + d.rowType + "</th></tr>";
    firstCol = "columns";
    secondCol = "rows";
  }
  else {
    html = "<table><tr><th>" + d.rowType + "</th><th>" + d.columnType + "</th></tr>";
    firstCol = "rows";
    secondCol = "columns";
  }

  var len = d.columns.length > d.rows.length ? d.columns.length : d.rows.length;

  for (var i = 0; i < len; i ++) {
    html += "<tr>";
    html += this.biclusterEntityHTML(d[firstCol][i]);
    html += this.biclusterEntityHTML(d[secondCol][i]);
    html += "</tr>";
  }

  html += "</table>";
  return html;
}

// Returns a <td> row for an entity
See.prototype.biclusterEntityHTML = function(value, isCommon, isNew) {
  if (value) {
    var html = "<td rel='tipsy' class='entityName"
    if (isNew)
      html += " highlighted"
    else if (isCommon)
      html += " common"
    html += "' title='Show " + value +" biclusters'>" + value + "</td>";
    return html;
  }
  else
    return "<td class='empty'></td>";
}

// Helper Methods

// Trims extra whitespace at the beginning / end of string
String.prototype.trim = function() {
  return this.replace(/^\s\s*/, '').replace(/\s\s,*$/, '');
};

// do the thing
$(document).ready(function() {
  var organism = new See();
  organism.birth();
});