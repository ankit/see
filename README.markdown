#See

See is a visualization tool to explore [bicluster](http://en.wikipedia.org/wiki/Biclustering) connections. 

##Implementation

We currently visualize datasets that are output from the Minevis data format. The data is loaded into MySQL and we use the ORM code within the preprocessing/ folder to flatten the database of biclusters and bicluster connections into CSV files that can then be read using javascript. We use the [d3](http://mbostock.github.com/d3/) library for javascript visualization. 

##Code Styling Rules

###Indentation
Use 2 spaces, soft tabs.

###Comments
Wherever possible, use `//`. Try to comment on a new line.

###Blank Lines *(optional)*  
Blank lines should have no spaces. If you use TextMate, you can use this [bundle](https://github.com/glennr/uber-glory-tmbundle).

###Everything else

Google Javascript Style Guide: [http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
