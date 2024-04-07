export interface Cell {
  row: number;
  column: number;
}

export interface Area {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

interface Scroll {
  left: number;
  top: number;
}

type FocusType = 'cell' | 'formula-bar';


/**
 *  In Excel there are two "modes" of editing
 *   * `init`: When you start typing in a cell. In this mode arrow keys will move away from the cell
 *   * `edit`: If you double click on a cell or click in the cell while editing.
 *     In this mode arrow keys will move within the cell.
 *
 * In a formula bar mode is always `edit`.
 */
type CellEditMode = 'init' | 'edit';

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

export class WorkbookState {
  private selectedSheet: number;
  private selectedCell: Cell;
  private selectedArea: Area;
  private scroll: Scroll;
  private extendToArea: Area | null;
  private editor: Editor | null;
  private id;

  constructor() {
    const row = 1;
    const column = 1;
    const sheet = 0;
    this.selectedSheet = sheet;
    this.selectedCell = { row, column };
    this.selectedArea = {
      rowStart: row,
      rowEnd: row,
      columnStart: column,
      columnEnd: column,
    };
    this.extendToArea = null;
    this.scroll = {
      left: 0,
      top: 0,
    };
    this.editor = null;
    this.id = Math.floor(Math.random()*1000);
  }

  startEditing(focus: FocusType, text: string) {
    const {row, column} = this.selectedCell;
    this.editor = {
      id: 0,
      sheet: this.selectedSheet,
      row,
      column,
      base: '',
      text,
      mode: 'init',
      focus
    }
  }

  setEditorText(text: string) {
    if (!this.editor) {
      return;
    }
    this.editor.text = text;
  }

  endEditing() {
    this.editor = null;
  }

  getEditor(): Editor | null {
    console.log('getEditor', this.id);
    return this.editor;
  }

  getSelectedSheet(): number {
    return this.selectedSheet;
  }

  setSelectedSheet(sheet: number): void {
    this.selectedSheet = sheet;
  }

  getSelectedCell(): Cell {
    return this.selectedCell;
  }

  setSelectedCell(cell: Cell): void {
    this.selectedCell = cell;
  }

  getSelectedArea(): Area {
    return this.selectedArea;
  }

  setSelectedArea(area: Area): void {
    this.selectedArea = area;
  }

  selectCell(cell: { row: number; column: number }): void {
    console.log('selectCell: ', this.id)
    const { row, column } = cell;
    this.selectedArea = {
      rowStart: row,
      rowEnd: row,
      columnStart: column,
      columnEnd: column,
    };
    this.selectedCell = { row, column };
    this.editor = null;
  }

  getScroll(): Scroll {
    return this.scroll;
  }

  setScroll(scroll: Scroll): void {
    this.scroll = scroll;
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
}
