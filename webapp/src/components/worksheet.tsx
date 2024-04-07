import { styled } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import WorksheetCanvas from "./WorksheetCanvas/worksheetCanvas";
import {
  outlineBackgroundColor,
  outlineColor,
} from "./WorksheetCanvas/constants";
import usePointer from "./usePointer";
import { WorkbookState } from "./workbookState";
import { Cell } from "./WorksheetCanvas/types";
import Editor from "./editor";
import EditorContext, { EditorState } from "./editor/editorContext";
import { getFormulaHTML } from "./editor/util";
import { Model } from "@ironcalc/wasm";

function Worksheet(props: {
  model: Model;
  workbookState: WorkbookState;
  refresh: () => void;
}) {
  const canvasElement = useRef<HTMLCanvasElement>(null);

  const worksheetElement = useRef<HTMLDivElement>(null);
  const scrollElement = useRef<HTMLDivElement>(null);
  // const rootElement = useRef<HTMLDivElement>(null);
  const spacerElement = useRef<HTMLDivElement>(null);
  const cellOutline = useRef<HTMLDivElement>(null);
  const areaOutline = useRef<HTMLDivElement>(null);
  const cellOutlineHandle = useRef<HTMLDivElement>(null);
  const extendToOutline = useRef<HTMLDivElement>(null);
  const columnResizeGuide = useRef<HTMLDivElement>(null);
  const rowResizeGuide = useRef<HTMLDivElement>(null);
  // const contextMenuAnchorElement = useRef<HTMLDivElement>(null);
  const columnHeaders = useRef<HTMLDivElement>(null);
  const worksheetCanvas = useRef<WorksheetCanvas | null>(null);

  const [isEditing, setEditing] = useState(false);

  const [editorContext, setEditorContext] = useState<EditorState>({
    mode: "accept",
    insertRange: null,
    baseText: '',
    id: Math.floor(Math.random()*1000),
  });

  console.log('worksheet', editorContext.id);

  const { model, workbookState, refresh } = props;
  useEffect(() => {
    const canvasRef = canvasElement.current;
    const columnGuideRef = columnResizeGuide.current;
    const rowGuideRef = rowResizeGuide.current;
    const columnHeadersRef = columnHeaders.current;
    const worksheetRef = worksheetElement.current;

    const outline = cellOutline.current;
    const handle = cellOutlineHandle.current;
    const area = areaOutline.current;
    const extendTo = extendToOutline.current;

    if (
      !canvasRef ||
      !columnGuideRef ||
      !rowGuideRef ||
      !columnHeadersRef ||
      !worksheetRef ||
      !outline ||
      !handle ||
      !area ||
      !extendTo
    )
      return;
    const canvas = new WorksheetCanvas({
      width: worksheetRef.clientWidth,
      height: worksheetRef.clientHeight,
      model,
      workbookState,
      elements: {
        canvas: canvasRef,
        columnGuide: columnGuideRef,
        rowGuide: rowGuideRef,
        columnHeaders: columnHeadersRef,
        cellOutline: outline,
        cellOutlineHandle: handle,
        areaOutline: area,
        extendToOutline: extendTo,
      },
      onColumnWidthChanges(sheet, column, width) {
        model.setColumnWidth(sheet, column, width);
        worksheetCanvas.current?.renderSheet();
      },
      onRowHeightChanges(sheet, row, height) {
        model.setRowHeight(sheet, row, height);
        worksheetCanvas.current?.renderSheet();
      },
    });
    const [sheetWidth, sheetHeight] = canvas.getSheetDimensions();
    if (spacerElement.current) {
      spacerElement.current.style.height = `${sheetHeight}px`;
      spacerElement.current.style.width = `${sheetWidth}px`;
    }
    canvas.renderSheet();
    worksheetCanvas.current = canvas;
  });

  const sheetNames = model.getWorksheetsProperties().map((s: { name: string; }) => s.name);

  const {
    onPointerMove,
    onPointerDown,
    onPointerHandleDown,
    onPointerUp,
    // onContextMenu,
  } = usePointer({
    onCellSelected: (cell: Cell, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      workbookState.selectCell(cell);
      // worksheetCanvas.current?.renderSheet();
      refresh();
    },
    onAreaSelecting: (cell: Cell) => {
      const canvas = worksheetCanvas.current;
      if (!canvas) {
        return;
      }
      const { row, column } = cell;
      // const { width, height } = worksheet.getBoundingClientRect();
      // const [x, y] = canvas.getCoordinatesByCell(row, column);
      // const [x1, y1] = canvas.getCoordinatesByCell(row + 1, column + 1);
      // const { left: canvasLeft, top: canvasTop } = canvas.getScrollPosition();
      // // let border = Border.Right;
      // // let { left, top } = state.scrollPosition;
      // // if (x < headerColumnWidth) {
      // //   border = Border.Left;
      // //   left = canvasLeft - headerColumnWidth + x;
      // // } else if (x1 > width - 20) {
      // //   border = Border.Right;
      // // }
      // // if (y < headerRowHeight) {
      // //   border = Border.Top;
      // //   top = canvasTop - headerRowHeight + y;
      // // } else if (y1 > height - 20) {
      // //   border = Border.Bottom;
      // // }
      const selectedCell = workbookState.getSelectedCell();
      const area = {
        rowStart: Math.min(selectedCell.row, row),
        rowEnd: Math.max(selectedCell.row, row),
        columnStart: Math.min(selectedCell.column, column),
        columnEnd: Math.max(selectedCell.column, column),
      };
      workbookState.setSelectedArea(area);
      canvas.renderSheet();
      // // If there are frozen rows or columns snap to origin if we cross boundaries
      // const frozenRows = canvas.workbook.getFrozenRowsCount();
      // const frozenColumns = canvas.workbook.getFrozenColumnsCount();
      // if (area.rowStart <= frozenRows && area.rowEnd > frozenRows) {
      //   top = 0;
      // }
      // if (area.columnStart <= frozenColumns && area.columnEnd > frozenColumns) {
      //   left = 0;
      // }
    }, //  editorActions.onPointerMoveToCell,
    onExtendToCell: (cell) => {
      const canvas = worksheetCanvas.current;
      if (!canvas) {
        return;
      }
      const { row, column } = cell;
      const selectedCell = workbookState.getSelectedCell();
      const area = {
        rowStart: Math.min(selectedCell.row, row),
        rowEnd: Math.max(selectedCell.row, row),
        columnStart: Math.min(selectedCell.column, column),
        columnEnd: Math.max(selectedCell.column, column),
      };
      workbookState.setExtendToArea(area);
      canvas.renderSheet();
    }, //  editorActions.onExtendToCell,
    onExtendToEnd: () => {
      const canvas = worksheetCanvas.current;
      if (!canvas) {
        return;
      }
      const sheet = workbookState.getSelectedSheet();
      const initialArea = workbookState.getSelectedArea();
      const extendedArea = workbookState.getExtendToArea();
      if (!extendedArea) {
        return;
      }
      // model.extendTo(sheet, initialArea, extendedArea);
      workbookState.clearExtendToArea();
      canvas.renderSheet();
    }, // editorActions.onExtendToEnd,
    canvasElement,
    worksheetElement,
    worksheetCanvas,
    // rowContextMenuAnchorElement,
    // columnContextMenuAnchorElement,
    // onRowContextMenu,
    // onColumnContextMenu,
  });

  const onScroll = (): void => {
    if (!scrollElement.current || !worksheetCanvas.current) {
      return;
    }
    const left = scrollElement.current.scrollLeft;
    const top = scrollElement.current.scrollTop;

    worksheetCanvas.current.setScrollPosition({ left, top });
    worksheetCanvas.current.renderSheet();
  };

  const {row, column} = workbookState.getSelectedCell();
  const selectedSheet = workbookState.getSelectedSheet();

  return (
    // <EditorContext.Provider value={{editorContext}}>
    <Wrapper ref={scrollElement} onScroll={onScroll}>
      <Spacer ref={spacerElement} />
      <SheetContainer
        ref={worksheetElement}
        onPointerDown={(event) => {
          if (isEditing === true && editorContext.mode !== 'insert') {
            setEditing(false);
            model.setUserInput(selectedSheet, row, column, editorContext.baseText);
          }
          onPointerDown(event);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={(event) => {
          const sheet = workbookState.getSelectedSheet();
          const {row, column} = workbookState.getSelectedCell();
          const text = model.getCellContent(sheet, row, column) || '';
          console.log('dbclick', text);

          workbookState.startEditing("cell", `${text}`);
          setEditorContext ((c: EditorState) => {
            console.log('text', text, c.id);
            return {
              mode: c.mode,
              insertRange: c.insertRange,
              baseText: text,
              dontChange: true,
              id: c.id,
            };
          });
          
          setEditing(true);
          event.stopPropagation();
          event.preventDefault();
          // refresh();
        }}
      >
        <SheetCanvas ref={canvasElement} />
        <CellOutline ref={cellOutline}>
          {
            <Editor
              minimalWidth={200}
              minimalHeight={90}
              textColor="#333"
              getStyledText={(text: string, insertRangeText: string) => {
                return getFormulaHTML(
                  text,
                  0,
                  sheetNames,
                  editorContext.insertRange,
                  insertRangeText
                );
              } }
              onEditEnd={(text: string) => {
                console.log(text);
                setEditing(false);
                model.setUserInput(selectedSheet, row, column, text);
              } }
              originalText={model.getCellContent(selectedSheet, row, column) || ''}
              display={isEditing}
              cell={{ sheet: selectedSheet, row, column }}
              sheetNames={sheetNames}
            />
            /* <Editor
              data-testid={WorkbookTestId.WorkbookCellEditor}
              onEditChange={onEditChange}
              onEditEnd={onEditEnd}
              onEditEscape={onEditEscape}
              onReferenceCycle={onReferenceCycle}
              display={!!cellEditing}
              focus={cellEditing?.focus === FocusType.Cell}
              html={cellEditing?.html ?? ''}
              cursorStart={cellEditing?.cursorStart ?? 0}
              cursorEnd={cellEditing?.cursorEnd ?? 0}
              mode={cellEditing?.mode ?? 'init'}
            /> */
          }
        </CellOutline>
        <AreaOutline ref={areaOutline} />
        <ExtendToOutline ref={extendToOutline} />
        <CellOutlineHandle
          ref={cellOutlineHandle}
          onPointerDown={onPointerHandleDown}
        />
        <ColumnResizeGuide ref={columnResizeGuide} />
        <RowResizeGuide ref={rowResizeGuide} />
        <ColumnHeaders ref={columnHeaders} />
      </SheetContainer>
    </Wrapper>
    // </EditorContext.Provider>
  );
}

const Spacer = styled("div")`
  position: absolute;
  height: 5000px;
  width: 5000px;
`;

const SheetContainer = styled("div")`
  position: sticky;
  top: 0px;
  left: 0px;
  height: 100%;

  .column-resize-handle {
    position: absolute;
    top: 0px;
    width: 3px;
    opacity: 0;
    background: ${outlineColor};
    border-radius: 5px;
    cursor: col-resize;
  }

  .column-resize-handle:hover {
    opacity: 1;
  }
  .row-resize-handle {
    position: absolute;
    left: 0px;
    height: 3px;
    opacity: 0;
    background: ${outlineColor};
    border-radius: 5px;
    cursor: row-resize;
  }

  .row-resize-handle:hover {
    opacity: 1;
  }
`;

const Wrapper = styled("div")({
  position: "absolute",
  overflow: "scroll",
  top: 71,
  left: 0,
  right: 0,
  bottom: 41,
});

const SheetCanvas = styled("canvas")`
  position: relative;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 40px;
`;

const ColumnResizeGuide = styled("div")`
  position: absolute;
  top: 0px;
  display: none;
  height: 100%;
  width: 0px;
  border-left: 1px dashed ${outlineColor};
`;

const ColumnHeaders = styled("div")`
  position: absolute;
  left: 0px;
  top: 0px;
  overflow: hidden;
  display: flex;
  & .column-header {
    display: inline-block;
    text-align: center;
    overflow: hidden;
    height: 100%;
    user-select: none;
  }
`;

const RowResizeGuide = styled("div")`
  position: absolute;
  display: none;
  left: 0px;
  height: 0px;
  width: 100%;
  border-top: 1px dashed ${outlineColor};
`;

const AreaOutline = styled("div")`
  position: absolute;
  border: 1px solid ${outlineColor};
  border-radius: 3px;
  background-color: ${outlineBackgroundColor};
`;

const CellOutline = styled("div")`
  position: absolute;
  border: 2px solid ${outlineColor};
  border-radius: 3px;
  word-break: break-word;
  font-size: 13px;
  display: flex;
`;

const CellOutlineHandle = styled("div")`
  position: absolute;
  width: 5px;
  height: 5px;
  background: ${outlineColor};
  cursor: crosshair;
  // border: 1px solid white;
  border-radius: 1px;
`;

const ExtendToOutline = styled("div")`
  position: absolute;
  border: 1px dashed ${outlineColor};
  border-radius: 3px;
`;

export default Worksheet;
