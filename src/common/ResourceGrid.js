
var ResourceGrid = Grid.extend({

	bottomCoordPadding: 0, // hack for extending the hit area for the last row of the coordinate grid

	colDates: null, // flat chronological array of each cell's dates
	dayToCellOffsets: null, // maps days offsets from grid's start date, to cell offsets

	minTime: null, // Duration object that denotes the first visible time of any given day
	maxTime: null, // Duration object that denotes the exclusive visible end time of any given day

	rowEls: null, // set of fake row elements
	dayEls: null, // set of whole-day elements comprising the row's background
	helperEls: null, // set of cell skeleton elements for rendering the mock event "helper"

  resources: [],
  cells: {},

	constructor: function() {
		Grid.apply(this, arguments);

		this.processOptions();
		this.cellDuration = moment.duration(1, 'day'); // for Grid system
	},


	// Renders the rows and columns into the component's `this.el`, which should already be assigned.
	// isRigid determins whether the individual rows should ignore the contents and be a constant height.
	// Relies on the view's colCnt and rowCnt. In the future, this component should probably be self-sufficient.
	renderDates: function(isRigid) {
		var view = this.view;
    var resources = this.resources;
		var rowCnt = resources.length;
		var colCnt = this.colCnt;
		var html = '';
		var row;
		var i, cell;

		for (row = 0; row < rowCnt; row++) {
			html += this.resourceRowHtml(resources[row], row, isRigid);
		}
		this.el.html(html);

		this.rowEls = this.el.find('.fc-row');
		this.dayEls = this.el.find('.fc-day');

		for (row = 0; row < rowCnt; row++) {
      for (i = 0; i < colCnt; i++) {
        cell = this.getCell(resources[row], i);
        view.trigger('resourceRender', null, cell.start, this.dayEls.eq(i));
      }
    }
	},


	unrenderDates: function() {
		this.removeSegPopover();
	},


	renderBusinessHours: function() {
		// var events = this.view.calendar.getBusinessHoursEvents(true); // wholeDay=true
		// var segs = this.eventsToSegs(events);
    //
		// this.renderFill('businessHours', segs, 'bgevent');
	},


	// Generates the HTML for a single row. `row` is the row number.
	resourceRowHtml: function(resource, row, isRigid) {
		var view = this.view;
		var classes = [ 'fc-row', 'fc-week', view.widgetContentClass ];

		if (isRigid) {
			classes.push('fc-rigid');
		}

		return '' +
			'<div class="' + classes.join(' ') + '">' +
				'<div class="fc-bg">' +
					'<table>' +
						this.rowHtml('resource', row) + // leverages RowRenderer. calls dayCellHtml()
					'</table>' +
				'</div>' +
				'<div class="fc-content-skeleton">' +
					'<table>' +
						// (this.numbersVisible ?
						// 	'<thead>' +
						// 		this.rowHtml('number', row) + // leverages RowRenderer. View will define render method
						// 	'</thead>' :
						// 	''
						// 	) +
					'</table>' +
				'</div>' +
			'</div>';
	},

	// Renders a day-of-week header row.
	// TODO: move to another class. not applicable to all Grids
	headHtml: function() {
		return '' +
			'<div class="fc-row ' + this.view.widgetHeaderClass + '">' +
				'<table>' +
					'<thead>' +
						this.rowHtml('head') + // leverages RowRenderer
					'</thead>' +
				'</table>' +
			'</div>';
	},


	// Renders the HTML for a whole-day cell. Will eventually end up in the day-row's background.
	// We go through a 'day' row type instead of just doing a 'bg' row type so that the View can do custom rendering
	// specifically for whole-day rows, whereas a 'bg' might also be used for other purposes (TimeGrid bg for example).
	resourceCellHtml: function(cell) {
		return this.bgCellHtml(cell);
	},


	/* Options
	------------------------------------------------------------------------------------------------------------------*/


	processOptions: function() {
		var view = this.view;
		this.resources = view.opt('resources');
    this.rowCnt = this.resources.length;
		this.minTime = moment.duration(view.opt('minTime'));
		this.maxTime = moment.duration(view.opt('maxTime'));
	},


	// Computes a default column header formatting string if `colFormat` is not explicitly defined
	computeColHeadFormat: function() {
		if (this.rowCnt > 1) { // more than one week row. day numbers will be in each cell
			return 'ddd'; // "Sat"
		}
		else if (this.colCnt > 1) { // multiple days, so full single date string WON'T be in title text
			return this.view.opt('dayOfMonthFormat'); // "Sat 12/10"
		}
		else { // single day, so full single date string will probably be in title text
			return 'dddd'; // "Saturday"
		}
	},


	// Computes a default event time formatting string if `timeFormat` is not explicitly defined
	computeEventTimeFormat: function() {
		return this.view.opt('extraSmallTimeFormat'); // like "6p" or "6:30p"
	},


	// Computes a default `displayEventEnd` value if one is not expliclty defined
	computeDisplayEventEnd: function() {
		return this.colCnt == 1; // we'll likely have space if there's only one day
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
	},


	getCell: function(resourceId, col) {
		var cell;

		cell = { resource: resourceId, col: col };

		// $.extend(cell, this.getRowData(resourceId), this.getColData(col));
		$.extend(cell, this.computeCellRange(cell));

		return cell;
	},


	// Given a cell object, generates its start date. Returns a reference-free copy.
	computeCellDate: function(cell) {
		var date = this.colDates[cell.col];
		return date;
	},


	// Retrieves the element representing the given row
	getRowEl: function(row) {
		return this.rowEls.eq(row);
	},


	// Retrieves the element representing the given column
	getColEl: function(col) {
		return this.dayEls.eq(col);
	},


	// Gets the whole-day element associated with the cell
	getCellDayEl: function(cell) {
		return this.dayEls.eq(cell.row * this.colCnt + cell.col);
	},


	// Overrides Grid's method for when row coordinates are computed
	computeRowCoords: function() {
		var rowCoords = Grid.prototype.computeRowCoords.call(this); // call the super-method

		// hack for extending last row (used by AgendaView)
		rowCoords[rowCoords.length - 1].bottom += this.bottomCoordPadding;

		return rowCoords;
	},


	/* Dates
	------------------------------------------------------------------------------------------------------------------*/


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


	// Given a date, returns its chronolocial cell-offset from the first cell of the grid.
	// If the date lies between cells (because of hiddenDays), returns a floating-point value between offsets.
	// If before the first offset, returns a negative number.
	// If after the last offset, returns an offset past the last cell offset.
	// Only works for *start* dates of cells. Will not work for exclusive end dates for cells.
	dateToCellOffset: function(date) {
		var offsets = this.dayToCellOffsets;
		var day = date.diff(this.start, 'days');

		if (day < 0) {
			return offsets[0] - 1;
		}
		else if (day >= offsets.length) {
			return offsets[offsets.length - 1] + 1;
		}
		else {
			return offsets[day];
		}
	},


	/* Event Drag Visualization
	------------------------------------------------------------------------------------------------------------------*/
	// TODO: move to DayGrid.event, similar to what we did with Grid's drag methods


	// Renders a visual indication of an event or external element being dragged.
	// The dropLocation's end can be null. seg can be null. See Grid::renderDrag for more info.
	renderDrag: function(dropLocation, seg) {

		// always render a highlight underneath
		this.renderHighlight(this.eventRangeToSegs(dropLocation));

		// if a segment from the same calendar but another component is being dragged, render a helper event
		if (seg && !seg.el.closest(this.el).length) {

			this.renderRangeHelper(dropLocation, seg);
			this.applyDragOpacity(this.helperEls);

			return true; // a helper has been rendered
		}
	},


	// Unrenders any visual indication of a hovering event
	unrenderDrag: function() {
		this.unrenderHighlight();
		this.unrenderHelper();
	},


	/* Event Resize Visualization
	------------------------------------------------------------------------------------------------------------------*/


	// Renders a visual indication of an event being resized
	renderEventResize: function(range, seg) {
		this.renderHighlight(this.eventRangeToSegs(range));
		this.renderRangeHelper(range, seg);
	},


	// Unrenders a visual indication of an event being resized
	unrenderEventResize: function() {
		this.unrenderHighlight();
		this.unrenderHelper();
	},


	/* Event Helper
	------------------------------------------------------------------------------------------------------------------*/


	// Renders a mock "helper" event. `sourceSeg` is the associated internal segment object. It can be null.
	renderHelper: function(event, sourceSeg) {
		var helperNodes = [];
		var segs = this.eventsToSegs([ event ]);
		var rowStructs;

		segs = this.renderFgSegEls(segs); // assigns each seg's el and returns a subset of segs that were rendered
		rowStructs = this.renderSegRows(segs);

		// inject each new event skeleton into each associated row
		this.rowEls.each(function(row, rowNode) {
			var rowEl = $(rowNode); // the .fc-row
			var skeletonEl = $('<div class="fc-helper-skeleton"><table/></div>'); // will be absolutely positioned
			var skeletonTop;

			// If there is an original segment, match the top position. Otherwise, put it at the row's top level
			if (sourceSeg && sourceSeg.row === row) {
				skeletonTop = sourceSeg.el.position().top;
			}
			else {
				skeletonTop = rowEl.find('.fc-content-skeleton tbody').position().top;
			}

			skeletonEl.css('top', skeletonTop)
				.find('table')
					.append(rowStructs[row].tbodyEl);

			rowEl.append(skeletonEl);
			helperNodes.push(skeletonEl[0]);
		});

		this.helperEls = $(helperNodes); // array -> jQuery set
	},


	// Unrenders any visual indication of a mock helper event
	unrenderHelper: function() {
		if (this.helperEls) {
			this.helperEls.remove();
			this.helperEls = null;
		}
	},


	/* Fill System (highlight, background events, business hours)
	------------------------------------------------------------------------------------------------------------------*/


	fillSegTag: 'td', // override the default tag name


	// Renders a set of rectangles over the given segments of days.
	// Only returns segments that successfully rendered.
	renderFill: function(type, segs, className) {
		// var nodes = [];
		// var i, seg;
		// var skeletonEl;
    //
		// segs = this.renderFillSegEls(type, segs); // assignes `.el` to each seg. returns successfully rendered segs
    //
		// for (i = 0; i < segs.length; i++) {
		// 	seg = segs[i];
		// 	skeletonEl = this.renderFillRow(type, seg, className);
		// 	this.rowEls.eq(seg.row).append(skeletonEl);
		// 	nodes.push(skeletonEl[0]);
		// }
    //
		// this.elsByFill[type] = $(nodes);
    //
		// return segs;
	},


	// // Generates the HTML needed for one row of a fill. Requires the seg's el to be rendered.
	renderFillRow: function(type, seg, className) {
		// var colCnt = this.colCnt;
		// var startCol = seg.leftCol;
		// var endCol = seg.rightCol + 1;
		// var skeletonEl;
		// var trEl;
    //
		// className = className || type.toLowerCase();
    //
		// skeletonEl = $(
		// 	'<div class="fc-' + className + '-skeleton">' +
		// 		'<table><tr/></table>' +
		// 	'</div>'
		// );
		// trEl = skeletonEl.find('tr');
    //
		// if (startCol > 0) {
		// 	trEl.append('<td colspan="' + startCol + '"/>');
		// }
    //
		// trEl.append(
		// 	seg.el.attr('colspan', endCol - startCol)
		// );
    //
		// if (endCol < colCnt) {
		// 	trEl.append('<td colspan="' + (colCnt - endCol) + '"/>');
		// }
    //
		// this.bookendCells(trEl, type);
    //
		// return skeletonEl;
	}

});
