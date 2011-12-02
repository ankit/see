// Constructor for a Bicluster node
var BiclusterNode = function(id, rowType, columnType, rowStr, columnStr, weight, documentId, group, children, connectionWeight) {

  // private

  // Builds an array from a "," separated string of values.
  // Also, removes duplicates and any empty values
  var getArrayFromString = function(str) {
    if (str) {
      var arr = str.trim().split(',');
      // remove any duplicates
      arr = removeDuplicateValues(arr);
      // if last element is empty, remove it
      if (arr[arr.length - 1] == "")
        arr.splice(arr.length - 1, 1);

      return arr;
    }
    return [];
  }

  // Remove duplicate values from array
  var removeDuplicateValues = function(arr) {
    var i, len = arr.length, obj = {}, out = [];

    for (i = 0; i < len; i++)
      obj[arr[i]] = 0;

    for (i in obj)
      out.push(i);

    return out;
  }

  // public

  // initialize variables
  this.id         = id,
  this.rowType    = rowType,
  this.columnType = columnType,
  this.rows       = getArrayFromString(rowStr),
  this.columns    = getArrayFromString(columnStr),
  this.dWeight    = weight,
  this.group      = group ? group : 0,
  this.children   = children ? children : []
  this.cWeight    = connectionWeight ? connectionWeight : 0;
  this.document   = documentId;
}

BiclusterNode.prototype.addChild = function(node) {
  this.children.push(node);
}