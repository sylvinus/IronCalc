import type { Meta, StoryObj } from "@storybook/react";
import Navigation from "../../components/navigation";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import { theme } from "../../theme";
import { action } from "@storybook/addon-actions";
import { styled } from "@mui/material";

const meta = {
  title: "Components/Navigation",
  component: Navigation,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof Navigation>;

export const Basic: Story = {
  args: {
    sheets: [
      {
        name: "Sheet1",
        color: "#E91E63",
        sheetId: 1,
      },
      {
        name: "Sheet2",
        color: "#2196F3",
        sheetId: 2,
      },
    ],
    selectedIndex: 0,
    onSheetSelected: action("clicked"),
    onAddBlankSheet: action("clicked"),
    onSheetColorChanged: action("clicked"),
    onSheetRenamed: action("clicked"),
    onSheetDeleted: action("clicked"),
  },
  render: (args) => {
    return (
      <Wrapper>
        <ThemeProvider theme={theme}>
          <Navigation {...args} />
        </ThemeProvider>
      </Wrapper>
    );
  },
};

const Wrapper = styled("div")`
  position: absolute;
  bottom: 0px;
`;
