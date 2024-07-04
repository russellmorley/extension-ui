import 'src/shared/utils/array-manipulations.util';

import React, { PropsWithChildren, useContext} from "react";
import {XValuesForY, XYValuesInfoInfoContext, XYValuesInfo, XValue, OnXYSelected, XY} from './xyvaluesinfo.context';
import { Result, Results, ResultsSelector} from "paranext-extension-dashboard";
import { groupBySelector } from 'src/shared/utils/array-manipulations.util';
import { EnvironmentContext } from './environment.context';
import { AquaMode, AquaStateManager, AquaStatePosition } from './aqua.statemanager';
import { Canon } from '@sillsdev/scripture';
import { Spinner } from '@chakra-ui/react';


export type NameType = "books" | "chapters";
export type XType = "chapters" | "verses";

export type AquaXYValuesDataContextParams = {
  stateManager: AquaStateManager;
}

export type ResultsInfo = {results: Results, resultsId: any, isLoading: boolean};
export interface IAquaServiceHooks {
  useResults: (
    resultsSelector: ResultsSelector,
    resultsId: any,
    dependencies: React.DependencyList) => ResultsInfo
}

const resultsToXYValuesInfo = (
  results: Result[],
  id: string,
  nameType: NameType,
  xType: XType,
  onXYSelected: OnXYSelected,
  highlightedXY?: XY): XYValuesInfo => {

  let min = 0;
  let max = 0;
  let mean = 0;
  let varianceAccumulator = 0;
  let count = 0;

  const xValuesForY = Object
    .entries(groupBySelector(results, (result: Result) => nameType === 'chapters' ? AquaStateManager.chapterFromVerseRef(result.vref) : AquaStateManager.bookFromVerseRef(result.vref)))
    .map<XValuesForY>(([name, results]) => (
      {
        yString: name,
        y: nameType === 'chapters' ? parseInt(name) : Canon.bookIdToNumber(name),
        values: results.map(result => {
          if (result.score) {
            count = count + 1;
            [mean, varianceAccumulator] = adjustMeanAndVarianceAccumulator(result.score, count, mean, varianceAccumulator);
            if (min > result.score)
              min = result.score;
            if (max < result.score)
              max = result.score;
          }
          return {
            x: xType === 'verses' ? AquaStateManager.verseNumFromVerseRef(result.vref) : AquaStateManager.chapterNumFromVerseRef(result.vref),
            value: result.score,
            originalDatum: result
          }})  as [XValue]
      } as XValuesForY
    ));
  console.debug(`${min} ${max} ${mean} ${varianceAccumulator/(count - 1)} ${count}`);
  return {
    id: id,
    xValuesForYs: xValuesForY,
    min: min,
    max: max,
    mean: mean,
    standardDeviation: Math.sqrt(varianceAccumulator / (count - 1)),
    highlightedXY: highlightedXY,
    onXYSelected: onXYSelected
  };
};

function adjustMeanAndVarianceAccumulator(newValue: number, count: number, priorMean: number, priorVarianceAccumulator: number) : [number, number] {
  if (count === 1) {
    priorMean = 0;
    priorVarianceAccumulator = 0;
  }
  const newMean = priorMean + (newValue - priorMean)/count;
  const newVarianceAccumulator = priorVarianceAccumulator + (newValue - priorMean)*(newValue - newMean);
  return [newMean, newVarianceAccumulator]
}


/**
 * This Component is responsible for obtaining, preparing, and providing data in 'XYValues' format 
 * in a XYValuesInfoInfoContext for descendent Components that consume XYValues. 
 * 
 * It requires:
 * 1. an EnvironmentContext that includes a single service that implements IAquaServiceHooks to obtain data in Results format, 
 * which it then converts to XYValues format.
 * 
 * It is responsible for:
 * 1. providing an XYValuesInfoInfoContext for descendent Components to obtain XYValuesInfo.
 * 
 * @param param0 
 * @returns 
 */
export function AquaXYValuesDataContext({ children, stateManager } : PropsWithChildren<AquaXYValuesDataContextParams>) {
  const environment = useContext(EnvironmentContext);

 
  const useServices = environment.getServiceHooks;
  const aquaServiceHooks = useServices()[0] as IAquaServiceHooks;
  const useResults = aquaServiceHooks.useResults;

  class SettingsWebviewState {
    assessment_id: string | undefined;
    version_id: string | undefined;

    constructor(init?: SettingsWebviewState) {
      Object.assign(this, init);
    }
  }
 const settings = window.getWebViewState<SettingsWebviewState>(
    '_settings', 
    new SettingsWebviewState({assessment_id: '211', version_id: '71'}));

  // if (!settings)
  //   return undefined;
  const assessmentId = settings.assessment_id;
  const versionId = settings.version_id;
  if (!assessmentId || !versionId)
    return undefined;

  const onXYSelected: OnXYSelected = (xyOriginalDatum) => {
    console.debug(`OnXYSelected xyOriginalDatum: ${JSON.stringify(xyOriginalDatum)}`);
    if (xyOriginalDatum) {
      // convert from series coordinates to bcv and setNextState.
      if (stateManager.currentState.mode === AquaMode.VerseResultsForBookChapters)
        stateManager.setNextState({chapterNum: xyOriginalDatum.y, verseNum: xyOriginalDatum.x, originalDatum: xyOriginalDatum.originalDatum});
      else if (stateManager.currentState.mode === AquaMode.ChapterResultsForBooks)
        stateManager.setNextState({bookNum: xyOriginalDatum.y} as AquaStatePosition);
      else
        throw new Error(`onXYSelected called even through AquaMode isn't VerseResultsForBookChapters or ChapterResultsForBooks`);
    }
  };

  function processUseResults([results, id]: Results, resultsId: any): XYValuesInfo {
    let xyValuesInfo = {
      id: "",
      xValuesForYs: [] as XValuesForY[],
      min: 0,
      max: 0,
      mean: 0,
      standardDeviation: 0,
      highlightedXY: undefined,
      onXYSelected: () => {}
    } as XYValuesInfo;
    if (stateManager.currentState.mode != resultsId)
      return xyValuesInfo;
    if (stateManager.currentState.mode === AquaMode.VerseResultsForBookChapters) {
      const highlightStatePosition = stateManager.getHighlightStatePosition();
      const highlightXY =
        highlightStatePosition?.bookNum &&
        highlightStatePosition?.chapterNum &&
        highlightStatePosition.verseNum &&
        stateManager.currentStateBook === Canon.bookNumberToId(highlightStatePosition.bookNum) ?
        {y: highlightStatePosition?.chapterNum, x: highlightStatePosition?.verseNum} :
        undefined;
  
      xyValuesInfo = resultsToXYValuesInfo(
        results,
        id,
        'chapters',
        'verses',
        onXYSelected,
        highlightXY
      );
    } else if (stateManager.currentState.mode === AquaMode.ChapterResultsForBooks) {
      const highlightStatePosition = stateManager.getHighlightStatePosition();
      const highlightXY =
        highlightStatePosition?.bookNum &&
        highlightStatePosition.chapterNum ?
        {y: highlightStatePosition?.bookNum, x: highlightStatePosition?.chapterNum} :
        undefined;
      xyValuesInfo = resultsToXYValuesInfo(
        results,
        id,
        'books',
        'chapters',
        onXYSelected,
        highlightXY
      );  
    } else if (stateManager.currentState.mode === AquaMode.VerseDetails) {
    }
    return xyValuesInfo;
  }

  let resultsSelector: ResultsSelector = {assessment_id: 0, book: ""}; 
  if (stateManager.currentState.mode === AquaMode.VerseResultsForBookChapters) {
    resultsSelector = {assessment_id: parseInt(assessmentId!), book: stateManager.currentStateBook};
  } else if (stateManager.currentState.mode === AquaMode.ChapterResultsForBooks) {
    resultsSelector = {assessment_id: parseInt(assessmentId!), aggregateByChapter: true};
  } else if (stateManager.currentState.mode === AquaMode.VerseDetails) {
  }
  const {results, resultsId, isLoading} = useResults(resultsSelector, stateManager.currentState.mode, [stateManager]);
  const xyValuesInfo = processUseResults(results, resultsId);

  return (
    <>
      <XYValuesInfoInfoContext.Provider value={xyValuesInfo}>
        {isLoading ? (
          <Spinner />
        ) : (
          children
        )}
      </XYValuesInfoInfoContext.Provider>
    </>
  );
}
