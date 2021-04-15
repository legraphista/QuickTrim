import {Theme, ThemeNames} from "../../helpers/theme";
import {Brightness2 as DarkIcon, Brightness5 as LightIcon, BrightnessAuto as AutoIcon} from "@material-ui/icons";
import {IconButton, Tooltip} from "@material-ui/core";
import React from "react";

interface ThemeSwitchProps {
  theme: ThemeNames,
  onClick: () => void
}

export const ThemeSwitch = React.memo(function ThemeSwitch({ onClick, theme }: ThemeSwitchProps) {

  let tooltip = 'System Theme (based on system preference)';
  let icon = <AutoIcon/>;
  if (theme === 'dark') {
    tooltip = 'Dark Theme'
    icon = <DarkIcon/>;
  }
  if (theme === 'light') {
    tooltip = 'Light Theme'
    icon = <LightIcon/>;
  }

  return (
    <Tooltip title={tooltip} arrow>
      <IconButton onClick={() => onClick()}>
        {icon}
      </IconButton>
    </Tooltip>
  );

});
