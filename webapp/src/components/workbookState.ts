import { CellStyle } from "@ironcalc/wasm";

export interface Cell {
  row: number;
  column: number;
}

export enum AreaType {
  rowsDown,
  columnsRight,
  rowsUp,
  columnsLeft,
}

export interface Area {
  type: AreaType;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

type FocusType = "cell" | "formula-bar";

/**
 *  In Excel there are two "modes" of editing
 *   * `init`: When you start typing in a cell. In this mode arrow keys will move away from the cell
 *   * `edit`: If you double click on a cell or click in the cell while editing.
 *     In this mode arrow keys will move within the cell.
 *
 * In a formula bar mode is always `edit`.
 */
type CellEditMode = "init" | "edit";

interface Editor {
  id: number;
  sheet: number;
  row: number;
  column: number;
  text: string;
  base: string;
  mode: CellEditMode;
  focus: FocusType;
}

interface Cells {
  topLeftCell: { row: number; column: number };
  bottomRightCell: { row: number; column: number };
}

type AreaStyles = CellStyle[][];

export class WorkbookState {
  private extendToArea: Area | null;
  private editor: Editor | null;
  private visibleCells: Cells | null;
  private id;
  private copyStyles: AreaStyles | null;

  constructor() {
    this.extendToArea = null;
    this.visibleCells = null;
    this.editor = null;
    this.id = Math.floor(Math.random() * 1000);
    this.copyStyles = null;
  }

  startEditing(_focus: FocusType, _text: string) {
    // const {row, column} = this.selectedCell;
    // this.editor = {
    //   id: 0,
    //   sheet: this.selectedSheet,
    //   row,
    //   column,
    //   base: '',
    //   text,
    //   mode: 'init',
    //   focus
    // }
  }

  setEditorText(text: string) {
    if (!this.editor) {
      return;
    }
    this.editor.text = text;
  }

  setVisibleCells(cells: Cells) {
    this.visibleCells = cells;
  }

  getVisibleCells(): Cells | null {
    return this.visibleCells;
  }

  endEditing() {
    this.editor = null;
  }

  getEditor(): Editor | null {
    console.log("getEditor", this.id);
    return this.editor;
  }

  getExtendToArea(): Area | null {
    return this.extendToArea;
  }

  clearExtendToArea(): void {
    this.extendToArea = null;
  }

  setExtendToArea(area: Area): void {
    this.extendToArea = area;
  }

  setCopyStyles(styles: AreaStyles | null): void {
    this.copyStyles = styles;
  }

  getCopyStyles(): AreaStyles | null {
    return this.copyStyles;
  }
}
