import React, { PropsWithChildren } from 'react';
import { useSelector } from 'react-redux';
import { Form } from '@patternfly/react-core';
import {
  FieldArray,
  FieldArrayRenderProps,
  Formik,
  FormikConfig,
  useFormikContext,
  yupToFormErrors,
} from 'formik';
import isEqual from 'lodash-es/isEqual.js';
import { ErrorState, LoadingState, useAlerts, useFormikAutoSave } from '../../../../../common';
import { selectCurrentClusterPermissionsState } from '../../../../selectors';
import { CustomManifestsFormProps } from './propTypes';
import { CustomManifestValues, FormViewManifestFolder, ManifestFormData } from '../data/dataTypes';
import { getApiErrorMessage, handleApiError } from '../../../../api';
import useClusterCustomManifests from '../../../../hooks/useClusterCustomManifests';
import { ClustersService } from '../../../../services';
import { CustomManifestsArray } from './CustomManifestsArray';

const fieldName = 'manifests';

const AutosaveWithParentUpdate = ({
  onFormStateChange,
  getEmptyValues,
}: {
  onFormStateChange: CustomManifestsFormProps['onFormStateChange'];
  getEmptyValues: CustomManifestsFormProps['getEmptyValues'];
}) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emptyValues = React.useMemo(() => getEmptyValues(), []);
  const { isSubmitting, isValid, touched, errors, values } = useFormikContext<ManifestFormData>();
  const isEmpty = React.useMemo<boolean>(() => {
    return isEqual(values, emptyValues);
  }, [values, emptyValues]);
  const isAutoSaveRunning = useFormikAutoSave();

  React.useEffect(() => {
    onFormStateChange({ isSubmitting, isAutoSaveRunning, isValid, touched, errors, isEmpty });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitting, isValid, isAutoSaveRunning, touched, errors]);

  return null;
};

const getManifestDetails = (
  updatedManifest: CustomManifestValues,
): {
  folderName: FormViewManifestFolder;
  fileName: string | undefined;
} => {
  const existingFolderByFakeId = updatedManifest.fakeId?.substring(
    0,
    updatedManifest.fakeId.indexOf('#'),
  );
  const existingFolder: FormViewManifestFolder =
    existingFolderByFakeId === 'manifests' || existingFolderByFakeId === 'openshift'
      ? existingFolderByFakeId
      : 'manifests';
  const existingFileName = updatedManifest.fakeId?.substring(
    updatedManifest.fakeId.indexOf('#') + 1,
  );

  return {
    folderName: existingFolder,
    fileName: existingFileName,
  };
};

export const CustomManifestsForm = ({
  onFormStateChange,
  getEmptyValues,
  cluster,
  getInitialValues,
  validationSchema,
}: PropsWithChildren<CustomManifestsFormProps>) => {
  const { isViewerMode } = useSelector(selectCurrentClusterPermissionsState);
  const [initialValues, setInitialValues] = React.useState<ManifestFormData | undefined>();
  const { addAlert, clearAlerts } = useAlerts();
  const { customManifests, isLoading, error } = useClusterCustomManifests(cluster.id || '', true);
  React.useEffect(() => {
    if (customManifests) {
      setInitialValues(getInitialValues(customManifests));
    }
  }, [customManifests, getInitialValues]);

  const handleSubmit: FormikConfig<ManifestFormData>['onSubmit'] = React.useCallback(
    async (values, actions) => {
      clearAlerts();
      actions.setSubmitting(true);
      try {
        const manifests = values.manifests;
        const manifestsModified = manifests.filter(
          (manifest) =>
            !customManifests?.some(
              (customManifest) =>
                customManifest.folder === manifest.folder &&
                customManifest.fileName === manifest.filename &&
                customManifest.yamlContent === manifest.manifestYaml,
            ),
        );
        if (cluster && manifestsModified.length > 0) {
          //See if manifests exists previously to make a patch or create a new one
          const manifestsThatExists = manifestsModified.filter(
            (manifest) => manifest.fakeId !== '',
          );
          const newManifestsToCreate = manifestsModified.filter(
            (manifest) => manifest.fakeId === '',
          );
          const manifestsRequests = manifestsThatExists.map((updatedManifest) => {
            const { folderName, fileName } = getManifestDetails(updatedManifest);

            const existingManifest: CustomManifestValues = {
              folder: folderName,
              filename: fileName || '',
              manifestYaml: '',
            };

            return ClustersService.updateCustomManifest(
              existingManifest,
              updatedManifest,
              cluster?.id,
            );
          });
          await Promise.all(manifestsRequests);

          if (newManifestsToCreate.length > 0) {
            await ClustersService.createClusterManifests(newManifestsToCreate, cluster?.id);
          }
        }
      } catch (e) {
        handleApiError(e, () =>
          addAlert({
            title: 'Failed to update the custom manifests',
            message: getApiErrorMessage(e),
          }),
        );
      } finally {
        actions.setSubmitting(false);
      }
    },
    [addAlert, clearAlerts, cluster, customManifests],
  );

  const onSubmit = isViewerMode ? () => Promise.resolve() : handleSubmit;

  const validate = (values: ManifestFormData) => {
    try {
      validationSchema.validateSync(values, { abortEarly: false, context: { values } });
      return {};
    } catch (error) {
      return yupToFormErrors(error);
    }
  };

  const renderManifests = React.useCallback(
    (arrayRenderProps: FieldArrayRenderProps) => (
      <CustomManifestsArray {...Object.assign({ clusterId: cluster.id }, arrayRenderProps)} />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (error) {
    return <ErrorState />;
  }

  if (isLoading || !initialValues) {
    return <LoadingState content="Loading custom manifests ..." />;
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={onSubmit}
      validate={validate}
      enableReinitialize
      validateOnMount
      validateOnChange
    >
      <Form>
        <FieldArray name={fieldName} render={renderManifests} />
        <AutosaveWithParentUpdate
          onFormStateChange={onFormStateChange}
          getEmptyValues={getEmptyValues}
        />
      </Form>
    </Formik>
  );
};
