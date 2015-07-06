TimelineGrid.mixin({
  eventSkeletonEl: null, // has cells with event-containers, which contain absolutely positioned event elements
  eventRowEls: null,
  eventHeight: 22,

  rangeToSegs: function(eventRange) {
    var seg;

    seg = intersectionToSeg(eventRange, this.calRange);
    if (seg) {
      seg.row = eventRange.event.row;
      return [seg];
    } else {
      return [];
    }
  },

  renderFgSegs: function(segs) {
    var rowSegs;

    segs = this.renderFgSegEls(segs); // returns a subset of the segs. segs that were actually rendered

    this.computeSegHorizontals(segs);
    segRows = this.groupSegRows(segs);

    for (row = 0; row < this.rowCnt; row++) { // iterate each column grouping
      rowSegs = segRows[row];
      this.placeSlotSegs(rowSegs);
      this.renderFgRowSegs(segRows[row], $(this.rowEls[row]).find('td'));
    }

    return segs; // return only the segs that were actually rendered
  },

  updateSegHorizontals: function() {
    var allSegs = (this.segs || []).concat(this.businessHourSegs || []);
    var i;

    this.computeSegHorizontals(allSegs);

    for (i = 0; i < allSegs.length; i++) {
      allSegs[i].el.css(
        this.generateSegHorizontalCss(allSegs[i])
      );
    }
  },

  unrenderFgSegs: function(segs) {
    if (this.eventSkeletonEl) {
      this.eventSkeletonEl.remove();
      this.eventSkeletonEl = null;
    }
  },

  groupSegRows: function(segs) {
    var segRows = [];
    var segRow;
    var i;

    for (i = 0; i < this.rowCnt; i++) {
      segRows.push([]);
    }

    for (i = 0; i < segs.length; i++) {
      segRow = segRows[segs[i].row];
      if (segRow) {
        segRow.push(segs[i]);
      }
    }

    return segRows;
  },

  renderFgRowSegs: function(rowSegs, contentEl){
    var containerEl = $('<div class="fc-event-container"/>');

    // assign positioning CSS and insert into container
    for (i = 0; i < rowSegs.length; i++) {
      seg = rowSegs[i];
      seg.el.css(this.generateSegPositionCss(seg));

      containerEl.append(seg.el);
    }

    $(contentEl).append(containerEl);
  },

  fgSegHtml: function(seg, disableResizing){
    var view = this.view;
    var event = seg.event;
    var isDraggable = view.isEventDraggable(event);
    var isResizableFromStart = !disableResizing && seg.isStart && view.isEventResizableFromStart(event);
    var isResizableFromEnd = !disableResizing && seg.isEnd && view.isEventResizableFromEnd(event);
    var classes = this.getSegClasses(seg, isDraggable, isResizableFromStart || isResizableFromEnd);
    var skinCss = cssToStr(this.getEventSkinCss(event));

    classes.push('fc-timeline-event');

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
          (event.title ?
            '<div class="fc-title">' +
              htmlEscape(event.title) +
            '</div>' :
            ''
            ) +
        '</div>' +
        '<div class="fc-bg"/>' +
        (isResizableFromStart ?
          '<div class="fc-resizer fc-start-resizer" />' :
          ''
          ) +
        (isResizableFromEnd ?
          '<div class="fc-resizer fc-end-resizer" />' :
          ''
          ) +
      '</a>';
  },

  computeSegHorizontals: function(segs) {
    var i, seg;

    for (i = 0; i < segs.length; i++) {
      seg = segs[i];

      seg.left = this.computeX(seg.start, this.start, true);
      seg.right = this.computeX(seg.end, this.start, false);
    }
  },

  computeX: function(end, start, isStart) {
    var duration = moment.duration(
        end.clone().stripZone() - start.clone().stripTime()
      )
    return this.computeSegLeft(duration, isStart);
  },

  computeSegLeft: function(time, isStart) {
    var slatCoverage = time / this.slotDuration;
    var slatIndex;
    var slatRemainder;
    var slatLeft;
    var slatRight;

    slatCoverage = Math.max(0, slatCoverage);
    slatCoverage = Math.min(this.slatEls.length, slatCoverage);

    slatIndex = Math.floor(slatCoverage); // an integer index of the furthest whole slot
    slatRemainder = slatCoverage - slatIndex;
    slatLeft = this.slatLefts[slatIndex]; // the left position of the furthest whole slot

    if (slatRemainder) { // time spans part-way into the slot
      if (isStart) return slatLeft;
      slatRight = this.slatLefts[slatIndex + 1];
      return slatRight;
    } else {
      return slatLeft;
    }
  },

  computeSlatLefts: function() {
    var lefts = [];
    var left;

    this.slatEls.each(function(i, node) {
      left = $(node).position().left;
      lefts.push(left);
    });

    lefts.push(left + this.slatEls.last().outerWidth()); // width of the last slat

    this.slatLefts = lefts;
  },

  updateSize: function(isResize) { // NOT a standard Grid method
    this.computeSlatLefts();

    if (isResize) {
      this.updateSegHorizontals();
    }
  },

  generateSegPositionCss: function(seg) {
    var backwardCoord = seg.backwardCoord; // the left side if LTR. the right side if RTL. floating-point
    var forwardCoord = seg.forwardCoord; // the right side if LTR. the left side if RTL. floating-point
    var props = this.generateSegHorizontalCss(seg); // get top/bottom first
    var top;
    var bottom;

    top = 1 - forwardCoord;
    bottom = backwardCoord;

    props.zIndex = seg.level + 1; // convert from 0-base to 1-based
    props.top = seg.level * this.eventHeight + 'px';
    return props;
  },

  generateSegHorizontalCss: function(seg) {
    return {
      left: seg.left,
      right: -seg.right
    };
  },

  // Given an array of segments that are all in the same column, sets the backwardCoord and forwardCoord on each.
  // NOTE: Also reorders the given array by start time!
  placeSlotSegs(segs) {
    var levels;
    var level0;
    var i;

    segs.sort(compareSegs); // order by date
    this.buildSlotSegLevels(segs);
  },

  buildSlotSegLevels(segs) {
    var levels = [];
    var i, seg;
    var j;

    for (i=0; i<segs.length; i++) {
      seg = segs[i];

      // go through all the levels and stop on the first level where there are no collisions
      for (j=0; j<levels.length; j++) {
        if (!this.computeSlotSegCollisions(seg, levels[j]).length) {
          break;
        }
      }

      seg.level = j;

      (levels[j] || (levels[j] = [])).push(seg);
    }

    return levels;
  },

  isSlotSegCollision: function(seg1, seg2) {
    return seg1.right > seg2.left && seg1.left < seg2.right;
  },

  computeSlotSegCollisions(seg, otherSegs, results) {
    results = results || [];

    for (var i=0; i<otherSegs.length; i++) {
      if (this.isSlotSegCollision(seg, otherSegs[i])) {
        results.push(otherSegs[i]);
      }
    }

    return results;
  },

  /* Event Drag Visualization
  ------------------------------------------------------------------------------------------------------------------*/


  // Renders a visual indication of an event being dragged over the specified date(s).
  // dropLocation's end might be null, as well as `seg`. See Grid::renderDrag for more info.
  // A returned value of `true` signals that a mock "helper" event has been rendered.
  renderDrag: function(dropLocation, seg) {
    debugger

    if (seg) { // if there is event information for this drag, render a helper event
      this.renderRangeHelper(dropLocation, seg);
      this.applyDragOpacity(this.helperEl);

      return true; // signal that a helper has been rendered
    }
    else {
      // otherwise, just render a highlight
      this.renderHighlight(this.eventRangeToSegs(dropLocation));
    }
  },


  // Unrenders any visual indication of an event being dragged
  unrenderDrag: function() {
    this.unrenderHelper();
    this.unrenderHighlight();
  },


});

