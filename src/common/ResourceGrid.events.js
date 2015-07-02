
/* Event-rendering methods for the TimeGrid class
----------------------------------------------------------------------------------------------------------------------*/

ResourceGrid.mixin({
  // Foreground event
  renderFgSegs: function(segs) {
    segs = this.renderFgSegEls(segs); // returns a subset of the segs. segs that were actually rendered

    this.el.append(
      this.eventSkeletonEl = $('<div class="fc-content-skeleton"/>')
        .append(this.renderSegTable(segs))
    );

    return segs; // return only the segs that were actually rendered
  },

  // Unrenders all currently rendered foreground event segments
  unrenderFgSegs: function(segs) {
    if (this.eventSkeletonEl) {
      this.eventSkeletonEl.remove();
      this.eventSkeletonEl = null;
    }
  },

  placeSlotSegs: function(segs) {
    var levels;
    var level0;
    var i;

    segs.sort(compareSegs); // order by date
    levels = buildSlotSegLevels(segs);
    computeForwardSlotSegs(levels);

    if ((level0 = levels[0])) {

      for (i = 0; i < level0.length; i++) {
        computeSlotSegPressures(level0[i]);
      }

      for (i = 0; i < level0.length; i++) {
        computeSlotSegCoords(level0[i], 0, 0);
      }
    }
  },

  renderSegTable: function(segs) {
    var tableEl = $('<table><tr/></table>');
    var trEl = tableEl.find('tr');
    var segRows;
    var i, seg;
    var row, rowSegs;
    var containerEl;

    segRows = this.groupSegRows(segs); // group into sub-arrays, and assigns 'row' to each seg

    // this.computeSegVerticals(segs); // compute and assign top/bottom

    for (row = 0; row < segRows.length; row++) { // iterate each column grouping
      rowSegs = segRows[row];
      this.placeSlotSegs(rowSegs); // compute horizontal coordinates, z-index's, and reorder the array

      containerEl = $('<div class="fc-event-container"/>');

      // assign positioning CSS and insert into container
      for (i = 0; i < rowSegs.length; i++) {
        seg = rowSegs[i];
        seg.el.css(this.generateSegPositionCss(seg));

        // if the height is short, add a className for alternate styling
        // if (seg.bottom - seg.top < 30) {
        //  seg.el.addClass('fc-short');
        // }

        containerEl.append(seg.el);
      }

      trEl.append($('<td/>').append(containerEl));
    }

    this.bookendCells(trEl, 'eventSkeleton');

    return tableEl;
  },

  generateSegPositionCss: function(seg) {
    return {};
  },

  groupSegRows: function(segs) {
    var segRows = [];
    var i;

    for (i = 0; i < this.rowCnt; i++) {
      segRows.push([]);
    }

    i = 0;
    for (i = 0; i < segs.length; i++) {
      row = this.resourceIdToRow(segs[i].event.resource);
      segs[i].row = row;
      segRows[row].push(segs[i]);
    }

    return segRows;
  },

  resourceIdToRow: function(resourceId) {
    var i;
    var resource;
    for (i = 0; i < this.resources.length; i++) {
      resource = this.resources[i];
      if (resourceId == resource.id) {
        return i;
      }
    }
    return -1;
  },

  fgSegHtml: function(seg, disableResizing) {
    var view = this.view;
    var event = seg.event;
    var isDraggable = view.isEventDraggable(event);
    var isResizableFromStart = !disableResizing && seg.isStart && view.isEventResizableFromStart(event);
    var isResizableFromEnd = !disableResizing && seg.isEnd && view.isEventResizableFromEnd(event);
    var classes = this.getSegClasses(seg, isDraggable, isResizableFromStart || isResizableFromEnd);
    var skinCss = cssToStr(this.getEventSkinCss(event));
    var timeText;
    var fullTimeText; // more verbose time text. for the print stylesheet
    var startTimeText; // just the start time text

    classes.unshift('fc-time-grid-event', 'fc-v-event');

    if (view.isMultiDayEvent(event)) { // if the event appears to span more than one day...
      // Don't display time text on segments that run entirely through a day.
      // That would appear as midnight-midnight and would look dumb.
      // Otherwise, display the time text for the *segment's* times (like 6pm-midnight or midnight-10am)
      if (seg.isStart || seg.isEnd) {
        timeText = this.getEventTimeText(seg);
        fullTimeText = this.getEventTimeText(seg, 'LT');
        startTimeText = this.getEventTimeText(seg, null, false); // displayEnd=false
      }
    } else {
      // Display the normal time text for the *event's* times
      timeText = this.getEventTimeText(event);
      fullTimeText = this.getEventTimeText(event, 'LT');
      startTimeText = this.getEventTimeText(event, null, false); // displayEnd=false
    }

    return '<a class="' + classes.join(' ') + '"' +
      (event.url ?
        ' href="' + htmlEscape(event.url) + '"' :
        ''
        ) +
      (skinCss ?
        ' style="' + skinCss + '"' :
        ''
        ) +
      '>' +
        '<div class="fc-content">' +
          (timeText ?
            '<div class="fc-time"' +
            ' data-start="' + htmlEscape(startTimeText) + '"' +
            ' data-full="' + htmlEscape(fullTimeText) + '"' +
            '>' +
              '<span>' + htmlEscape(timeText) + '</span>' +
            '</div>' :
            ''
            ) +
          (event.title ?
            '<div class="fc-title">' +
              htmlEscape(event.title) +
            '</div>' :
            ''
            ) +
        '</div>' +
        '<div class="fc-bg"/>' +
        /* TODO: write CSS for this
        (isResizableFromStart ?
          '<div class="fc-resizer fc-start-resizer" />' :
          ''
          ) +
        */
        (isResizableFromEnd ?
          '<div class="fc-resizer fc-end-resizer" />' :
          ''
          ) +
      '</a>';
  },
});
