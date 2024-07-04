import { PropsWithChildren, useContext, useEffect, useState } from "react";
import { TokensTextRow, TokensTextRowsInfo, TokensTextRowsInfoContext } from "./tokenstextrows.context";
import { EnvironmentContext } from "./environment.context";
import { ICorpusService } from "src/shared/services/corpusinsights.service";

type DataContextParams = {
  verseRef: string;
};

export function CorpusInsightsTokensTextRowsDataContext({ children, verseRef } : PropsWithChildren<DataContextParams>) {
  const environment = useContext(EnvironmentContext);
  const [isLoading, setIsLoading] = useState(false);
  const [tokensTextRowsInfo, setTokensTextRowsInfo] = useState({tokensTextRows: [] as TokensTextRow[]} as TokensTextRowsInfo);
  
  const useServices = environment.getServiceHooks;
  const corpusService = useServices()[0] as ICorpusService;
  
  class SettingsWebviewState {
    tokenizedtextcorpus_id: string | undefined;
    tokenizedtextcorpus_name: string | undefined;
    versesbeforenumber: string | undefined;
    versesafternumber: string | undefined;
    
    constructor(init?: Partial<SettingsWebviewState>) {
      Object.assign(this, init);
    }
  }
  const settings = window.getWebViewState<SettingsWebviewState>(
    '_settings',
    new SettingsWebviewState({
      tokenizedtextcorpus_id: '32',
      tokenizedtextcorpus_name: 'ERV-AR',
      versesbeforenumber: '0',
      versesafternumber: '0',
    }));
  // if (!settings)
  //   return undefined;
  
  const tokenizedTextCorpusId = settings.tokenizedtextcorpus_id;
  const tokenizedTextCorpusName = settings.tokenizedtextcorpus_name ? settings.tokenizedtextcorpus_name : '<not set>';
  const versesBefore = settings.versesbeforenumber;
  const versesAfter = settings.versesafternumber;
  if (!tokenizedTextCorpusId)
    return undefined;

  let versesBeforeNumber: number;
  let versesAfterNumber: number;

  if (versesBefore !== undefined)
    versesBeforeNumber = parseInt(versesBefore);
  else
    versesBeforeNumber = 0;

    if (versesAfter !== undefined)
      versesAfterNumber = parseInt(versesAfter);
    else
      versesAfterNumber = 0;

  console.debug(`Verseref: ${verseRef}; tokenizedTextCorpusId: ${tokenizedTextCorpusId}, versesBefore: ${versesBefore}; versesAfter: ${versesAfter}`);

  useEffect(() => {
    async function getTokensTextRows() {
      try {
        if (!isLoading)
          setIsLoading(true);
        const tokensTextRowsInfo = await corpusService.getByVerseRange(tokenizedTextCorpusId!, tokenizedTextCorpusName, verseRef, versesBeforeNumber, versesAfterNumber);
        if (!ignore) {
          setTokensTextRowsInfo(tokensTextRowsInfo);
        }
      } catch(e) {
        console.error(e);
      } finally {
        if (!ignore)
          setIsLoading(false);
      }
    }
    let ignore = false;
    getTokensTextRows();
    return () => {
      ignore = true;
    }
  }, [verseRef]);

  return (
    <>
      <TokensTextRowsInfoContext.Provider value={tokensTextRowsInfo}>
        {children}
      </TokensTextRowsInfoContext.Provider>
    </>
  );
}
