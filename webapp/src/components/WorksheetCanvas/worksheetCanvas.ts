import { Model } from "@ironcalc/wasm";
import { WorkbookState } from "../workbookState";
import {
  defaultTextColor,
  gridColor,
  gridSeparatorColor,
  headerBackground,
  headerBorderColor,
  headerSelectedBackground,
  headerSelectedColor,
  headerTextColor,
  lastColumn,
  lastRow,
  outlineColor,
} from "./constants";
import { columnNameFromNumber } from "./util";

export interface CanvasSettings {
  model: Model;
  width: number;
  height: number;
  workbookState: WorkbookState;
  elements: {
    canvas: HTMLCanvasElement;
    cellOutline: HTMLDivElement;
    areaOutline: HTMLDivElement;
    cellOutlineHandle: HTMLDivElement;
    extendToOutline: HTMLDivElement;
    columnGuide: HTMLDivElement;
    rowGuide: HTMLDivElement;
    columnHeaders: HTMLDivElement;
  };
  onColumnWidthChanges: (sheet: number, column: number, width: number) => void;
  onRowHeightChanges: (sheet: number, row: number, height: number) => void;
}

export interface CellCoordinates {
  row: number;
  column: number;
}

export const fonts = {
  regular: 'Inter, "Adjusted Arial Fallback", sans-serif',
  mono: '"Fira Mono", "Adjusted Courier New Fallback", serif',
};

export const headerRowHeight = 24;
export const headerColumnWidth = 30;
export const devicePixelRatio = window.devicePixelRatio || 1;

export const defaultCellFontFamily = fonts.regular;
export const headerFontFamily = fonts.regular;
export const frozenSeparatorWidth = 3;

export default class WorksheetCanvas {
  sheetWidth: number;

  sheetHeight: number;

  width: number;

  height: number;

  ctx: CanvasRenderingContext2D;

  canvas: HTMLCanvasElement;

  areaOutline: HTMLDivElement;

  cellOutline: HTMLDivElement;

  cellOutlineHandle: HTMLDivElement;

  extendToOutline: HTMLDivElement;

  workbookState: WorkbookState;

  model: Model;

  rowGuide: HTMLDivElement;

  columnHeaders: HTMLDivElement;

  columnGuide: HTMLDivElement;

  onColumnWidthChanges: (sheet: number, column: number, width: number) => void;

  onRowHeightChanges: (sheet: number, row: number, height: number) => void;

  constructor(options: CanvasSettings) {
    this.model = options.model;
    this.sheetWidth = 0;
    this.sheetHeight = 0;
    this.canvas = options.elements.canvas;
    this.width = options.width;
    this.height = options.height;
    this.ctx = this.setContext();
    this.workbookState = options.workbookState;

    this.cellOutline = options.elements.cellOutline;
    this.cellOutlineHandle = options.elements.cellOutlineHandle;
    this.areaOutline = options.elements.areaOutline;
    this.extendToOutline = options.elements.extendToOutline;
    this.rowGuide = options.elements.rowGuide;
    this.columnGuide = options.elements.columnGuide;
    this.columnHeaders = options.elements.columnHeaders;

    // this.cellEditing = options.cellEditing;
    this.onColumnWidthChanges = options.onColumnWidthChanges;
    this.onRowHeightChanges = options.onRowHeightChanges;
    this.resetHeaders();
  }

  setScrollPosition(scrollPosition: {left: number; top: number;}): void {
    // We ony scroll whole rows and whole columns
    // left, top are maximized with constraints:
    //    1. left <= scrollPosition.left
    //    2. top <= scrollPosition.top
    //    3. (left, top) are the absolute coordinates of a cell
    const { left } = this.getBoundedColumn(scrollPosition.left);
    const { top } = this.getBoundedRow(scrollPosition.top);
    this.workbookState.setScroll({ left, top });
  }

  resetHeaders(): void {
    for (const handle of this.columnHeaders.querySelectorAll(
      ".column-resize-handle"
    )) {
      handle.remove();
    }
    for (const columnSeparator of this.columnHeaders.querySelectorAll(
      ".frozen-column-separator"
    )) {
      columnSeparator.remove();
    }
    for (const header of this.columnHeaders.children) {
      (header as HTMLDivElement).classList.add("column-header");
    }
  }

  setContext(): CanvasRenderingContext2D {
    const { canvas, width, height } = this;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(
        "This browser does not support 2-dimensional canvas rendering contexts."
      );
    }
    // If the devicePixelRatio is 2 then the canvas is twice as large to avoid blurring.
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.scale(devicePixelRatio, devicePixelRatio);
    return context;
  }

  setSize(size: { width: number; height: number }): void {
    this.width = size.width;
    this.height = size.height;
    this.ctx = this.setContext();
  }

  /**
   * This is the height of the frozen rows including the width of the separator
   * It returns 0 if the are no frozen rows
   */
  getFrozenRowsHeight(): number {
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    if (frozenRows === 0) {
      return 0;
    }
    let frozenRowsHeight = 0;
    for (let row = 1; row <= frozenRows; row += 1) {
      frozenRowsHeight += this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
    }
    return frozenRowsHeight + frozenSeparatorWidth;
  }

  /**
   * This is the width of the frozen columns including the width of the separator
   * It returns 0 if the are no frozen columns
   */
  getFrozenColumnsWidth(): number {
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    if (frozenColumns === 0) {
      return 0;
    }
    let frozenColumnsWidth = 0;
    for (let column = 1; column <= frozenColumns; column += 1) {
      frozenColumnsWidth += this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        column
      );
    }
    return frozenColumnsWidth + frozenSeparatorWidth;
  }

  // Get the visible cells (aside from the frozen rows and columns)
  getVisibleCells(): {
    topLeftCell: CellCoordinates;
    bottomRightCell: CellCoordinates;
  } {
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    const scroll = this.workbookState.getScroll();
    let rowTop = frozenRows + 1;
    let rowBottom = frozenRows + 1;
    let columnLeft = frozenColumns + 1;
    let columnRight = frozenColumns + 1;
    const frozenColumnsWidth = this.getFrozenColumnsWidth();
    const frozenRowsHeight = this.getFrozenRowsHeight();
    let y = headerRowHeight + frozenRowsHeight - scroll.top;
    for (let row = frozenRows + 1; row <= lastRow; row += 1) {
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
      if (y >= this.height - rowHeight || row === lastRow) {
        rowBottom = row;
        break;
      } else if (y < headerRowHeight + frozenRowsHeight) {
        y += rowHeight;
        rowTop = row + 1;
      } else {
        y += rowHeight;
      }
    }

    let x =
      headerColumnWidth + frozenColumnsWidth - scroll.left;
    for (let column = frozenColumns + 1; column <= lastColumn; column += 1) {
      const columnWidth = this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        column
      );
      if (x >= this.width - columnWidth || column === lastColumn) {
        columnRight = column;
        break;
      } else if (x < headerColumnWidth + frozenColumnsWidth) {
        x += columnWidth;
        columnLeft = column + 1;
      } else {
        x += columnWidth;
      }
    }
    return {
      topLeftCell: { row: rowTop, column: columnLeft },
      bottomRightCell: { row: rowBottom, column: columnRight },
    };
  }

  /**
   * Returns the {row, top} of the row whose upper y coordinate (top) is maximum and less or equal than maxTop
   * Both top and maxTop are absolute coordinates
   */
  getBoundedRow(maxTop: number): { row: number; top: number } {
    let top = 0;
    let row = 1 + this.model.getFrozenRowsCount(this.workbookState.getSelectedSheet());
    while (row <= lastRow && top <= maxTop) {
      const height = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
      if (top + height <= maxTop) {
        top += height;
      } else {
        break;
      }
      row += 1;
    }
    return { row, top };
  }

  private getBoundedColumn(maxLeft: number): { column: number; left: number } {
    let left = 0;
    let column =
      1 + this.model.getFrozenColumnsCount(this.workbookState.getSelectedSheet());
    while (left <= maxLeft && column <= lastColumn) {
      const width = this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        column
      );
      if (width + left <= maxLeft) {
        left += width;
      } else {
        break;
      }
      column += 1;
    }
    return { column, left };
  }

  /**
   * Returns the minimum we can scroll to the left so that
   * targetColumn is fully visible.
   * Returns the the first visible column and the scrollLeft position
   */
  getMinScrollLeft(targetColumn: number): number {
    const columnStart =
      1 + this.model.getFrozenColumnsCount(this.workbookState.getSelectedSheet());
    /** Distance from the first non frozen cell to the right border of column*/
    let distance = 0;
    for (let column = columnStart; column <= targetColumn; column += 1) {
      const width = this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        column
      );
      distance += width;
    }
    /** Minimum we need to scroll so that `column` is visible */
    const minLeft =
      distance - this.width + this.getFrozenColumnsWidth() + headerColumnWidth;

    // Because scrolling is quantified, we only scroll whole columns,
    // we need to find the minimum quantum that is larger than minLeft
    let left = 0;
    for (let column = columnStart; column <= lastColumn; column += 1) {
      const width = this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        column
      );
      if (left < minLeft) {
        left += width;
      } else {
        break;
      }
    }
    return left;
  }

  private renderCell(
    row: number,
    column: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const style = this.model.getCellStyle(
      this.workbookState.getSelectedSheet(),
      row,
      column
    );

    let backgroundColor = "#FFFFFF";
    if (style.fill.fg_color) {
      backgroundColor = style.fill.fg_color;
    }

    const fontSize = 13;
    let font = `${fontSize}px ${defaultCellFontFamily}`;
    let textColor = defaultTextColor;
    if (style.font) {
      textColor = style.font.color;
      font = style.font.b ? `bold ${font}` : `400 ${font}`;
      if (style.font.i) {
        font = `italic ${font}`;
      }
    }
    let horizontalAlign = "general";
    if (style.alignment && style.alignment.horizontal) {
      horizontalAlign = style.alignment.horizontal;
    }
    let verticalAlign = "bottom";
    if (style.alignment && style.alignment.vertical) {
      verticalAlign = style.alignment.vertical;
    }

    const context = this.ctx;
    context.font = font;
    context.fillStyle = backgroundColor;
    context.fillRect(x, y, width, height);
    context.strokeStyle = gridColor;
    context.strokeRect(x, y, width, height);
    context.fillStyle = textColor;

    // Number = 1,
    // Text = 2,
    // LogicalValue = 4,
    // ErrorValue = 16,
    // Array = 64,
    // CompoundData = 128,

    const cellType = this.model.getCellType(
      this.workbookState.getSelectedSheet(),
      row,
      column
    );
    const fullText = this.model.getFormattedCellValue(
      this.workbookState.getSelectedSheet(),
      row,
      column
    );
    const padding = 4;
    if (horizontalAlign === "general") {
      if (cellType === 1) {
        horizontalAlign = "right";
      } else if (cellType === 4) {
        horizontalAlign = "center";
      } else {
        horizontalAlign = "left";
      }
    }

    // Create a rectangular clipping region
    context.save();
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();

    // Is there any better parameter?
    const lineHeight = fontSize;

    fullText.split("\n").forEach((text, line) => {
      const textWidth = context.measureText(text).width;
      let textX;
      let textY;
      // The idea is that in the present font-size and default row heigh,
      // top/bottom and center horizontalAlign coincide
      let verticalPadding = 4;
      if (horizontalAlign === "right") {
        textX = width - padding + x - textWidth / 2;
        
      } else if (horizontalAlign === "center") {
        textX = x + width / 2;
      } else {
        // left aligned
        textX = padding + x + textWidth / 2;
      }
      if (verticalAlign === "bottom") {
        textY = y + height - fontSize/2 - verticalPadding;
      } else if (verticalAlign === "center") {
        textY = y + height / 2;
      } else {
        // aligned top
        textY = y + fontSize/2 + verticalPadding;
      }
      textY += line * lineHeight;
      context.fillText(text, textX, textY);
      if (style.font) {
        if (style.font.u) {
          // There are no text-decoration in canvas. You have to do the underline yourself.
          const offset = Math.floor(fontSize / 2);
          context.beginPath();
          context.strokeStyle = textColor;
          context.lineWidth = 1;
          context.moveTo(textX - textWidth / 2, textY + offset);
          context.lineTo(textX + textWidth / 2, textY + offset);
          context.stroke();
        }
        if (style.font.strike) {
          // There are no text-decoration in canvas. You have to do the strikethrough yourself.
          context.beginPath();
          context.strokeStyle = textColor;
          context.lineWidth = 1;
          context.moveTo(textX - textWidth / 2, textY);
          context.lineTo(textX + textWidth / 2, textY);
          context.stroke();
        }
      }
    });

    // remove the clipping region
    context.restore();
  }

  // Column and row headers with their handles
  private addColumnResizeHandle(
    x: number,
    column: number,
    columnWidth: number
  ): void {
    const div = document.createElement("div");
    div.className = "column-resize-handle";
    div.style.left = `${x - 1}px`;
    div.style.height = `${headerRowHeight}px`;
    this.columnHeaders.insertBefore(div, null);

    let initPageX = 0;
    const resizeHandleMove = (event: MouseEvent): void => {
      if (columnWidth + event.pageX - initPageX > 0) {
        div.style.left = `${x + event.pageX - initPageX - 1}px`;
        this.columnGuide.style.left = `${
          headerColumnWidth + x + event.pageX - initPageX
        }px`;
      }
    };
    let resizeHandleUp = (event: MouseEvent): void => {
      div.style.opacity = "0";
      this.columnGuide.style.display = "none";
      document.removeEventListener("mousemove", resizeHandleMove);
      document.removeEventListener("mouseup", resizeHandleUp);
      const newColumnWidth = columnWidth + event.pageX - initPageX;
      this.onColumnWidthChanges(
        this.workbookState.getSelectedSheet(),
        column,
        newColumnWidth
      );
    };
    resizeHandleUp = resizeHandleUp.bind(this);
    div.addEventListener("mousedown", (event) => {
      div.style.opacity = "1";
      this.columnGuide.style.display = "block";
      this.columnGuide.style.left = `${headerColumnWidth + x}px`;
      initPageX = event.pageX;
      document.addEventListener("mousemove", resizeHandleMove);
      document.addEventListener("mouseup", resizeHandleUp);
    });
  }

  private addRowResizeHandle(y: number, row: number, rowHeight: number): void {
    const div = document.createElement("div");
    div.className = "row-resize-handle";
    div.style.top = `${y - 1}px`;
    div.style.width = `${headerColumnWidth}px`;
    const sheet = this.workbookState.getSelectedSheet();
    this.canvas.parentElement?.insertBefore(div, null);
    let initPageY = 0;
    /* istanbul ignore next */
    const resizeHandleMove = (event: MouseEvent): void => {
      if (rowHeight + event.pageY - initPageY > 0) {
        div.style.top = `${y + event.pageY - initPageY - 1}px`;
        this.rowGuide.style.top = `${y + event.pageY - initPageY}px`;
      }
    };
    let resizeHandleUp = (event: MouseEvent): void => {
      div.style.opacity = "0";
      this.rowGuide.style.display = "none";
      document.removeEventListener("mousemove", resizeHandleMove);
      document.removeEventListener("mouseup", resizeHandleUp);
      const newRowHeight = rowHeight + event.pageY - initPageY - 1;
      this.onRowHeightChanges(sheet, row, newRowHeight);
    };
    resizeHandleUp = resizeHandleUp.bind(this);
    /* istanbul ignore next */
    div.addEventListener("mousedown", (event) => {
      div.style.opacity = "1";
      this.rowGuide.style.display = "block";
      this.rowGuide.style.top = `${y}px`;
      initPageY = event.pageY;
      document.addEventListener("mousemove", resizeHandleMove);
      document.addEventListener("mouseup", resizeHandleUp);
    });
  }

  private styleColumnHeader(
    width: number,
    div: HTMLDivElement,
    selected: boolean
  ): void {
    div.style.boxSizing = "border-box";
    div.style.width = `${width}px`;
    div.style.height = `${headerRowHeight}px`;
    div.style.backgroundColor = selected
      ? headerSelectedBackground
      : headerBackground;
    div.style.color = selected ? headerSelectedColor : headerTextColor;
    div.style.fontWeight = "bold";
    div.style.border = `1px solid ${headerBorderColor}`;
    if (selected) {
      div.style.borderBottom = `1px solid ${outlineColor}`;
      div.classList.add("selected");
    } else {
      div.classList.remove("selected");
    }
  }

  private removeHandles(): void {
    const root = this.canvas.parentElement;
    if (root) {
      for (const handle of root.querySelectorAll(".row-resize-handle"))
        handle.remove();
    }
  }

  private renderRowHeaders(
    frozenRows: number,
    topLeftCell: CellCoordinates,
    bottomRightCell: CellCoordinates
  ): void {
    let { rowStart, rowEnd } = this.workbookState.getSelectedArea();
    if (rowStart > rowEnd) {
      [rowStart, rowEnd] = [rowEnd, rowStart];
    }
    const context = this.ctx;

    let topLeftCornerY = headerRowHeight + 0.5;
    const firstRow = frozenRows === 0 ? topLeftCell.row : 1;

    for (let row = firstRow; row <= bottomRightCell.row; row += 1) {
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
      const selected = row >= rowStart && row <= rowEnd;
      context.fillStyle = headerBorderColor;
      context.fillRect(0, topLeftCornerY, headerColumnWidth, rowHeight);
      context.fillStyle = selected
        ? headerSelectedBackground
        : headerBackground;
      context.fillRect(
        1,
        topLeftCornerY + 1,
        headerColumnWidth - 2,
        rowHeight - 2
      );
      if (selected) {
        context.fillStyle = outlineColor;
        context.fillRect(headerColumnWidth - 1, topLeftCornerY, 1, rowHeight);
      }
      context.fillStyle = selected ? headerSelectedColor : headerTextColor;
      context.font = `bold 12px ${defaultCellFontFamily}`;
      context.fillText(
        `${row}`,
        headerColumnWidth / 2,
        topLeftCornerY + rowHeight / 2,
        headerColumnWidth
      );
      topLeftCornerY += rowHeight;
      this.addRowResizeHandle(topLeftCornerY, row, rowHeight);
      if (row === frozenRows) {
        topLeftCornerY += frozenSeparatorWidth;
        row = topLeftCell.row - 1;
      }
    }
  }

  private renderColumnHeaders(
    frozenColumns: number,
    firstColumn: number,
    lastColumn: number
  ): void {
    const { columnHeaders } = this;
    let deltaX = 0;
    let { columnStart, columnEnd } = this.workbookState.getSelectedArea();
    if (columnStart > columnEnd) {
      [columnStart, columnEnd] = [columnEnd, columnStart];
    }
    for (const header of columnHeaders.querySelectorAll(".column-header"))
      header.remove();
    for (const handle of columnHeaders.querySelectorAll(
      ".column-resize-handle"
    ))
      handle.remove();
    for (const separator of columnHeaders.querySelectorAll(
      ".frozen-column-separator"
    ))
      separator.remove();
    columnHeaders.style.fontFamily = headerFontFamily;
    columnHeaders.style.fontSize = "12px";
    columnHeaders.style.height = `${headerRowHeight}px`;
    columnHeaders.style.lineHeight = `${headerRowHeight}px`;
    columnHeaders.style.left = `${headerColumnWidth}px`;

    // Frozen headers
    for (let column = 1; column <= frozenColumns; column += 1) {
      const selected = column >= columnStart && column <= columnEnd;
      deltaX += this.addColumnHeader(deltaX, column, selected);
    }

    if (frozenColumns !== 0) {
      const div = document.createElement("div");
      div.className = "frozen-column-separator";
      div.style.width = `${frozenSeparatorWidth}px`;
      div.style.height = `${headerRowHeight}`;
      div.style.display = "inline-block";
      div.style.backgroundColor = gridSeparatorColor;
      this.columnHeaders.insertBefore(div, null);
      deltaX += frozenSeparatorWidth;
    }

    for (let column = firstColumn; column <= lastColumn; column += 1) {
      const selected = column >= columnStart && column <= columnEnd;
      deltaX += this.addColumnHeader(deltaX, column, selected);
    }

    columnHeaders.style.width = `${deltaX}px`;
  }

  private addColumnHeader(
    deltaX: number,
    column: number,
    selected: boolean
  ): number {
    const columnWidth = this.model.getColumnWidth(
      this.workbookState.getSelectedSheet(),
      column
    );
    const div = document.createElement("div");
    div.className = "column-header";
    div.textContent = columnNameFromNumber(column);
    this.columnHeaders.insertBefore(div, null);

    this.styleColumnHeader(columnWidth, div, selected);
    this.addColumnResizeHandle(deltaX + columnWidth, column, columnWidth);
    return columnWidth;
  }

  getSheetDimensions(): [number, number] {
    let x = headerColumnWidth;
    for (let column = 1; column < lastColumn + 1; column += 1) {
      x += this.model.getColumnWidth(this.workbookState.getSelectedSheet(), column);
    }
    let y = headerRowHeight;
    for (let row = 1; row < lastRow + 1; row += 1) {
      y += this.model.getRowHeight(this.workbookState.getSelectedSheet(), row);
    }
    this.sheetWidth = Math.floor(
      x + this.model.getColumnWidth(this.workbookState.getSelectedSheet(), lastColumn)
    );
    this.sheetHeight = Math.floor(
      y + 2 * this.model.getRowHeight(this.workbookState.getSelectedSheet(), lastRow)
    );
    return [this.sheetWidth, this.sheetHeight];
  }

  /**
   * Returns the css clip in the canvas of an html element
   * This is used so we do not see the outlines in the row and column headers
   * NB: A _different_ (better!) approach would be to have separate canvases for the headers
   * Then the sheet canvas would have it's own bounding box.
   * That's tomorrows problem.
   * PS: Please, do not use this function. If at all we can use the clip-path property
   */
  private getClipCSS(
    x: number,
    y: number,
    width: number,
    height: number,
    includeFrozenRows: boolean,
    includeFrozenColumns: boolean
  ): string {
    if (!includeFrozenRows && !includeFrozenColumns) {
      return "";
    }
    const frozenColumnsWidth = includeFrozenColumns
      ? this.getFrozenColumnsWidth()
      : 0;
    const frozenRowsHeight = includeFrozenRows ? this.getFrozenRowsHeight() : 0;
    const yMinCanvas = headerRowHeight + frozenRowsHeight;
    const xMinCanvas = headerColumnWidth + frozenColumnsWidth;

    const xMaxCanvas =
      xMinCanvas + this.width - headerColumnWidth - frozenColumnsWidth;
    const yMaxCanvas =
      yMinCanvas + this.height - headerRowHeight - frozenRowsHeight;

    const topClip = y < yMinCanvas ? yMinCanvas - y : 0;
    const leftClip = x < xMinCanvas ? xMinCanvas - x : 0;

    // We don't strictly need to clip on the right and bottom edges because
    // text is hidden anyway
    const rightClip = x + width > xMaxCanvas ? xMaxCanvas - x : width + 4;
    const bottomClip = y + height > yMaxCanvas ? yMaxCanvas - y : height + 4;
    return `rect(${topClip}px ${rightClip}px ${bottomClip}px ${leftClip}px)`;
  }

  private getAreaDimensions(
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ): [number, number] {
    const [xStart, yStart] = this.getCoordinatesByCell(startRow, startColumn);
    let [xEnd, yEnd] = this.getCoordinatesByCell(endRow, endColumn);
    xEnd += this.model.getColumnWidth(this.workbookState.getSelectedSheet(), endColumn);
    yEnd += this.model.getRowHeight(this.workbookState.getSelectedSheet(), endRow);
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    if (frozenRows !== 0 || frozenColumns !== 0) {
      let [xFrozenEnd, yFrozenEnd] = this.getCoordinatesByCell(
        frozenRows,
        frozenColumns
      );
      xFrozenEnd += this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        frozenColumns
      );
      yFrozenEnd += this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        frozenRows
      );
      if (startRow <= frozenRows && endRow > frozenRows) {
        yEnd = Math.max(yEnd, yFrozenEnd);
      }
      if (startColumn <= frozenColumns && endColumn > frozenColumns) {
        xEnd = Math.max(xEnd, xFrozenEnd);
      }
    }
    return [Math.abs(xEnd - xStart), Math.abs(yEnd - yStart)];
  }

  /**
   * Returns the coordinates relative to the canvas.
   * (headerColumnWidth, headerRowHeight) being the coordinates
   * for the top left corner of the first visible cell
   */
  getCoordinatesByCell(row: number, column: number): [number, number] {
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenColumnsWidth = this.getFrozenColumnsWidth();
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenRowsHeight = this.getFrozenRowsHeight();
    const { topLeftCell } = this.getVisibleCells();
    let x, y;
    if (row <= frozenRows) {
      // row is one of the frozen rows
      y = headerRowHeight;
      for (let r = 1; r < row; r += 1) {
        y += this.model.getRowHeight(this.workbookState.getSelectedSheet(), r);
      }
    } else if (row >= topLeftCell.row) {
      // row is bellow the frozen rows
      y = headerRowHeight + frozenRowsHeight;
      for (let r = topLeftCell.row; r < row; r += 1) {
        y += this.model.getRowHeight(this.workbookState.getSelectedSheet(), r);
      }
    } else {
      // row is _above_ the frozen rows
      y = headerRowHeight + frozenRowsHeight;
      for (let r = topLeftCell.row; r > row; r -= 1) {
        y -= this.model.getRowHeight(this.workbookState.getSelectedSheet(), r - 1);
      }
    }
    if (column <= frozenColumns) {
      // It is one of the frozen columns
      x = headerColumnWidth;
      for (let c = 1; c < column; c += 1) {
        x += this.model.getColumnWidth(this.workbookState.getSelectedSheet(), c);
      }
    } else if (column >= topLeftCell.column) {
      // column is to the right of the frozen columns
      x = headerColumnWidth + frozenColumnsWidth;
      for (let c = topLeftCell.column; c < column; c += 1) {
        x += this.model.getColumnWidth(this.workbookState.getSelectedSheet(), c);
      }
    } else {
      // column is to the left of the frozen columns
      x = headerColumnWidth + frozenColumnsWidth;
      for (let c = topLeftCell.column; c > column; c -= 1) {
        x -= this.model.getColumnWidth(this.workbookState.getSelectedSheet(), c - 1);
      }
    }
    return [Math.floor(x), Math.floor(y)];
  }

  /**
   * (x, y) are the relative coordinates of a cell WRT the canvas
   * getCellByCoordinates(headerColumnWidth, headerRowHeight) will return the first visible cell.
   * Note: If there are frozen rows/columns for some particular coordinates (x, y)
   * there might be two cells. This method returns the visible one.
   */
  getCellByCoordinates(
    x: number,
    y: number
  ): { row: number; column: number } | null {
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenColumnsWidth = this.getFrozenColumnsWidth();
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenRowsHeight = this.getFrozenRowsHeight();
    let column = 0;
    let cellX = headerColumnWidth;
    const { topLeftCell } = this.getVisibleCells();
    if (x < headerColumnWidth + frozenColumnsWidth) {
      while (cellX <= x) {
        column += 1;
        cellX += this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        // This cannot happen (would mean cellX > headerColumnWidth + frozenColumnsWidth)
        if (column > frozenColumns) {
          /* istanbul ignore next */
          return null;
        }
      }
    } else {
      cellX = headerColumnWidth + frozenColumnsWidth;
      column = topLeftCell.column - 1;
      while (cellX <= x) {
        column += 1;
        cellX += this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        if (column > lastColumn) {
          return null;
        }
      }
    }
    let cellY = headerRowHeight;
    let row = 0;
    if (y < headerRowHeight + frozenRowsHeight) {
      while (cellY <= y) {
        row += 1;
        cellY += this.model.getRowHeight(this.workbookState.getSelectedSheet(), row);
        // This cannot happen (would mean cellY > headerRowHeight + frozenRowsHeight)
        if (row > frozenRows) {
          /* istanbul ignore next */
          return null;
        }
      }
    } else {
      cellY = headerRowHeight + frozenRowsHeight;
      row = topLeftCell.row - 1;
      while (cellY <= y) {
        row += 1;
        cellY += this.model.getRowHeight(this.workbookState.getSelectedSheet(), row);
        if (row > lastRow) {
          return null;
        }
      }
    }
    if (row === 0 || column === 0) {
      return null;
    }
    return { row, column };
  }

  private drawExtendToArea(): void {
    const { extendToOutline } = this;
    const extendToArea  = this.workbookState.getExtendToArea();
    if (extendToArea === null) {
      extendToOutline.style.visibility = 'hidden';
      return;
    }
    extendToOutline.style.visibility = 'visible';

    let { rowStart, rowEnd, columnStart, columnEnd } = extendToArea;
    if (rowStart > rowEnd) {
      [rowStart, rowEnd] = [rowEnd, rowStart];
    }
    if (columnStart > columnEnd) {
      [columnStart, columnEnd] = [columnEnd, columnStart];
    }

    const [areaX, areaY] = this.getCoordinatesByCell(rowStart, columnStart);
    const [areaWidth, areaHeight] = this.getAreaDimensions(
      rowStart,
      columnStart,
      rowEnd,
      columnEnd,
    );
    // const { border } = extendToArea;
    extendToOutline.style.border = `1px dashed ${outlineColor}`;
    extendToOutline.style.borderRadius = '3px';
    // switch (border) {
    //   case 'left': {
    //     extendToOutline.style.borderLeft = 'none';
    //     extendToOutline.style.borderTopLeftRadius = '0px';
    //     extendToOutline.style.borderBottomLeftRadius = '0px';

    //     break;
    //   }
    //   case 'right': {
    //     extendToOutline.style.borderRight = 'none';
    //     extendToOutline.style.borderTopRightRadius = '0px';
    //     extendToOutline.style.borderBottomRightRadius = '0px';

    //     break;
    //   }
    //   case 'top': {
    //     extendToOutline.style.borderTop = 'none';
    //     extendToOutline.style.borderTopRightRadius = '0px';
    //     extendToOutline.style.borderTopLeftRadius = '0px';

    //     break;
    //   }
    //   case 'bottom': {
    //     extendToOutline.style.borderBottom = 'none';
    //     extendToOutline.style.borderBottomRightRadius = '0px';
    //     extendToOutline.style.borderBottomLeftRadius = '0px';

    //     break;
    //   }
    //   default:
    //     break;
    // }
    const padding = 1;
    extendToOutline.style.left = `${areaX - padding}px`;
    extendToOutline.style.top = `${areaY - padding}px`;
    extendToOutline.style.width = `${areaWidth + 2 * padding}px`;
    extendToOutline.style.height = `${areaHeight + 2 * padding}px`;
  }

  private drawCellOutline(): void {
    const { row: selectedRow, column: selectedColumn } =
      this.workbookState.getSelectedCell();
    const { topLeftCell } = this.getVisibleCells();
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    const [x, y] = this.getCoordinatesByCell(selectedRow, selectedColumn);
    const style = this.model.getCellStyle(
      this.workbookState.getSelectedSheet(),
      selectedRow,
      selectedColumn
    );
    const padding = -1;
    const width =
      this.model.getColumnWidth(this.workbookState.getSelectedSheet(), selectedColumn) +
      2 * padding;
    const height =
      this.model.getRowHeight(this.workbookState.getSelectedSheet(), selectedRow) +
      2 * padding;

    const { cellOutline, areaOutline, cellOutlineHandle } = this;
    const cellEditing = null;

    // If we are editing a cell we want the editor to be a bit larger than a single cell
    // TODO [MVP]: Set initial size of the editor

    cellOutline.style.visibility = "visible";
    cellOutlineHandle.style.visibility = "visible";
    if (
      (selectedRow < topLeftCell.row && selectedRow > frozenRows) ||
      (selectedColumn < topLeftCell.column && selectedColumn > frozenColumns)
    ) {
      cellOutline.style.visibility = "hidden";
      cellOutlineHandle.style.visibility = "hidden";
    }

    // Position the cell outline and clip it
    cellOutline.style.left = `${x - padding}px`;
    cellOutline.style.top = `${y - padding}px`;
    // Reset CSS properties
    cellOutline.style.minWidth = "";
    cellOutline.style.minHeight = "";
    cellOutline.style.maxWidth = "";
    cellOutline.style.maxHeight = "";
    cellOutline.style.overflow = "hidden";
    // New properties
    cellOutline.style.width = `${width}px`;
    cellOutline.style.height = `${height}px`;
    if (cellEditing) {
      cellOutline.style.fontWeight = style.font.b ? "bold" : "normal";
      cellOutline.style.fontStyle = style.font.i ? "italic" : "normal";
      // cellOutline.style.backgroundColor = style.fill.fg_color;
      // TODO: Should we add the same color as the text?
      // Only if it is not a formula?
      // cellOutline.style.color = style.font.color;
    } else {
      cellOutline.style.background = "none";
    }
    // border is 2px so line-height must be height - 4
    cellOutline.style.lineHeight = `${height - 4}px`;
    let { rowStart, rowEnd, columnStart, columnEnd } = this.workbookState.getSelectedArea();
    if (rowStart > rowEnd) {
      [rowStart, rowEnd] = [rowEnd, rowStart];
    }
    if (columnStart > columnEnd) {
      [columnStart, columnEnd] = [columnEnd, columnStart];
    }
    let handleX;
    let handleY;
    // Position the selected area outline
    if (columnStart === columnEnd && rowStart === rowEnd) {
      areaOutline.style.visibility = "hidden";
      [handleX, handleY] = this.getCoordinatesByCell(rowStart, columnStart);
      handleX += this.model.getColumnWidth(
        this.workbookState.getSelectedSheet(),
        columnStart
      );
      handleY += this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        rowStart
      );
    } else {
      areaOutline.style.visibility = "visible";
      cellOutlineHandle.style.visibility = "visible";
      const [areaX, areaY] = this.getCoordinatesByCell(rowStart, columnStart);
      const [areaWidth, areaHeight] = this.getAreaDimensions(
        rowStart,
        columnStart,
        rowEnd,
        columnEnd
      );
      handleX = areaX + areaWidth;
      handleY = areaY + areaHeight;
      areaOutline.style.left = `${areaX - padding}px`;
      areaOutline.style.top = `${areaY - padding}px`;
      areaOutline.style.width = `${areaWidth + 2 * padding}px`;
      areaOutline.style.height = `${areaHeight + 2 * padding}px`;
      const clipLeft = rowStart < topLeftCell.row && rowStart > frozenRows;
      const clipTop =
        columnStart < topLeftCell.column && columnStart > frozenColumns;
      areaOutline.style.clip = this.getClipCSS(
        areaX,
        areaY,
        areaWidth + 2 * padding,
        areaHeight + 2 * padding,
        clipLeft,
        clipTop
      );
      areaOutline.style.border = `1px solid ${outlineColor}`;
      // hide the handle if it is out of the visible area
      if (
        (rowEnd > frozenRows && rowEnd < topLeftCell.row - 1) ||
        (columnEnd > frozenColumns && columnEnd < topLeftCell.column - 1)
      ) {
        cellOutlineHandle.style.visibility = "hidden";
      }

      // This is in case the selection starts in the frozen area and ends outside of the frozen area
      // but we have scrolled out the selection.
      if (
        rowStart <= frozenRows &&
        rowEnd > frozenRows &&
        rowEnd < topLeftCell.row - 1
      ) {
        areaOutline.style.borderBottom = "None";
        cellOutlineHandle.style.visibility = "hidden";
      }
      if (
        columnStart <= frozenColumns &&
        columnEnd > frozenColumns &&
        columnEnd < topLeftCell.column - 1
      ) {
        areaOutline.style.borderRight = "None";
        cellOutlineHandle.style.visibility = "hidden";
      }
    }

    // draw the handle
    if (cellEditing !== null) {
      cellOutlineHandle.style.visibility = "hidden";
      return;
    }
    const handleBBox = cellOutlineHandle.getBoundingClientRect();
    const handleWidth = handleBBox.width;
    const handleHeight = handleBBox.height;
    cellOutlineHandle.style.left = `${handleX - handleWidth / 2}px`;
    cellOutlineHandle.style.top = `${handleY - handleHeight / 2}px`;
  }

  renderSheet(): void {
    // console.time("render");
    this._renderSheet();
    // console.timeEnd("render");
  }

  private _renderSheet(): void {
    const context = this.ctx;
    const { canvas } = this;
    context.lineWidth = 1;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    this.removeHandles();

    const { topLeftCell, bottomRightCell } = this.getVisibleCells();

    const frozenColumns = this.model.getFrozenColumnsCount(
      this.workbookState.getSelectedSheet()
    );
    const frozenRows = this.model.getFrozenRowsCount(
      this.workbookState.getSelectedSheet()
    );

    // Draw frozen rows and columns (top-left-pane)
    let x = headerColumnWidth + 0.5;
    let y = headerRowHeight + 0.5;
    for (let row = 1; row <= frozenRows; row += 1) {
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
      x = headerColumnWidth;
      for (let column = 1; column <= frozenColumns; column += 1) {
        const columnWidth = this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        this.renderCell(row, column, x, y, columnWidth, rowHeight);
        x += columnWidth;
      }
      y += rowHeight;
    }
    if (frozenRows === 0 && frozenColumns !== 0) {
      x = headerColumnWidth;
      for (let column = 1; column <= frozenColumns; column += 1) {
        x += this.model.getColumnWidth(this.workbookState.getSelectedSheet(), column);
      }
    }

    const frozenOffset = frozenSeparatorWidth / 2;
    // If there are frozen rows draw a separator
    if (frozenRows) {
      context.beginPath();
      context.lineWidth = frozenSeparatorWidth;
      context.strokeStyle = gridSeparatorColor;
      context.moveTo(0, y + frozenOffset);
      context.lineTo(this.width, y + frozenOffset);
      y += frozenSeparatorWidth;
      context.stroke();
      context.lineWidth = 1;
    }

    // If there are frozen columns draw a separator
    if (frozenColumns) {
      context.beginPath();
      context.lineWidth = frozenSeparatorWidth;
      context.strokeStyle = gridSeparatorColor;
      context.moveTo(x + frozenOffset, 0);
      context.lineTo(x + frozenOffset, this.height);
      x += frozenSeparatorWidth;
      context.stroke();
      context.lineWidth = 1;
    }

    const frozenX = x;
    const frozenY = y;
    // Draw frozen rows (top-right pane)
    y = headerRowHeight;
    for (let row = 1; row <= frozenRows; row += 1) {
      x = frozenX;
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );
      for (
        let { column } = topLeftCell;
        column <= bottomRightCell.column;
        column += 1
      ) {
        const columnWidth = this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        this.renderCell(row, column, x, y, columnWidth, rowHeight);
        x += columnWidth;
      }
      y += rowHeight;
    }

    // Draw frozen columns (bottom-left pane)
    y = frozenY;
    for (let { row } = topLeftCell; row <= bottomRightCell.row; row += 1) {
      x = headerColumnWidth;
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );

      for (let column = 1; column <= frozenColumns; column += 1) {
        const columnWidth = this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        this.renderCell(row, column, x, y, columnWidth, rowHeight);

        x += columnWidth;
      }
      y += rowHeight;
    }

    // Render all remaining cells (bottom-right pane)
    y = frozenY;
    for (let { row } = topLeftCell; row <= bottomRightCell.row; row += 1) {
      x = frozenX;
      const rowHeight = this.model.getRowHeight(
        this.workbookState.getSelectedSheet(),
        row
      );

      for (
        let { column } = topLeftCell;
        column <= bottomRightCell.column;
        column += 1
      ) {
        const columnWidth = this.model.getColumnWidth(
          this.workbookState.getSelectedSheet(),
          column
        );
        this.renderCell(row, column, x, y, columnWidth, rowHeight);

        x += columnWidth;
      }
      y += rowHeight;
    }

    // Draw column headers
    this.renderColumnHeaders(
      frozenColumns,
      topLeftCell.column,
      bottomRightCell.column
    );

    // Draw row headers
    this.renderRowHeaders(frozenRows, topLeftCell, bottomRightCell);

    // square in the top left corner
    context.fillStyle = headerBorderColor;
    context.fillRect(0, 0, headerColumnWidth, headerRowHeight);

    this.drawCellOutline();
    this.drawExtendToArea();
  }
}
