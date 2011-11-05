var See = function() {
  this.rootUrl = location.href,
  this.nodes = [],
  this.groups = [],
  this.foci = [],
  this.links = [],
  // List of 'weights' for each bicluster, indexable using the bicluster id
  this.weights = [],
  this.force,
  this.vis,
  this.entity,
  this.selectedNode = null,
  this.selectedConnection = null,
  this.view = 0,

  this.coord = {
    x: 200,
    y: 150,
    dx: 280,
    dy: 300
  },

  // todo: whitespace ignorance should be built into code. CSV's are generally messy!
  this.headers = {
    mining: {
      id: "BiCluster Id",
      rowType: " Row Type",
      columnType: " Column Type",
      rows: " Array of Rows",
      columns: " Array of Columns",
      weight: " Importance"
    },
    chaining: {
      id: "Link Id",
      type: " Link Type",
      source: {
        id: " Source Id",
        columns: " Source Columns",
        rows: " Source Rows",
        id: " Source Id",
        rowType: " Source Row Type",
        columnType: " Source Column Type"
      },

      destination: {
        id: " Destination Id",
        columns: " Destination Columns",
        rows: " Destination Rows",
        id: " Destination Id",
        rowType: " Destination Row Type",
        columnType: " Destination Column Type"
      }
    }
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
        links: null
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
        links: null
      }
    }
  },

  this.selectedDataset = "",

  this.selectedEntities = [],

  this.size = {
    w: window.innerWidth - 20,
    h: window.innerHeight - 10
  },

  this.props = {
    fill: d3.scale.category10(),
    r: d3.scale.sqrt().domain([0, 1000]).range([3, 25]),
    fontSize: d3.scale.sqrt().domain([0, 200]).range([0, 40]),
    textPadding: {x: 20, y: 10},
    fadeDuration: 500,
    linkDistance: 50,
    charge: -20,
    gravity: 0.1
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

  this.visualizeDataset("crescent");
}

See.prototype.reset = function() {
  this.selectedNode = null;
  this.selectedConnection = null;
  this.hideDetailView();
  this.visualizeEntity(this.entity);
  this.detachEscapeListener(this);
}

// Visualize a particular data set
See.prototype.visualizeDataset = function(dataset) {
  this.selectedDataset = dataset;
  this.selectedEntities = this.datasets[this.selectedDataset].entityTypes;
  this.drawEditor();
  this.visualizeEntity(this.datasets[dataset].entityTypes[0]);
  this.updateHeader();
}

// Visualize a specific entity
See.prototype.visualizeEntity = function(anEntity) {
  var self = this;
  self.view = 0;

  if (anEntity)
    self.entity = anEntity;

  // Remove the checkbox for the entity we are viewing
  $(".toggleEntityLabel").show();
  $("#toggleEntity" + anEntity).hide();

  var cache = self.datasets[self.selectedDataset].cache;

   if (!cache.biclusters) {
    d3.csv(self.rootUrl + "data/" + self.selectedDataset + "_mining.csv", function(b) {
      cache.biclusters = b;
      self.crunchBiclusterNodes(b);

      d3.csv(self.rootUrl + "data/" + self.selectedDataset + "_chaining.csv", function(bLinks) {
        cache.links = bLinks;
        self.hideLoading();
        self.draw();
        self.force.on("tick", function(e) {
          if (self.foci.length != 0) {
            var k = 0.15 * e.alpha;

            self.nodes.forEach(function(o, i) {
              o.y += (self.foci[o.group].y - o.y) * k;
              o.x += (self.foci[o.group].x - o.x) * k;
            });
          }

          self.vis.selectAll("g.node")
          .data(self.nodes)
          .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

          self.vis.selectAll("line.link")
          .data(self.links)
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
        });
      });
    });
  }

  else {
    self.crunchBiclusterNodes(cache.biclusters);
    self.draw();
  }
}

See.prototype.visualizeBicluster = function(d) {
  this.view = 1;
  this.crunchBiclusterConnections(d);
  this.draw();
  this.force.charge(-120).gravity(0.2);
}

See.prototype.hideLoading = function() {
  $("#loading").fadeOut(this.props.fadeDuration);
}

See.prototype.updateHeader = function() {
  $("#header").text(this.selectedDataset + " " + this.entity + " Biclusters");
}

See.prototype.updateCoordinates = function() {
  // todo: extend this on the basis of individual cluster sizes, so that a cluster is not hidden
  if (this.nodes.length <= 100) {
    this.props.charge = -200;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([0, 100]);
    this.coord.x = 200;
    this.coord.y = 300;
    this.coord.dx = 200;
    this.coord.dy = 250;
    this.props.gravity = 0.1;
  }
  else if (this.nodes.length > 100 && this.nodes.length < 500) {
    this.props.charge = -40;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([0, 50]);
    this.coord.x = 200;
    this.coord.y = 250;
    this.coord.dx = 200;
    this.coord.dy = 250;
    this.props.gravity = 0.1;
  }
  else if (this.nodes.length >= 500 && this.nodes.length < 1000) {
    this.props.charge = -30;
    this.props.r = d3.scale.sqrt().domain([0, 1000]).range([0, 40]);
    this.coord.x = 300;
    this.coord.y = 180;
    this.coord.dx = 200;
    this.coord.dy = 250;
    this.props.gravity = 0.1;
   }
   else if (this.nodes.length >= 1000) {
     this.props.charge = -20;
     this.props.r = d3.scale.sqrt().domain([0, 1000]).range([0, 20]);
     this.coord.x = 200;
     this.coord.y = 350;
     this.coord.dx = 250;
     this.coord.dy = 100;
     this.props.gravity = 0.2;
   }
}

// Drawing
See.prototype.draw = function() {
  var self = this;

  self.updateCoordinates();
  self.updateHeader();
  self.drawGroupLabels();

  // Start simulation to lay out nodes
  self.force
  .nodes(self.nodes)
  .links(self.links)
  .gravity(self.props.gravity)
  .charge(self.props.charge)
  .linkDistance(self.props.linkDistance)
  // todo: Use Jaccard's coefficient (or something similar) here, instead of node weight for link strength
  // this is for the second view (when visualizing individual bicluster connections)
  .linkStrength(function(d) {
    if (d.target.dWeight == undefined)
      return 0.1;
    else
      return d.target.dWeight;
  })
  .start();

  // Select all SVG groups that are classed .node and join with data
  var node = self.vis.selectAll("g.node")
    .data(self.nodes);

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
    .data(self.nodes)
    .attr("r", function(d) {
      return self.props.r(parseFloat(d.dWeight) * 100) || 5; } )
    .style("fill", function(d) {
      return d3.rgb(self.props.fill(d.group)).brighter(1); } )
    .style("stroke", function(d) {
      return d3.rgb(self.props.fill(d.group)).darker(1); } )
    .style("stroke-width", function(d) {
    return 1; } )
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
    return self.props.r(parseFloat(d.dWeight) * 100) || 5
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
    self.onNodeSelection(e, this);
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
  var entityTypes = self.datasets[self.selectedDataset].entityTypes;
  var len = entityTypes.length;

  var datasetsHTML = function() {
    var html = "";
    for (dataset in self.datasets)
      html += "<option value = '" + dataset +"'>" + dataset + "</option>";
    return html;
  }

  var entitySelectorHTML = function() {
    var html = "";
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
        self.selectedEntities.push(this.value);
      else
        self.selectedEntities.splice(self.selectedEntities.indexOf(this.value), 1);
      self.crunchBiclusterNodes(self.datasets[self.selectedDataset].cache.biclusters);
      self.draw();
    });
  }

  var editor = d3.select("#editor");
  var isEditorInitialized = editor.classed("initialized");
  var entitySelector = d3.select("#entitySelector");

  entitySelector.html(entitySelectorHTML());

  d3.select("#entityFilters").html(entityFiltersHTML());
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
      self.visualizeEntity(this.value);
    });

    // add the data sets. they only need to intialized once
    var dataSelector = d3.select("#dataSelector");
    dataSelector.html(datasetsHTML());
    dataSelector.on("change", function(e) {
      self.visualizeDataset(this.value);
    });
  }
}

See.prototype.drawGroupLabels = function() {
  var self = this;
  $(".groupLabel").remove();

  // todo: come up with better placement algorithm for group labels
  var len = self.groups.length;
  for (var i = 0; i < len; i ++)
    self.drawGroupLabel(self.groups[i], self.foci[i].x, self.foci[i].y);
}

See.prototype.drawGroupLabel = function(group, x, y) {
  var self = this;

  d3.select("#drawing")
  .append("svg:text")
  .attr("class", "groupLabel")
  .attr("dx", x)
  .attr("dy", y)
  .text((group.rowType == self.entity) ? group.columnType : group.rowType);
}

// Events
See.prototype.onNodeSelection = function(d, node) {
  var self = this;
  var circle = d3.select(node);

  if (circle.classed("selected"))
    self.deselectNode(circle);
  else
    self.selectNode(d, circle);
}

// Select a bicluster node. Brings focus to the bicluster and its connections
See.prototype.selectNode = function(d, circle) {
  var self = this;
  if (self.view == 0) {
    self.selectedNode = d;
    self.visualizeBicluster(d);
    self.showDetailView(d);
    self.attachEscapeListener(self);
    d3.selectAll(".selected").classed("selected", false);
  }
  else {
    self.selectedConnection = d;
    self.showConnectionView(d);
    d3.selectAll(".selected").classed("selected", false);
    circle.classed("selected", true);
  }
}

// Takes focus away from a selected bicluster node. Brings back the overall view
See.prototype.deselectNode = function(circle) {
  var self = this;
  if (self.view == 0)
    self.selectedNode = null;
  else
    self.selectedConnection = null;
  circle.classed("selected", false);
}

See.prototype.onNodeMouseover = function(d) {
  var self = this;
  if (!self.selectedNode)
    self.showDetailView(d);
  else if (!self.selectedConnection)
    self.showConnectionView(d);
  else
    self.showConnectionView(self.selectedConnection);
}

See.prototype.onNodeMouseout = function(d) {
  var self = this;
  if (!self.selectedNode)
    self.hideDetailView();
  else if (!self.selectedConnection)
    self.showDetailView(self.selectedNode);
  else
    self.showConnectionView(self.selectedConnection);
}

See.prototype.onEscape = function(e) {
  if (e.keyCode != 27)
    return;
  e.data.self.reset();
}

See.prototype.attachEscapeListener = function(self) {
  $(document).bind('keydown', {self: self}, self.onEscape);
}

See.prototype.detachEscapeListener = function(self) {
  $(document).unbind('keydown', self.onEscape);
}

// Data Crunching
See.prototype.crunchBiclusterNodes = function(data) {
  var self = this;
  self.groups = [];
  self.foci = [];
  self.nodes = [];
  self.links = [];

  var d_len = data.length;

  data.forEach(function (row) {
    // Row is the selected entity and the column type is checked
    var case1 = (row[self.headers.mining.rowType] == self.entity
    && self.selectedEntities.indexOf(row[self.headers.mining.columnType]) != -1);

    // Column is the selected entity and the row type is checked
    var case2 = (row[self.headers.mining.columnType] == self.entity
      &&  self.selectedEntities.indexOf(row[self.headers.mining.rowType]) != -1);

    // If neither is true, then we don't want to add this row to our
    // data structures b/c it doesn't match set the filters
    if (!(case1 || case2)) return;

    var groupId = 0;
    var wasGroupFound = false;
    var groupsLength = self.groups.length;

    for (var j = 0; j < groupsLength; j ++) {
      var group = self.groups[j];

      if (group.rowType == row[self.headers.mining.rowType]
        && group.columnType == row[self.headers.mining.columnType]) {
        wasGroupFound = true;
        groupId = j;
        break;
      }
    }

    if (!wasGroupFound) {
      self.groups.push({
        rowType: row[self.headers.mining.rowType],
        columnType: row[self.headers.mining.columnType],
        childrenCount: 0
      });
    }

    self.nodes.push(
      new BiclusterNode(row[self.headers.mining.id],
        row[self.headers.mining.rowType],
        row[self.headers.mining.columnType],
        row[self.headers.mining.rows],
        row[self.headers.mining.columns],
        row[self.headers.mining.weight],
        groupId)
    );

    // cache the weight value in self.weights
    self.weights[row[self.headers.mining.id]] = row[self.headers.mining.weight];
    self.groups[j].childrenCount ++;
  });

  self.crunchFoci();
}

See.prototype.crunchFoci = function() {
  var self = this;
  var len = self.groups.length;

  for (var i = 0; i < len; i ++) {
    var x = 0, y = 0;
    if (self.groups[i].childrenCount < 100) {
      x -= 100;
    }

    if (i < 4) {
      x += self.coord.x + (self.coord.dx * i);
      y += self.coord.y;
    }
    else {
      x += self.coord.x + (self.coord.dx * (i - 3));
      y += self.coord.y + self.coord.dy;
    }

    self.foci.push({
      x: x,
      y: y
    });
  }
}

// Sets up data for simulation. Discovers connections to selected bicluster (selectedNode)
See.prototype.crunchBiclusterConnections = function(selectedNode) {
  var self = this;

  // reset existing data
  self.groups = [];
  self.foci = [];
  self.nodes = [];
  self.links = [];

  // push the selected node first
  self.nodes.push(selectedNode);
  self.nodes[0].setGroup(0);
  var groups = [];
  groups.push({
    rowType: selectedNode.rowType,
    columnType: selectedNode.columnType
  });

  var links = self.datasets[self.selectedDataset].cache.links;

  // add all connected biclusters as children to the selected bicluster
  links.forEach(function (link) {
    var biclusterHeader;

    if (link[self.headers.chaining.source.id] == selectedNode.id)
      biclusterHeader = self.headers.chaining.destination;
    else if (link[self.headers.chaining.destination.id] == selectedNode.id)
      biclusterHeader = self.headers.chaining.source;

    if (biclusterHeader) {
      var groupId = 0;
      var wasGroupFound = false;
      var groupsLength = groups.length;

      for (var j = 0; j < groupsLength; j ++) {
        var group = groups[j];

        if (group.rowType == link[biclusterHeader.rowType]
          && group.columnType == link[biclusterHeader.columnType]) {
          wasGroupFound = true;
          groupId = j;
          break;
        }
      }

      if (!wasGroupFound) {
        groups.push({
          rowType: link[biclusterHeader.rowType],
          columnType: link[biclusterHeader.columnType]
        });
      }

      var newNode = new BiclusterNode(
        link[biclusterHeader.id],
        link[biclusterHeader.rowType],
        link[biclusterHeader.columnType],
        link[biclusterHeader.rows],
        link[biclusterHeader.columns],
        self.weights[link[biclusterHeader.id]],
        groupId);

      self.links.push({
        source: self.nodes[0],
        target: newNode
      });

      self.nodes[0].addChild(newNode);
      self.nodes.push(newNode);
    }
  });
}

// Obsolete: not being used. Instead, an importance metric for each bicluster is included in the data set
// Set the weight of every bicluster node to be the number of connected biclusters (degree)
// todo: make this a setting?
See.prototype.crunchBiclusterWeights = function(data) {
  var self = this;
  var mNodes = self.nodes;
  var mWeights = self.weights;

  data.forEach(function(row) {
    var link = {};
    var include = false;
    var formatted_link = {};

    // todo: extract constants
    var source_id = row[self.headers.chaining.source.id];
    var dest_id = row[self.headers.chaining.destination.id];

    var len = self.nodes.length;
    for (var i = 0; i < len; i ++) {
      if (mWeights[mNodes[i].id] == undefined)
        mWeights[mNodes[i].id] = 0;
      if (mNodes[i].id == source_id || mNodes[i].id == dest_id) {
        mNodes[i].dWeight ++;
        mWeights[mNodes[i].id] ++;
      }
    }
  });
}

// Initialize and create the DIV which will contain selected bicluster(s) content
See.prototype.initDetailView = function() {
  return d3.select("#tooltipContainer")
  .append("div")
  .attr("id", "detailView")
  .attr("class", "tooltip");
}

// Shows the contents of a bicluster in a tabular layout
See.prototype.showDetailView = function(d) {
  var self = this;
  var detailView = d3.select("#detailView");

  // selections in d3 are of the form [[node]]
  if (!detailView[0][0])
    detailView = self.initDetailView();

  detailView
  .style("visibility", "visible")
  .html(self.biclusterHTML(d));
}

// Hides the contents of bicluster(s)
See.prototype.hideDetailView = function() {
  d3.select("#detailView")
  .style("visibility", "hidden");
}

// Shows the contents of the selected biclusters
See.prototype.showConnectionView = function(d) {
  var self = this;

  d3.select("#detailView")
  .html(self.biclusterConnectionHTML(self.selectedNode, d))
  .style("visibility", "visible");
}

// Returns the HTML table for the union of two biclusters b1 and b2. The common entities are highlighted
// todo: optimize this
// todo: cleanup this method
See.prototype.biclusterConnectionHTML = function(b1, b2) {
  var self = this;
  var entities = {};

  // Given two sets of entities, does a union of both sets
  // For common entities, sets the associated "common" flag to true
  function buildEntities(type, entitySet1, entitySet2) {
    entities[type] = [];
    var length;

    // Set the length to the smaller of the two entity sets, since we'll be iterating through it to highlight the common entities
    // If the second entity set is smaller, make it the first entity set
    if (entitySet1.length > entitySet2.length) {
      tempSet = entitySet1;
      entitySet1 = entitySet2;
      entitySet2 = tempSet;
    }

    length = entitySet1.length;

    var commonEntityIndicesInSet2 = [];

    for (var i = 0; i < length; i ++) {
      if (entitySet2[i]) {
        var isCommon = false;
        var entitySet2_length = entitySet2.length;

        // iterate through the second entity set to find a matching entity if it exists
        for (var j = 0; j < entitySet2_length; j ++ ) {
          if (entitySet1[i].trim() === entitySet2[j].trim()) {
            isCommon = true;
            commonEntityIndicesInSet2.push(j);
            break;
          }
        }

        entities[type].push({
          value: entitySet1[i],
          common: isCommon
        });
      }
    }

    // Add any remaining entities in the second entity set
    length = entitySet2.length;

    for (var i = 0; i < length ; i ++) {
      // Check that the entity isn't already added
      if (commonEntityIndicesInSet2.indexOf(i) == -1)
      entities[type].push({
        value: entitySet2[i],
        common: false
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
  if (types[1] == self.entity) {
    temp = types[1];
    types[1] = types[0];
    types[0] = temp;
  } else if (types[2] && types[2] == self.entity) {
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
      if (entities[type][i]) {
        if (entities[type][i].common)
          html += "<td class='highlighted'>"
        else
          html += "<td>";
        html += entities[type][i].value ? entities[type][i].value : entities[type][i];
        html += "</td>";
      } else {
        html += "<td></td>";
      }
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

  if (d.columnType == self.entity) {
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
    if (d[firstCol][i])
      html += "<td>" + d[firstCol][i] + "</td>";
    else
      html += "<td></td>";
    if (d[secondCol][i])
      html += "<td>" + d[secondCol][i] + "</td>";
    else
      html += "<td></td>";
    html += "</tr>";
  }

  html += "</table>";
  return html;
}

// Create a bicluster node. Does cleanup and sets up the bNode
var BiclusterNode = function(id, rowType, columnType, rowStr, columnStr, weight, group, children) {
  this.id         = id,
  this.rowType    = rowType,
  this.columnType = columnType,
  this.rows       = this.buildArrayFromString(rowStr),
  this.columns    = this.buildArrayFromString(columnStr),
  this.dWeight    = weight,
  this.group      = group ? group : 0,
  this.children   = children ? children : []
}

// Builds the row/column array from , separated string. Does some cleanup (removes duplicates, last empty element, etc.)
BiclusterNode.prototype.buildArrayFromString = function(str) {
  if (str) {
    var arr = str.trim().split(',').removeDuplicates();
    // if last element is empty, get rid of it
    if (arr[arr.length - 1] == "")
      arr.splice(arr.length - 1, 1);
    return arr;
  }
  else
    return [];
}

BiclusterNode.prototype.setGroup = function(aGroup) {
  this.group = aGroup;
}

BiclusterNode.prototype.addChild = function(node) {
  this.children.push(node);
}

// Helper Methods
String.prototype.trim = function() {
  return this.replace(/^\s\s*/, '').replace(/\s\s,*$/, '');
};

Array.prototype.removeDuplicates = function() {
  var i, len = this.length, out = [], obj = {};

  for (i = 0;i < len; i++) {
    obj[this[i]] = 0;
  }

  for (i in obj) {
    out.push(i);
  }

  return out;
};

// do the thing
$(document).ready(function() {
  var organism = new See();
  organism.birth();
});