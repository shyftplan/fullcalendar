
var TimelineGrid = Grid.extend({
  resources: null,
  colDates: null,
  slotDuration: null,

  constructor: function() {
    DayGrid.apply(this, arguments);
    this.processOptions();
  },

  processOptions: function() {
    var view = this.view;
    this.resources = view.opt('resources');

    this.rowCnt = this.resources.length;
    this.slotDuration = moment.duration(1, 'day');
  },

  computeCellDate: function(cell) {
    return this.colDates[cell.col];
  },

  rangeUpdated: function() {
    var view = this.view;
    var colDates = [];
    var date;

    date = this.start.clone();
    while (date.isBefore(this.end)) {
      colDates.push(date.clone());
      date.add(1, 'day');
      date = view.skipHiddenDays(date);
    }

    if (this.isRTL) {
      colDates.reverse();
    }

    this.colDates = colDates;
    this.colCnt = colDates.length;
  },

  renderDates: function() {
    this.el.html(this.renderHtml());
    this.rowEls = this.el.find('.fc-rows tr');

    // for (i = 0; i < this.colCnt; i++) {
    //   cell = this.getCell(i);
    //   this.view.trigger('agendaRender', null, cell.start, this.dayEls.eq(i));
    // }
  },

  renderHtml: function() {
    return '' +
      '<div class="fc-content">' +
        '<div class="fc-rows">' +
          '<table>' +
            this.resourceRowsHtml() +
          '</table>' +
        '</div>' +
      '</div>';
      '<div class="fc-bg">' +
        '<div class="fc-slats">' +
          '<table>' +
            this.slatRowsHtml() +
          '</table>' +
        '</div>' +
      '</div>';
  },

  resourceCellHtml: function(cell) {
    return '' +
          '<td class="' + this.view.widgetContentClass + '">' +
          '</td>';
  },

  resourceRowsHtml: function() {
    var rowCnt = this.rowCnt;
    var html = '';

    for (row = 0; row < rowCnt; row++) {
      html += this.rowHtml('resource', row);
    }

    return html;
  },

  headHtml: function() {
    return '' +
      '<table>' +
        '<thead>' +
          '<colgroup>' +
          '</colgroup>' +
        '</thead>' +
        '<tbody>' +
          this.headRowHtml() +
        '</tbody>' +
      '</table>';
  },

  headRowHtml: function() {
    var view = this.view;
    var isRTL = this.isRTL;
    var html = '';
    var slotTime = this.start;

    while (slotTime < this.end) {
      html +=
        '<td class="' + view.widgetHeaderClass + '" data-date="' + slotTime.format() + '">' +
          '<div>' + slotTime.format('MM-DD') + '</div>' +
        '</td>';

      slotTime.add(this.slotDuration);
    }

    return '<tr>' + html + "</tr>";
  },

});
