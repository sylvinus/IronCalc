import "./App.css";
import Workbook from "./components/workbook";
import "./i18n";
import { useEffect, useState } from "react";
import init, { Model } from "@ironcalc/wasm";
import { WorkbookState } from "./components/workbookState";

function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [workbookState, setWorkbookState] = useState<WorkbookState | null>(
    null
  );
  useEffect(() => {
    async function start() {
      await init();
      const model_bytes = new Uint8Array(await (await fetch("./example.ic")).arrayBuffer());
      const _model = Model.from_bytes(model_bytes);
      // const _model = new Model("en", "UTC");
      if (!model) setModel(_model);
      if (!workbookState) setWorkbookState(new WorkbookState());
    }
    start();
  }, []);

  if (!model || !workbookState) {
    return <div>Loading</div>;
  }

  // We could use context for model, but the problem is that it should initialized to null.
  // Passing the property down makes sure it is always defined.
  return (
    <Workbook model={model} workbookState={workbookState} />
  );
}

export default App;

