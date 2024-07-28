import {AquaAppComponent} from "./aqua.app.component";
import { CurrentVerseContext } from './currentverse.context';
import React, { useCallback, useEffect, useState } from 'react';
import { useEvent } from 'platform-bible-react';
import {  DashboardVerseChangeEvent, IService, ParanextVerseChangeEvent, Result, Results, ResultsSelector } from 'paranext-extension-dashboard';
import { EnvironmentContext } from "./environment.context";
import { httpPapiFrontRequester } from "./utils/http.papifront.requester.util";
import { AsyncTask } from "./utils/async-task.util";

import papi from "@papi/frontend";

import { InputGroup, Input, InputRightElement, Button } from "@chakra-ui/react";
import { useData } from "@papi/frontend/react";
import { AquaService } from "src/shared/services/aqua.service";
import { IAquaServiceHooks, ResultsInfo } from "./aqua.xyvalues.datacontext";
import { IndexedDbPersist } from "./services/indexeddb.persist.service";

/**
 * Returns the single IAquaServiceHooks service needed by the AQuA application.
 * 
 */
function getServiceHooks(): IService[] {

  /**
   * An implementation of IAquaServiceHooks that makes requests to the AQuA 
   * endpoints from the browser/renderer itself.
   * 
   * It is not used for a paranext deploy, and is therefore not used here.
   * It would instead be used when the Application is used by a web portal, for example,
   * and is provided as an example.
   */
  const localAquaResultsService : IAquaServiceHooks = {
    useResults: (
      resultsSelector: ResultsSelector,
      resultsId: any,
      dependencies: React.DependencyList
    ): ResultsInfo => {
        
      const [results, setResults] = useState([[] as Result[], ''] as Results);
      const [isLoading, setIsLoading] = useState(false);
      const [id, setId] = useState();

      const persist = new IndexedDbPersist('assessments');
      const [aquaService] = useState(new AquaService(
        'https://fxmhfbayk4.us-east-1.awsapprunner.com/v2',
        {
          // mode: 'no-cors',
          headers: {
            "api_key": "7cf43ae52dw8948ddb663f9cae24488a4",
            // origin: "https://fxmhfbayk4.us-east-1.awsapprunner.com",
          },
          // credentials: "include",
        },
        httpPapiFrontRequester,
        persist,
      ));
      
      useEffect(() => {
        async function getResults() {
          try {
            await persist.openDb("aqua", 1);
            if (!isLoading)
              setIsLoading(true);
            const [results, id] = await aquaService.getResults(resultsSelector)
            if (!ignore) {
              setResults([results, id]);
              setId(resultsId);
            }
          } catch(e) {
            console.error(e);
          } finally {
            if (!ignore)
              setIsLoading(false);
          }
        }
        let ignore = false;
        getResults();
        return () => {
          ignore = true;
        }
      }, dependencies);
      return {results, resultsId: id, isLoading};
   }
  }

   /**
   * An implementation of IAquaServiceHooks that uses a DataProvider to make requests 
   * to the AQuA endpoints on its behalf.
   * 
   * It is the one used in this deploy.
   */
  const extensionAquaResultsService : IAquaServiceHooks = {
    useResults: 
      (resultsSelector: ResultsSelector, resultsId: any): ResultsInfo => {
          const [results, update, isLoading] = useData('aqua.results').ResultsFromStringSelector(JSON.stringify(resultsSelector), [[], ''])
          const id = resultsId;
          console.trace(`Values returned for selector ${JSON.stringify(resultsSelector)}: isLoading: ${isLoading}, resultsId (state from which results requested): ${resultsId}, resultsId: ${results[1]}, COUNT of results:${results[0].length}`);
          if (JSON.stringify(resultsSelector) === results[1])
            return {results, resultsId: id, isLoading};
          else
            return {results: [[], ''], resultsId: resultsId, isLoading: true};
      }
  };
  return [localAquaResultsService];
}

/**
 * This is an instance of the bootstrapper Component that sets up the runtime environment 
 * within which the Application runs. 
 * 
 * It is responsible for:
 * 1.  providing the Application with an EnvironmentContext that includes runtime environment-specific
 * implementations of the services it needs.
 * 
 * This specific bootstrapper Component sets up the runtime environment required for
 * the Application to run as a Paranext/platform.bible extension.
 * 
 */
globalThis.webViewComponent = function VerseAwareWebView() {
  const [verseRef, setVerseRef] = useState('GEN 1:2'); //FIXME: set back to '' once testing complete

  useEvent<DashboardVerseChangeEvent>(
    papi.network.getNetworkEvent('platform.dashboardVerseChange'),
    useCallback(({ verseRefString, verseOffsetIncluded }) => {
      setVerseRef(verseRefString);
      console.debug(`Received verse update from dashboard ${verseRefString} ${verseOffsetIncluded}`);
      }, []),
  );

  useEvent<ParanextVerseChangeEvent>(
    papi.network.getNetworkEvent('platform.paranextVerseChange'),
    useCallback(async ({ verseRefString, verseOffsetIncluded }) => {
      setVerseRef(verseRefString);
      console.debug(`Received verse update from paratext ${verseRefString} ${verseOffsetIncluded}`);
    }, []),
  );

  const [textInput, setTextInput] = useState('');
  const handleChange = (event: { target: { value: any; }; }) => {
    setTextInput(event.target.value);
  }

    
  let verseText = verseRef;
  return (
    <CurrentVerseContext.Provider value={verseRef}>
      <EnvironmentContext.Provider value={{getServiceHooks: getServiceHooks, asyncTask: new AsyncTask() }} >
        <InputGroup size='md'>
          <Input
            style={{
              width: '100%'
            }}
            pr='4.5rem'
            type={'text'}
            onChange={handleChange}
            placeholder='Navigate paranext to new verse, e.g. GEN 1:1'
          />
          {textInput.length > 6 && (
            <InputRightElement width='4.5rem'>
              <Button h='1.75rem' size='sm' onClick={async () => {
                  const start = performance.now();
                  const result = await papi.commands.sendCommand(
                    'platform.paranextVerseChange',
                    textInput,
                    1,
                  );
                }}>
                {'Go'}
              </Button>
            </InputRightElement>
          )}
        </InputGroup>
            {/* <input onChange={handleChange} placeholder={"Enter a verse ref, e.g. GEN 1:1"}></input>
            <Button
              onClick={async () => {
                const start = performance.now();
                const result = await papi.commands.sendCommand(
                  'platform.paranextVerseChange',
                  textInput,
                  1,
                );
              }}
            >
                Trigger verse change from paranext
            </Button> */}
        <AquaAppComponent />
      </EnvironmentContext.Provider>
    </CurrentVerseContext.Provider>
  );
}
