import { createContext } from "react";

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

const WorkbookContext = createContext<{
    selectedSheet: number;
    selectedCell: Cell;
    selectedArea: Area;
    scroll: Scroll;
    extendToArea: Area | null;
    editor: Editor | null;
  }>({
    selectedSheet: 0,
    selectedCell: {row: 1, column: 1},
    selectedArea: {rowStart:1, rowEnd: 1, columnStart:1, columnEnd: 1},
    scroll: {top: 0, left: 0},
    extendToArea: null,
    editor: null
  });



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


  export default WorkbookContext;