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

export interface SheetArea extends Area {
  sheet: number;
  color: string;
}

interface AreaWithBorderInterface extends Area {
  border: "left" | "top" | "right" | "bottom";
}

export type AreaWithBorder = AreaWithBorderInterface | null;

