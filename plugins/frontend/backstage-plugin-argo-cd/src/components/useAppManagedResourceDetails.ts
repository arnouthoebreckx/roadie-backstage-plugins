/*
 * Copyright 2021 Larder Software Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { configApiRef, errorApiRef, useApi } from '@backstage/core-plugin-api';
import { useAsyncRetry } from 'react-use';
import { argoCDApiRef } from '../api';

export const useAppManagedResourceDetails = ({
  appName,
  url,
}: {
  appName?: string;
  projectName?: string;
  url: string;
}) => {
  const api = useApi(argoCDApiRef);
  const errorApi = useApi(errorApiRef);
  const configApi = useApi(configApiRef);

  const { loading, value, error, retry } = useAsyncRetry(async () => {
    const argoSearchMethod: boolean = Boolean(
      configApi.getOptionalConfigArray('argocd.appLocatorMethods')?.length,
    );
    try {
      if (!argoSearchMethod && appName) {
        return await api.getAppManagedResourcesDetails({ url, appName });
      }
      if (argoSearchMethod && appName) {
        const kubeInfo = await api.serviceLocatorUrl({
          appName: appName as string,
        });
        if (kubeInfo instanceof Error) return kubeInfo;
        const promises = kubeInfo.map(async (instance: any) => {
          const apiOut = await api.getAppManagedResourcesDetails({
            url,
            appName,
            instance: instance.name,
          });
          // if (!apiOut.name) {
          //   return {
          //     name: "unknown"
          //   };
          // }
          return apiOut.items[0];
        });
        return await Promise.all(promises);
      }
      return Promise.reject('No appName is provided');
    } catch (e: any) {
      errorApi.post(new Error(e));
      return Promise.reject(e);
    }
  });
  return {
    loading,
    value,
    error,
    retry,
  };
};
