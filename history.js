See.prototype.history = {
  search: [],
  $container: null,

  add: function(query) {
    if (query != "" && this.search.indexOf(query) == -1) {
      this.search.unshift(query);
      this.draw();
    }
  },

  remove: function(query) {
    console.log("Remove " + this.search.indexOf(query));
    this.search.splice(this.search.indexOf(query), 1);
    this.draw();
  },

  draw: function() {
    var len = this.search.length;
    var html = "";
    for (var i = 0; i < len; i ++) {
      html += "<div class='search'>";
      html += "<a class='search-query' rel='tipsy-left' title='Show " +
      this.search[i] + " biclusters'>" + this.search[i] + "</a>";
      html += "<a class='search-close-btn'>x</a>";
      html +="</div>";
    }
    if (!this.$container)
      this.$container = $("#search-history");
    this.$container.html(html);
  }
}