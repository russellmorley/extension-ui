import papi, { DataProviderEngine } from "@papi/backend";
import { ExecutionToken, IDataProviderEngine } from "@papi/core";
import { UnsubscriberAsync } from 'platform-bible-utils';
import { DataProviderSetter } from "shared/models/data-provider.model";
import { AquaService, IAquaService} from "src/shared/services/aqua.service";
import type {
  AquaDataTypes,
  ResultsPromise,
  ResultsSelector,
} from 'paranext-extension-dashboard';
import {ExtensionStoragePersist} from '../services/extension-storage.persist.service';
import { httpPapiBackRequester } from "../utils/http.papiback.requester.util";

export class AquaDataProviderEngine
  extends DataProviderEngine<AquaDataTypes>
  implements IDataProviderEngine<AquaDataTypes>, IAquaService
{
  private static readonly PREFIX = 'aqua';
  private static readonly BASEURI = 'https://fxmhfbayk4.us-east-1.awsapprunner.com/v2';
  private static readonly PARAMSTOINCLUDE = {
    // mode: 'no-cors',
    headers: {
      "api_key": "7cf43ae52dw8948ddb663f9cae24488a4",
      // origin: "https://fxmhfbayk4.us-east-1.awsapprunner.com",
    },
    // credentials: "include",
  }

  aquaService: AquaService;

  constructor(executionToken: ExecutionToken) {
    super();

    this.aquaService = new AquaService(
      AquaDataProviderEngine.BASEURI,
      AquaDataProviderEngine.PARAMSTOINCLUDE,
      httpPapiBackRequester,
      new ExtensionStoragePersist(executionToken, AquaDataProviderEngine.PREFIX),
    );
  }
 async getResultsFromStringSelector(resultsSelectorString: string): ResultsPromise {
    return await this.getResults(JSON.parse(resultsSelectorString) as ResultsSelector);
  }

  @papi.dataProviders.decorators.ignore
  async getResults(resultsSelector: ResultsSelector): ResultsPromise {
    const results = await this.aquaService.getResults(resultsSelector);
    console.debug(`Dataprovider extension got ${results[0].length} results and is returning it to the client`);
    return results;
  }
  dispose?: UnsubscriberAsync | undefined;

  onDidDispose?: undefined;

  setResultsFromStringSelector: DataProviderSetter<AquaDataTypes, 'ResultsFromStringSelector'> = async () => false;
}
