
var TimelineGrid = Grid.extend({
  rowEls: null,
  colTimes: null,
  slotDuration: null,
  snapDuration: null,
  cellDuration: null,
  slatEls: null,
  helperEls: null,
  colFormat: null,

  constructor: function() {
    Grid.apply(this, arguments);
    this.processOptions();
  },

  processOptions: function() {
    var view = this.view;
    var slotDuration = view.opt('slotDuration');
    var snapDuration = view.opt('snapDuration');

    slotDuration = moment.duration(slotDuration);
    snapDuration = snapDuration ? moment.duration(snapDuration) : slotDuration;

    this.slotDuration = slotDuration;
    this.snapDuration = snapDuration;
    this.cellDuration = snapDuration; // for Grid system
    this.rowCnt = view.rowCnt;
    this.colFormat = view.opt('colFormat');
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
      date.add(this.snapDuration);
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

      slotTime.add(this.snapDuration);
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
          '<div>' + slotTime.format(this.colFormat) + '</div>' +
        '</td>';

      slotTime.add(this.slotDuration);
    }

    return '<tr>' + html + "</tr>";
  },

  getRowEl: function(row) {
    return this.rowEls.eq(row);
  },

  getColEl: function(col) {
    return this.slatEls.eq(col);
  },


  /* Selection
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of a selection. Overrides the default, which was to simply render a highlight.
  renderSelection: function(range) {
    if (this.view.opt('selectHelper')) { // this setting signals that a mock helper event should be rendered
      this.renderRangeHelper(range);
    }
    else {
      this.renderHighlight(this.selectionRangeToSegs(range));
    }
  },


  // Unrenders any visual indication of a selection
  unrenderSelection: function() {
    this.unrenderHelper();
    this.unrenderHighlight();
  },


  /* Fill System (highlight, background events, business hours)
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a set of rectangles over the given time segments.
  // Only returns segments that successfully rendered.
  renderFill: function(type, segs, className) {
    var nodes = [];
    var i, seg;
    var skeletonEl;

    segs = this.renderFillSegEls(type, segs); // assignes `.el` to each seg. returns successfully rendered segs

    for (i = 0; i < segs.length; i++) {
      seg = segs[i];
      skeletonEl = this.renderFillRow(type, seg, className);
      this.rowEls.eq(seg.row).append(skeletonEl);
      nodes.push(skeletonEl[0]);
    }

    this.elsByFill[type] = $(nodes);

    return segs;
  }

});
