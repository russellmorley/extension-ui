import { createContext } from 'react';
import { AsyncTask } from './utils/async-task.util';
import { IService } from 'paranext-extension-dashboard';

export type Environment = {
  getServiceHooks: () => IService[];
  asyncTask: AsyncTask | undefined
};

export const EnvironmentContext = createContext({} as Environment);
