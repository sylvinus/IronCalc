import styled from "@emotion/styled";
import type { Model } from "@ironcalc/wasm";
import { IronCalcLogo } from "./../icons";
import { FileMenu } from "./FileMenu";
import { ShareButton } from "./ShareButton";
import { WorkbookTitle } from "./WorkbookTitle";
import { updateNameSelectedWorkbook } from "./storage";

export function FileBar(properties: {
  model: Model;
  newModel: () => void;
  setModel: (key: string) => void;
  onModelUpload: (blob: Blob) => void;
}) {
  return (
    <FileBarWrapper>
      <IronCalcLogo style={{ width: "120px", marginLeft: "10px" }} />
      <Divider />
      <FileMenu
        newModel={properties.newModel}
        setModel={properties.setModel}
        onModelUpload={properties.onModelUpload}
        onDownload={() => {
          const model = properties.model;
          const arrayBuffer = model.toBytes();
          const fileName = model.getName();
          fetch("/api/download", {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
            body: arrayBuffer,
          })
            .then((response) => {
              if (!response.ok) throw new Error("Network response was not ok");
              return response.blob();
            })
            .then((blob) => {
              // Create a link element and trigger a download
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;

              // Use the same filename or change as needed
              a.download = `${fileName}.xlsx`;
              document.body.appendChild(a);
              a.click();

              // Clean up
              window.URL.revokeObjectURL(url);
              a.remove();
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }}
      />
      <WorkbookTitle
        name={properties.model.getName()}
        onNameChange={(name) => {
          properties.model.setName(name);
          updateNameSelectedWorkbook(properties.model, name);
        }}
      />
      <ShareButton
        onClick={() => {
          const model = properties.model;
          const arrayBuffer = model.toBytes();
          const fileName = model.getName();
          fetch("/api/share", {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
            body: arrayBuffer,
          })
            .then((response) => {
              if (!response.ok) throw new Error("Network response was not ok");
              return response.text();
            })
            .then((hash) => {
              console.log(hash);
            });
        }}
      />
    </FileBarWrapper>
  );
}

const Divider = styled("div")`
  margin: 10px;
  height: 12px;
  border-left: 1px solid #e0e0e0;
`;

const FileBarWrapper = styled("div")`
  height: 60px;
  width: 100%;
  background: "#FFF";
  display: flex;
  line-height: 60px;
  align-items: center;
  border-bottom: 1px solid grey;
  position: relative;
`;
