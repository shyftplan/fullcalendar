
/* A component that renders one or more columns of vertical time slots
----------------------------------------------------------------------------------------------------------------------*/

var TimeGrid = Grid.extend({

  slotDuration: null, // duration of a "slot", a distinct time segment on given day, visualized by lines
  snapDuration: null, // granularity of time for dragging and selecting
  minTime: null, // Duration object that denotes the first visible time of any given day
  maxTime: null, // Duration object that denotes the exclusive visible end time of any given day
  colDates: null, // whole-day dates for each column. left to right
  axisFormat: null, // formatting string for times running along vertical axis

  dayEls: null, // cells elements in the day-row background
  slatEls: null, // elements running horizontally across all columns

  slatTops: null, // an array of top positions, relative to the container. last item holds bottom of last slot

  helperEl: null, // cell skeleton element for rendering the mock event "helper"

  businessHourSegs: null,


  constructor: function() {
    Grid.apply(this, arguments); // call the super-constructor
    this.processOptions();
  },


  // Renders the time grid into `this.el`, which should already be assigned.
  // Relies on the view's colCnt. In the future, this component should probably be self-sufficient.
  renderDates: function() {
    this.el.html(this.renderHtml());
    this.dayEls = this.el.find('.fc-day');
    this.slatEls = this.el.find('.fc-slats tr');

    for (i = 0; i < this.colCnt; i++) {
      cell = this.getCell(i);
      this.view.trigger('agendaRender', null, cell.start, this.dayEls.eq(i));
    }
  },


  renderBusinessHours: function() {
    var events = this.view.calendar.getBusinessHoursEvents();
    this.businessHourSegs = this.renderFill('businessHours', this.eventsToSegs(events), 'bgevent');
  },


  // Renders the basic HTML skeleton for the grid
  renderHtml: function() {
    return '' +
      '<div class="fc-bg">' +
        '<table>' +
          this.rowHtml('slotBg') + // leverages RowRenderer, which will call slotBgCellHtml
        '</table>' +
      '</div>' +
      '<div class="fc-slats">' +
        '<table>' +
          this.slatRowHtml() +
        '</table>' +
      '</div>';
  },


  // Renders the HTML for a vertical background cell behind the slots.
  // This method is distinct from 'bg' because we wanted a new `rowType` so the View could customize the rendering.
  slotBgCellHtml: function(cell) {
    return this.bgCellHtml(cell);
  },


  // Generates the HTML for the horizontal "slats" that run width-wise. Has a time axis on a side. Depends on RTL.
  slatRowHtml: function() {
    var view = this.view;
    var isRTL = this.isRTL;
    var html = '';
    var slotNormal = this.slotDuration.asMinutes() % 15 === 0;
    var slotTime = moment.duration(+this.minTime); // wish there was .clone() for durations
    var slotDate; // will be on the view's first day, but we only care about its time
    var minutes;
    var axisHtml;

    // Calculate the time for each slot
    while (slotTime < this.maxTime) {
      slotDate = this.start.clone().time(slotTime); // will be in UTC but that's good. to avoid DST issues
      minutes = slotDate.minutes();

      axisHtml =
        '<td class="fc-axis fc-time ' + view.widgetContentClass + '" ' + view.axisStyleAttr() + '>' +
          ((!slotNormal || !minutes) ? // if irregular slot duration, or on the hour, then display the time
            '<span>' + // for matchCellWidths
              htmlEscape(slotDate.format(this.axisFormat)) +
            '</span>' :
            ''
            ) +
        '</td>';

      html +=
        '<tr ' + (!minutes ? '' : 'class="fc-minor"') + '>' +
          (!isRTL ? axisHtml : '') +
          '<td class="' + view.widgetContentClass + '"/>' +
          (isRTL ? axisHtml : '') +
        "</tr>";

      slotTime.add(this.slotDuration);
    }

    return html;
  },


  /* Options
  ------------------------------------------------------------------------------------------------------------------*/


  // Parses various options into properties of this object
  processOptions: function() {
    var view = this.view;
    var slotDuration = view.opt('slotDuration');
    var snapDuration = view.opt('snapDuration');

    slotDuration = moment.duration(slotDuration);
    snapDuration = snapDuration ? moment.duration(snapDuration) : slotDuration;

    this.slotDuration = slotDuration;
    this.snapDuration = snapDuration;
    this.cellDuration = snapDuration; // for Grid system

    this.minTime = moment.duration(view.opt('minTime'));
    this.maxTime = moment.duration(view.opt('maxTime'));

    this.axisFormat = view.opt('axisFormat') || view.opt('smallTimeFormat');
  },


  // Computes a default column header formatting string if `colFormat` is not explicitly defined
  computeColHeadFormat: function() {
    if (this.colCnt > 1) { // multiple days, so full single date string WON'T be in title text
      return this.view.opt('dayOfMonthFormat'); // "Sat 12/10"
    }
    else { // single day, so full single date string will probably be in title text
      return 'dddd'; // "Saturday"
    }
  },


  // Computes a default event time formatting string if `timeFormat` is not explicitly defined
  computeEventTimeFormat: function() {
    return this.view.opt('noMeridiemTimeFormat'); // like "6:30" (no AM/PM)
  },


  // Computes a default `displayEventEnd` value if one is not expliclty defined
  computeDisplayEventEnd: function() {
    return true;
  },


  /* Cell System
  ------------------------------------------------------------------------------------------------------------------*/


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
    this.rowCnt = Math.ceil((this.maxTime - this.minTime) / this.snapDuration); // # of vertical snaps
  },


  // Given a cell object, generates its start date. Returns a reference-free copy.
  computeCellDate: function(cell) {
    var date = this.colDates[cell.col];
    var time = this.computeSnapTime(cell.row);

    date = this.view.calendar.rezoneDate(date); // give it a 00:00 time
    date.time(time);

    return date;
  },


  // Retrieves the element representing the given column
  getColEl: function(col) {
    return this.dayEls.eq(col);
  },


  /* Dates
  ------------------------------------------------------------------------------------------------------------------*/


  // Given a row number of the grid, representing a "snap", returns a time (Duration) from its start-of-day
  computeSnapTime: function(row) {
    return moment.duration(this.minTime + this.snapDuration * row);
  },


  // Slices up a date range by column into an array of segments
  rangeToSegs: function(range) {
    var colCnt = this.colCnt;
    var segs = [];
    var seg;
    var col;
    var colDate;
    var colRange;

    // normalize :(
    range = {
      start: range.start.clone().stripZone(),
      end: range.end.clone().stripZone()
    };

    for (col = 0; col < colCnt; col++) {
      colDate = this.colDates[col]; // will be ambig time/timezone
      colRange = {
        start: colDate.clone().time(this.minTime),
        end: colDate.clone().time(this.maxTime)
      };
      seg = intersectionToSeg(range, colRange); // both will be ambig timezone
      if (seg) {
        seg.col = col;
        segs.push(seg);
      }
    }

    return segs;
  },


  /* Coordinates
  ------------------------------------------------------------------------------------------------------------------*/


  updateSize: function(isResize) { // NOT a standard Grid method
    this.computeSlatTops();

    if (isResize) {
      this.updateSegVerticals();
    }
  },


  // Computes the top/bottom coordinates of each "snap" rows
  computeRowCoords: function() {
    var originTop = this.el.offset().top;
    var items = [];
    var i;
    var item;

    for (i = 0; i < this.rowCnt; i++) {
      item = {
        top: originTop + this.computeTimeTop(this.computeSnapTime(i))
      };
      if (i > 0) {
        items[i - 1].bottom = item.top;
      }
      items.push(item);
    }
    item.bottom = item.top + this.computeTimeTop(this.computeSnapTime(i));

    return items;
  },


  // Computes the top coordinate, relative to the bounds of the grid, of the given date.
  // A `startOfDayDate` must be given for avoiding ambiguity over how to treat midnight.
  computeDateTop: function(date, startOfDayDate) {
    return this.computeTimeTop(
      moment.duration(
        date.clone().stripZone() - startOfDayDate.clone().stripTime()
      )
    );
  },


  // Computes the top coordinate, relative to the bounds of the grid, of the given time (a Duration).
  computeTimeTop: function(time) {
    var slatCoverage = (time - this.minTime) / this.slotDuration; // floating-point value of # of slots covered
    var slatIndex;
    var slatRemainder;
    var slatTop;
    var slatBottom;

    // constrain. because minTime/maxTime might be customized
    slatCoverage = Math.max(0, slatCoverage);
    slatCoverage = Math.min(this.slatEls.length, slatCoverage);

    slatIndex = Math.floor(slatCoverage); // an integer index of the furthest whole slot
    slatRemainder = slatCoverage - slatIndex;
    slatTop = this.slatTops[slatIndex]; // the top position of the furthest whole slot

    if (slatRemainder) { // time spans part-way into the slot
      slatBottom = this.slatTops[slatIndex + 1];
      return slatTop + (slatBottom - slatTop) * slatRemainder; // part-way between slots
    }
    else {
      return slatTop;
    }
  },


  // Queries each `slatEl` for its position relative to the grid's container and stores it in `slatTops`.
  // Includes the the bottom of the last slat as the last item in the array.
  computeSlatTops: function() {
    var tops = [];
    var top;

    this.slatEls.each(function(i, node) {
      top = $(node).position().top;
      tops.push(top);
    });

    tops.push(top + this.slatEls.last().outerHeight()); // bottom of the last slat

    this.slatTops = tops;
  },


});
