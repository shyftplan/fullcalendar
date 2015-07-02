
var ResourceView = View.extend({

  resourceGrid: null,
  timelineGrid: null,

  resourceColWidth: null, // width of all the resource-name cells running down the side

  initialize: function() {
    this.resourceGrid = new ResourceGrid(this);
    // this.timelineGrid = new TimelineGrid(this);
    this.coordMap = this.resourceGrid.coordMap; // the view's date-to-cell mapping is identical to the subcomponent's
    this.processOptions();
  },

  processOptions: function() {
    this.resources = this.opt('resources');
  },


  // Sets the display range and computes all necessary dates
  setRange: function(range) {
    View.prototype.setRange.call(this, range); // call the super-method

    // this.resourceGrid.breakOnWeeks = /year|month|week/.test(this.intervalUnit); // do before setRange
    this.resourceGrid.setRange(range);
  },


  // Compute the value to feed into setRange. Overrides superclass.
  computeRange: function(date) {
    var range = View.prototype.computeRange.call(this, date); // get value from the super-method

    // year and month views should be aligned with weeks. this is already done for week
    if (/year|month/.test(range.intervalUnit)) {
      range.start.startOf('week');
      range.start = this.skipHiddenDays(range.start);

      // make end-of-week if not already
      if (range.end.weekday()) {
        range.end.add(1, 'week').startOf('week');
        range.end = this.skipHiddenDays(range.end, -1, true); // exclusively move backwards
      }
    }

    return range;
  },


  // Renders the view into `this.el`, which should already be assigned
  renderDates: function() {

    this.dayNumbersVisible = this.resourceGrid.rowCnt > 1; // TODO: make grid responsible

    this.el.addClass('fc-basic-view').html(this.renderHtml());

    this.headRowEl = this.el.find('thead .fc-row');

    this.scrollerEl = this.el.find('.fc-body .fc-resource-area');
    this.resourceGrid.coordMap.containerEl = this.scrollerEl; // constrain clicks/etc to the dimensions of the scroller
    this.resourceGrid.setElement(this.el.find('.fc-body .fc-resource-area'));
    this.resourceGrid.renderDates(this.hasRigidRows());
  },


  // Unrenders the content of the view. Since we haven't separated skeleton rendering from date rendering,
  // always completely kill the resourceGrid's rendering.
  unrenderDates: function() {
    this.resourceGrid.unrenderDates();
    this.resourceGrid.removeElement();
  },


  renderBusinessHours: function() {
  },


  renderHtml: function() {
    return '' +
      '<table>' +
        '<thead class="fc-head">' +
          '<tr>' +
            this.headHtml() +
          '</tr>' +
        '</thead>' +
        '<tbody class="fc-body">' +
          '<tr>' +
            '<td class="fc-resource-area '+ this.widgetContentClass +'">' +
            '</td>' +
            '<td class="fc-divider fc-col-resizer fc-widget-header">' +
            '</td>' +
            '<td class="fc-time-area '+ this.widgetContentClass +'">' +
            '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>';
  },

  headHtml: function() {
    return '' +
      '<td class="fc-resource-area '+ this.widgetHeaderClass +'">' +
        '<div class="fc-scrollpane">' +
          '<div style="overflow-x: scroll; overflow-y: hidden; margin: 0px;">' +
            '<div class="fc-scrollpane-inner" style="min-width: 70px;">' +
              '<div class="fc-content">' +
                this.resourceGrid.headHtml() +
              '</div>' +
              // '<div class="fc-bg">' +
              // '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td class="fc-divider fc-col-resizer '+  this.widgetHeaderClass +'">' +
      '</td>' +
      '<td class="fc-time-area '+ this.widgetHeaderClass +'">' +
        '<div class="fc-scrollpane">' +
          '<div style="overflow-x: scroll; overflow-y: hidden; margin: 0px;">' +
            '<div class="fc-scrollpane-inner">' +
              '<div class="fc-content">' +
                // this.timelineGrid.headHtml() +
              '</div>' +
              // '<div class="fc-bg">' +
              // '</div>' +
            '</div>' +
          '</div>' +
          '<span class="fc-cell-text fc-following" style="position: absolute; z-index: 1000; font-weight: 400; font-size: 14px; font-family: Lato, sans-serif; color: rgb(68, 68, 68); padding: 0px 4px; top: 3px; left: 254.5px;">' +
            'Sun 6/7' +
          '</span>' +
        '</div>' +
      '</td>';
  },


  // Generates an HTML attribute string for setting the width of the week number column, if it is known
  // Determines whether each row should have a constant height
  hasRigidRows: function() {
    var eventLimit = this.opt('eventLimit');
    return eventLimit && typeof eventLimit !== 'number';
  },


  /* Dimensions
  ------------------------------------------------------------------------------------------------------------------*/


  // Refreshes the horizontal dimensions of the view
  updateWidth: function() {
    // Make sure all week number cells running down the side have the same width.
    // Record the width for cells created later.
    this.resourceColWidth = matchCellWidths(
      this.el.find('.fc-resource-name')
    );
  },


  // Adjusts the vertical dimensions of the view to the specified values
  setHeight: function(totalHeight, isAuto) {
    var eventLimit = this.opt('eventLimit');
    var scrollerHeight;

    // reset all heights to be natural
    unsetScroller(this.scrollerEl);
    uncompensateScroll(this.headRowEl);

    this.resourceGrid.removeSegPopover(); // kill the "more" popover if displayed

    // is the event limit a constant level number?
    if (eventLimit && typeof eventLimit === 'number') {
      this.resourceGrid.limitRows(eventLimit); // limit the levels first so the height can redistribute after
    }

    scrollerHeight = this.computeScrollerHeight(totalHeight);
    this.setGridHeight(scrollerHeight, isAuto);

    // is the event limit dynamically calculated?
    if (eventLimit && typeof eventLimit !== 'number') {
      this.resourceGrid.limitRows(eventLimit); // limit the levels after the grid's row heights have been set
    }

    if (!isAuto && setPotentialScroller(this.scrollerEl, scrollerHeight)) { // using scrollbars?

      compensateScroll(this.headRowEl, getScrollbarWidths(this.scrollerEl));

      // doing the scrollbar compensation might have created text overflow which created more height. redo
      scrollerHeight = this.computeScrollerHeight(totalHeight);
      this.scrollerEl.height(scrollerHeight);
    }
  },


  // Sets the height of just the ResourceGrid component in this view
  setGridHeight: function(height, isAuto) {
    if (isAuto) {
      undistributeHeight(this.resourceGrid.rowEls); // let the rows be their natural height with no expanding
    }
    else {
      distributeHeight(this.resourceGrid.rowEls, height, true); // true = compensate for height-hogging rows
    }
  },


  /* Events
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders the given events onto the view and populates the segments array
  renderEvents: function(events) {
    // this.timelineGrid.renderEvents(events);

    this.updateHeight(); // must compensate for events that overflow the row
  },


  // Retrieves all segment objects that are rendered in the view
  getEventSegs: function() {
    return this.timeline.getEventSegs();
  },


  // Unrenders all event elements and clears internal segment data
  unrenderEvents: function() {
    // this.timelineGrid.unrenderEvents();

    // we DON'T need to call updateHeight() because:
    // A) a renderEvents() call always happens after this, which will eventually call updateHeight()
    // B) in IE8, this causes a flash whenever events are rerendered
  },


  /* Dragging (for both events and external elements)
  ------------------------------------------------------------------------------------------------------------------*/


  // A returned value of `true` signals that a mock "helper" event has been rendered.
  renderDrag: function(dropLocation, seg) {
    // return this.timelineGrid.renderDrag(dropLocation, seg);
  },


  unrenderDrag: function() {
    // this.timelineGrid.unrenderDrag();
  },


  /* Selection
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of a selection
  renderSelection: function(range) {
    // this.timelineGrid.renderSelection(range);
  },


  // Unrenders a visual indications of a selection
  unrenderSelection: function() {
    // this.timelineGrid.unrenderSelection();
  }

});

