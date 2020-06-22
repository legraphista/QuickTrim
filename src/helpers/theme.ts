import {createMuiTheme, ThemeOptions} from "@material-ui/core";
import {remote} from 'electron';
import {RendererSettings} from "./settings";
import color from "color";

export namespace Theme {

  export type ThemeNames = 'dark' | 'light' | 'system';

  const nativeTheme = remote.nativeTheme;

  const shouldUseDarkTheme = () => nativeTheme.shouldUseDarkColors;

  const commonTheme: ThemeOptions = {
    overrides: {
      MuiTooltip: {
        tooltip: {
          fontSize: '0.8rem'
        }
      }
    }
  };

  const darkTheme = createMuiTheme({
    palette: {
      type: 'dark',
    }
  });

  const lightTheme = createMuiTheme({
    palette: {
      background: {
        paper: '#e8e8e8'
      }
    },
  });

  export const current = () => shouldUseDarkTheme() ? darkTheme : lightTheme;
  export const currentName = () => nativeTheme.themeSource;

  export const disabledColor = (c: string) => shouldUseDarkTheme() ?
    color(c).desaturate(0.7).toString() :
    color(c).desaturate(0.7).lighten(0.5).toString()

  export const set = (s: ThemeNames) => {
    nativeTheme.themeSource = s;
    RendererSettings.settings.theme = s;
    RendererSettings.save();
  }

  export const setNext = (): ThemeNames => {
    let t: ThemeNames = 'system';
    if (nativeTheme.themeSource === 'system') {
      t = 'dark';
    }
    if (nativeTheme.themeSource === 'dark') {
      t = 'light';
    }
    if (nativeTheme.themeSource === 'light') {
      t = 'system';
    }
    set(t);
    return t;
  }

  // load from settings
  set(RendererSettings.settings.theme);
}

window.Theme = Theme;

declare global {
  interface Window {
    Theme: typeof Theme
  }
}