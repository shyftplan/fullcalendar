
var ResourceGrid = Grid.extend({

  bottomCoordPadding: 0, // hack for extending the hit area for the last row of the coordinate grid

  colDates: null, // flat chronological array of each cell's dates
  dayToCellOffsets: null, // maps days offsets from grid's start date, to cell offsets

  minTime: null, // Duration object that denotes the first visible time of any given day
  maxTime: null, // Duration object that denotes the exclusive visible end time of any given day

  rowEls: null, // set of fake row elements

  resources: [],
  cells: {},

  constructor: function() {
    Grid.apply(this, arguments);

    this.processOptions();
    this.cellDuration = moment.duration(1, 'day'); // for Grid system
  },

  getCell: function(row, col){
    var resource = this.resources[row];
    cell = { row: row, resource: resource };
    return cell;
  },

  renderDates: function(){
    var view = this.view;
    var resources = this.resources;
    var rowCnt = resources.length;
    var html = '';
    var row;

    for (row = 0; row < rowCnt; row++) {
      html += this.resourceRowHtml(resources[row], row);
    }
    this.el.html(html);
    this.rowEls = this.el.find('tr');

    //TODO: trigger resourceRender here
  },

  // Generates the HTML for a single row. `row` is the row number.
  resourceRowHtml: function(resource, row) {
    return this.rowHtml('resource', row);
  },

  resourceCellHtml: function(cell) {
    var resource = cell.resource;
    return '' +
          '<td>' +
            '<div class="fc-cell-content">' +
              '<span class="fc-cell-text">' +
                 resource.name +
              '</span>' +
            '</div>' +
          '</td>';
  },

  headHtml: function() {
    return '' +
      '<table>' +
        '<colgroup>' +
          '<col class="fc-main-col">' +
        '</colgroup>' +
        '<tbody>' +
          '<tr>' +
            '<th class="' + this.view.widgetHeaderClass + '">' +
              '<div>' +
                this.rowHtml('head') +
              '</div>' +
            '</th>' +
          '</tr>' +
        '</tbody>' +
      '</table>';
  },

  headCellHtml: function() {
    return '' +
        '<div class="fc-cell-content">' +
          '<div class="fc-icon fc-expander-space">' +
          '</div>' +
          '<span class="fc-cell-text">' +
            this.view.opt('resourceColTitle') +
          '</span>' +
        '</div>';
  },


  /* Options
  ------------------------------------------------------------------------------------------------------------------*/

  processOptions: function() {
    var view = this.view;
    this.resources = view.opt('resources');
    this.rowCnt = this.resources.length;
    this.colCnt = 1;
  },


  // Computes a default event time formatting string if `timeFormat` is not explicitly defined
  computeEventTimeFormat: function() {
    return this.view.opt('extraSmallTimeFormat'); // like "6p" or "6:30p"
  },


  // Computes a default `displayEventEnd` value if one is not expliclty defined
  computeDisplayEventEnd: function() {
    return this.colCnt == 1; // we'll likely have space if there's only one day
  },


  // Retrieves the element representing the given row
  getRowEl: function(row) {
    return this.rowEls.eq(row);
  },


  // Overrides Grid's method for when row coordinates are computed
  computeRowCoords: function() {
    var rowCoords = Grid.prototype.computeRowCoords.call(this); // call the super-method

    // hack for extending last row (used by AgendaView)
    rowCoords[rowCoords.length - 1].bottom += this.bottomCoordPadding;

    return rowCoords;
  }

});
