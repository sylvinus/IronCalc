import type { Meta, StoryObj } from '@storybook/react';
import Toolbar from '../../components/toolbar';
import ThemeProvider from '@mui/material/styles/ThemeProvider';
import { theme } from '../../theme';
import { action } from '@storybook/addon-actions';

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const Basic: Story = {
  args: {
    canUndo: false,
    canRedo: false,
    canEdit: true,
    fillColor: 'blue',
    fontColor: 'black',
    bold: false,
    underline: false,
    italic: false,
    strike: false,
    horizontalAlign: 'left',
    numFmt: 'general',
    onRedo: action('clicked'),
  },
  render: (args) => {
    return (
      <ThemeProvider theme={theme}>
        <Toolbar {...args} />
      </ThemeProvider>
    );
  },
};
