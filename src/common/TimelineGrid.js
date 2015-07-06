
var TimelineGrid = Grid.extend({
  rowEls: null,
  colTimes: null,
  slotDuration: null,
  slatEls: null,

  constructor: function() {
    Grid.apply(this, arguments);
    this.processOptions();
  },

  processOptions: function() {
    var view = this.view;
    this.rowCnt = view.rowCnt;
    this.slotDuration = moment.duration(1, 'day');
  },

  computeCellRange: function(cell) {
    var date = this.computeCellDate(cell);

    return {
      start: date,
      end: date.clone().add(this.slotDuration)
    };
  },

  computeCellDate: function(cell) {
    return this.colTimes[cell.col];
  },

  rangeUpdated: function() {
    var view = this.view;
    var colTimes = [];
    var date;

    date = this.start.clone();
    while (date.isBefore(this.end)) {
      colTimes.push(date.clone());
      date.add(1, 'day');
      date = view.skipHiddenDays(date);
    }

    if (this.isRTL) {
      colTimes.reverse();
    }

    this.colTimes = colTimes;
    this.colCnt = colTimes.length;
    this.calRange = {
      start: this.start.clone(),
      end: this.end.clone()
    };
  },

  renderDates: function() {
    this.el.html(this.renderHtml());
    this.rowEls = this.el.find('.fc-rows tr');
    this.slatEls = this.el.find('.fc-slats td');

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
            this.contentRowsHtml() +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div class="fc-bg">' +
        '<div class="fc-slats">' +
          '<table>' +
            this.slatRowsHtml() +
          '</table>' +
        '</div>' +
      '</div>';
  },

  slatRowsHtml: function() {
    var view = this.view;
    var isRTL = this.isRTL;
    var html = '';
    var slotTime = this.start.clone();

    while (slotTime < this.end) {
      html +=
        '<td class="' + view.widgetContentClass + '" data-date="' + slotTime.format() + '">' +
          '<div></div>' +
        '</td>';

      slotTime.add(this.slotDuration);
    }

    return '<tr>' + html + "</tr>";
  },

  contentRowHtml: function() {
    return '' +
          '<tr>' +
            '<td class="' + this.view.widgetContentClass + '">' +
            '</td>' +
          '</tr>';
  },

  contentRowsHtml: function() {
    var rowCnt = this.rowCnt;
    var html = '';

    for (row = 0; row < rowCnt; row++) {
      html += this.contentRowHtml();
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
    var slotTime = this.start.clone();

    while (slotTime < this.end) {
      html +=
        '<td class="' + view.widgetHeaderClass + '" data-date="' + slotTime.format() + '">' +
          '<div>' + slotTime.format('MM-DD') + '</div>' +
        '</td>';

      slotTime.add(this.slotDuration);
    }

    return '<tr>' + html + "</tr>";
  },

  getRowEl: function(row) {
    return this.rowEls.eq(row);
  },

  getColEl: function(col) {
    debugger
    return this.slatEls.eq(col);
  },

});
