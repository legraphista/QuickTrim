import {action, computed, makeObservable, observable, reaction} from "mobx";
import {ErrorLike} from "../electron/protocols/base-protocols";
import {DetailsProtocol} from "../electron/protocols/proto/details";
import {DetailsComms, TrimComms} from "./helpers/comms";
import {AppState} from "./AppState.store";
import {RenderStrategy} from "../electron/types";
import {dialog, getCurrentWindow} from '@electron/remote';
import {RendererFileHelpers} from "./helpers/file";
import {eventList} from "./helpers/events";
import {FFHelpers} from "../electron/helpers/ff";
import {clip} from "./helpers/math";
import {PlaybackStore} from "./Playback.store";
import {RendererSettings} from "./helpers/settings";

/**
 Copyright Findie 2021
 */

class ProcessStoreClass {
  @observable error: Error | ErrorLike | null = null;
  @action setError = (e: ProcessStoreClass['error']) => this.error = e;

  @observable videoDetails: null | DetailsProtocol.DetailsProtocolResponse = null;
  @action setVideoDetails = (d: ProcessStoreClass['videoDetails']) => this.videoDetails = d;

  @computed get simpleVideoDetails() {
    if (!this.videoDetails) return null;
    return DetailsComms.simplifyMediaDetails(this.videoDetails);
  }

  @observable processingID: string | null = null;
  @action setProcessingID = (pid: string | null) => this.processingID = pid;

  @computed get strategyType() {
    return RendererSettings.settings.processingParams.strategyType
  }

  @computed get strategyTune() {
    return RendererSettings.settings.processingParams.strategyTune
  }

  @computed get strategySpeed() {
    return RendererSettings.settings.processingParams.strategySpeed
  }

  @action setStrategyType = (t: ProcessStoreClass['strategyType']) =>
    RendererSettings.settings.processingParams.strategyType = t;
  @action setStrategyTune = (t: ProcessStoreClass['strategyTune']) =>
    RendererSettings.settings.processingParams.strategyTune = t;
  @action setStrategySpeed = (s: ProcessStoreClass['strategySpeed']) => {
    RendererSettings.settings.processingParams.strategySpeed = s;
  }

  @computed get strategy(): RenderStrategy {
    return {
      type: this.strategyType,
      tune: this.strategyTune,
      speed: this.strategySpeed
    }
  }

  @computed get videoSettings() {
    return RendererSettings.settings.processingVideoSettings;
  }

  @action setVideoSettings = <K extends keyof ProcessStoreClass['videoSettings']>(key: K, val: ProcessStoreClass['videoSettings'][K]) => {
    RendererSettings.settings.processingVideoSettings[key] = val;
  }

  @observable fileOut: string = '';
  @action setFileOut = (f: string) => this.fileOut = f;

  @observable volume: number = 1;
  @action setVolume = (v: number) => {
    v = clip(0, v, 2);
    PlaybackStore.setVolume(v);
    return this.volume = v;
  }

  constructor() {
    makeObservable(this);

    reaction(() => AppState.file, (file) => {
      this.setVideoDetails(null);
      if (!file) {
        return;
      }

      DetailsComms.getDetails(file)
        .then(this.setVideoDetails)
        .catch(this.setError);
    });

    reaction(() => this.error, (e) => {
      if (e) {
        this.setProcessingID(null);
        AppState.setFile('');
      }
    })
  }

  startProcessing = async () => {
    if (!AppState.file) {
      return console.warn('refusing to start process with empty video field');
    }
    if (!this.videoDetails) {
      return console.warn('refusing to start process with empty video details');
    }

    const strategy = ProcessStore.strategy;
    PlaybackStore.pause();

    const fout = dialog.showSaveDialogSync(
      getCurrentWindow(),
      {
        title: 'Output location',
        defaultPath: RendererFileHelpers.generateFileOutName(AppState.file, AppState.trimRange, strategy, ProcessStore.videoSettings),
        buttonLabel: 'Save & Start',
        filters: [{ name: 'Video', extensions: ['mp4'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

    if (!fout) {
      return console.warn('refusing to start process with empty output location');
    }

    // box in the range by one frame to account for browser frame inaccuracy
    const frameTime = (1 / (this.simpleVideoDetails?.fps || 60));
    const start = AppState.trimRange.start + frameTime;
    const end = Math.max(start + frameTime, AppState.trimRange.end - frameTime);

    try {
      const data = await TrimComms.startProcess(
        AppState.file,
        fout,
        { start, end },
        strategy,
        this.videoSettings,
        { volume: this.volume },
        this.videoDetails
      );

      eventList.global.process({
        type: strategy.type,
        tune: strategy.tune,
        resolution: this.videoSettings.height === 'original' ? this.simpleVideoDetails!.height : this.videoSettings.height,
        isResolutionChanged: this.videoSettings.height !== 'original',
        fps: this.videoSettings.fps === 'original' ? this.simpleVideoDetails!.fps : this.videoSettings.fps,
        isFPSChanged: this.videoSettings.fps !== 'original',
        processSpeed: FFHelpers.encodingSpeedPresets[strategy.speed],
        volume: this.volume,
      });

      this.setFileOut(fout);
      this.setProcessingID(data.id);
    } catch (e) {
      this.setError(e);
    }
  }

}

export const ProcessStore = new ProcessStoreClass();

// @ts-ignore
window.ProcessStore = ProcessStore;
