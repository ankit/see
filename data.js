//object for data munching and crunching
See.prototype.data = {
  nodes: [],
  groups: [],
  foci: [],
  links: [],
  // List of 'weights' for each bicluster, indexable using the bicluster id
  weights: [],
  documents: [],

  coord: {
    x: 230,
    y: 150,
    dx: 280,
    dy: 300
  },

  // todo: whitespace ignorance should be built into code. CSV's are generally messy!
  headers: {
    mining: {
      id: "BiCluster Id",
      rowType: " Row Type",
      columnType: " Column Type",
      rows: " Array of Rows",
      columns: " Array of Columns",
      weight: " Importance",
      documentId: " Doc Id"
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

  reset: function() {
    this.groups = [];
    this.foci = [];
    this.nodes = [];
    this.links = [];
  },

  doesRowBelongToGroup: function(row, group) {
    var self = this;
    if ((group.rowType == row[self.headers.mining.rowType] && group.columnType == row[self.headers.mining.columnType]) ||
      (group.rowType == row[self.headers.mining.columnType] && group.columnType == row[self.headers.mining.rowType])) {
        return true;
      }
    return false;
  },

  buildDocuments: function(data, selection) {
    if (selection.node) {
      this.documents = [];
      var len = data.length;
      for (var i = 0; i < len; i++) {
        if (data[i].id == selection.node.document)
          this.documents.push(data[i]);
      }
    } else if (selection.entityName) {
      this.documents = [];
      var len = this.nodes.length;
      var d_len = data.length;
      for (var i = 0; i < len; i++) {
        for (var j = 0; j < d_len; j++) {
          if (this.nodes[i].document == data[j].id) {
            this.documents.push(data[j]);
            break;
          }
        }
      }
    } else {
      this.documents = data;
    }
    console.log(this.documents);
  },

  buildNodes: function(data, selection) {
    var self = this;
    self.reset();

    // for comparison, turn entity into lowercase
    if (selection.entityName)
      selection.entityName = selection.entityName.toLowerCase();

    data.forEach(function(row) {
      if (selection.entityType) {
        if (selection.entityType != "all") {
          // Row is the selected entity and the column type is checked
          var case1 = (row[self.headers.mining.rowType] == selection.entityType
          && selection.entities.indexOf(row[self.headers.mining.columnType]) != -1);

          // Column is the selected entity and the row type is checked
          var case2 = (row[self.headers.mining.columnType] == selection.entityType
            && selection.entities.indexOf(row[self.headers.mining.rowType]) != -1);

          // If neither is true, then we don't want to add this row to our
          // data structures b/c it doesn't match set the filters
          if (!(case1 || case2)) return;
        }
        else {
          if (selection.entities.indexOf(row[self.headers.mining.columnType]) == -1 ||
            selection.entities.indexOf(row[self.headers.mining.rowType]) == -1) {
              return;
            }
        }
      }

      if (selection.entityName &&
        row[self.headers.mining.rows].toLowerCase().indexOf(selection.entityName) == -1 &&
        row[self.headers.mining.columns].toLowerCase().indexOf(selection.entityName) == -1) {
          return;
      }

      var groupId = 0;
      var wasGroupFound = false;
      var groupsLength = self.groups.length;

      for (var j = 0; j < groupsLength; j ++) {
        if (self.doesRowBelongToGroup(row, self.groups[j])) {
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
        groupId = self.groups.length - 1;
      }

      self.groups[groupId].childrenCount ++;

      self.nodes.push(new BiclusterNode(row[self.headers.mining.id],
        row[self.headers.mining.rowType],
        row[self.headers.mining.columnType],
        row[self.headers.mining.rows],
        row[self.headers.mining.columns],
        row[self.headers.mining.weight],
        row[self.headers.mining.documentId],
        groupId));

      self.weights[row[self.headers.mining.id]] = row[self.headers.mining.weight];
    });
  },

  // Build focal points for visualization based on self.groups
  buildFoci: function(selection) {
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
      else if (i < 8) {
        x += self.coord.x + (self.coord.dx * (i - 3));
        y += self.coord.y + self.coord.dy;
      }
      else {
        x += self.coord.x + (self.coord.dx * (i - 7));
        y += self.coord.y + (2 * self.coord.dy);
      }

      self.foci.push({
        x: x,
        y: y
      });
    }
  },

  buildConnections: function(links, selection) {
    var self = this;
    self.reset();

    // remove all groups following the group of the selectedNode
    // this is a hack to keep the same color of selectedNode
    var groups = self.groups.slice(0, selection.node.group);
    var startGroupIndex = selection.node.group;

    for (var i = 0; i < groups.length; i ++) {
      groups[i] = {
        firstType: -1,
        secondType: -1,
        thirdType: -1
      }
    }

    // push the selected node first
    self.nodes.push(selection.node);

    groups[groups.length] = {
      firstType: selection.node.rowType,
      secondType: selection.node.columnType,
      thirdType: null
    };

    // add all connected biclusters as children to the selected bicluster
    links.forEach(function (link) {
      var linkedBiclusterHeader;

      if (link[self.headers.chaining.source.id] == selection.node.id)
        linkedBiclusterHeader = self.headers.chaining.destination;
      else if (link[self.headers.chaining.destination.id] == selection.node.id)
        linkedBiclusterHeader = self.headers.chaining.source;

      if (linkedBiclusterHeader) {
        var groupId = 0;
        var wasGroupFound = false;
        var groupsLength = groups.length;
        var linkRowType = link[linkedBiclusterHeader.rowType];
        var linkColumnType = link[linkedBiclusterHeader.columnType];
        var thirdType = null;

        if (selection.node.rowType == linkRowType) {
          if (selection.node.columnType != linkColumnType)
            thirdType = linkColumnType;
        } else if (selection.node.rowType == linkColumnType) {
          if (selection.node.columnType != linkRowType)
            thirdType = linkRowType;
        } else if (selection.node.columnType == linkColumnType) {
          if (selection.node.rowType != linkRowType)
            thirdType = linkRowType;
        } else if (selection.node.columnType == linkRowType) {
          if (selection.node.rowType != linkColumnType)
            thirdType = linkColumnType;
        }

        for (var j = startGroupIndex; j < groupsLength; j ++) {
          var group = groups[j];

          if (thirdType === group.thirdType) {
            wasGroupFound = true;
            groupId = j;
            break;
          }
        }

        if (!wasGroupFound) {
          groups.push({
            firstType: selection.node.rowType,
            secondType: selection.node.columnType,
            thirdType: thirdType
          });
        }

        var newNode = new BiclusterNode(
          link[linkedBiclusterHeader.id],
          link[linkedBiclusterHeader.rowType],
          link[linkedBiclusterHeader.columnType],
          link[linkedBiclusterHeader.rows],
          link[linkedBiclusterHeader.columns],
          self.weights[link[linkedBiclusterHeader.id]],
          null,
          groupId);

        newNode.cWeight = self.connectionStrength(selection.node, newNode)

        self.links.push({
          source: self.nodes[0],
          target: newNode
        });

        self.nodes[0].addChild(newNode);
        self.nodes.push(newNode);
      }
    });
  },

  // Calculate the Jaccardi's coefficient for a link
  // For now, it is just the no. of common entities in the source and destination bicluster
  connectionStrength: function(src, dest) {
    var strength = 0;

    if (src.rowType === dest.rowType)
      strength = getStrength(src.rows, dest.rows);
    else if (src.rowType === dest.columnType)
      strength = getStrength(src.rows, dest.columns);

    if (src.columnType === dest.rowType)
      strength = (strength + getStrength(src.columns, dest.rows)) / 2;
    else if (src.columnType === dest.columnType)
      strength = (strength + getStrength(src.columns, dest.columns)) / 2;

    return strength;

    function getStrength(arr_1, arr_2) {
      var set_1 = arr_1;
      // create a copy of arr_2, since we are going to reduce its size
      var set_2 = arr_2.slice(0);
      var w = 0;
      var total = set_1.length + set_2.length;
      var len_1 = set_1.length;
      for (var i = 0; i < len_1; i ++) {
        var len_2 = set_2.length;
        for (var j = 0; j < len_2; j ++) {
          if (set_1[i] === set_2[j]) {
            w ++;
            // We can remove this entity, since there are no duplicate entities
            set_2.splice(j, 1);
            break;
          }
        }
      }
      return w / (total - w);
    }
  },

  // Obsolete: not being used. Instead, an importance metric for each bicluster is included in the data set
  // Set the weight of every bicluster node to be the number of connected biclusters (degree)
  // todo: make this a setting?
  buildWeights: function(data) {
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
}