import { Button, Menu, MenuItem, styled } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
interface SheetProps {
  name: string;
  color: string;
  selected: boolean;
  onSelected: () => void;
  onColorChanged: (hex: string) => void;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
}
function Sheet(props: SheetProps) {
  const { name, color, selected, onSelected } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLButtonElement>(null);
  const open = Boolean(anchorEl);
  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <Wrapper
      style={{ borderBottomColor: color, fontWeight: selected ? 600 : 400 }}
      onClick={onSelected}
    >
      <Name>{name}</Name>
      <StyledButton onClick={handleOpen}>
        <ChevronDown />
      </StyledButton>
      <StyledMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: 6,
        }}
      >
        <MenuItem>Rename</MenuItem>
        <MenuItem>Change Color</MenuItem>
        <MenuItem>Delete</MenuItem>
      </StyledMenu>
    </Wrapper>
  );
}

const StyledMenu = styled(Menu)``;

const StyledButton = styled(Button)`
  width: 15px;
  height: 24px;
  min-width: 0px;
  padding: 0px;
  color: inherit;
  font-weight: inherit;
  svg {
    width: 15px;
    height: 15px;
  }
`;

const Wrapper = styled("div")`
  display: flex;
  margin-left: 20px;
  border-bottom: 3px solid;
  border-top: 3px solid white;
  line-height: 34px;
  align-items: center;
`;

const Name = styled("div")`
  font-size: 12px;
  margin-right: 5px;
  text-wrap: nowrap;
`;

export default Sheet;
