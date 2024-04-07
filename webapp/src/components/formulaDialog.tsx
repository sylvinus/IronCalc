import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    styled,
    TextField,
  } from "@mui/material";
  import { useTranslation } from "react-i18next";
  import { useState } from "react";
  
  interface FormulaDialogProps {
    isOpen: boolean;
    close: () => void;
    onFormulaChanged: (name: string) => void;
    defaultName: string;
  }
  
  export const FormulaDialog = (properties: FormulaDialogProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState(properties.defaultName);
    return (
      <Dialog open={properties.isOpen} onClose={properties.close}>
        <DialogTitle>{t("sheet_rename.title")}</DialogTitle>
        <DialogContent dividers>
          <TextField
            defaultValue={name}
            label={t("sheet_rename.label")}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            onChange={(event) => {
              setName(event.target.value);
            }}
            spellCheck="false"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              properties.onFormulaChanged(name);
            }}
          >
            {t("sheet_rename.rename")}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };