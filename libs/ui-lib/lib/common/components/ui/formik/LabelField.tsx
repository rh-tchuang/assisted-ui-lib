import * as React from 'react';
import { useField } from 'formik';
import { FormGroup, Label, Stack, StackItem } from '@patternfly/react-core';
import TagsInput from 'react-tagsinput';
import { InputFieldProps } from './types';
import { getFieldId } from './utils';
import HelperText from './HelperText';

import './LabelField.css';
import { useTranslation } from '../../../hooks/use-translation-wrapper';

type LabelValueProps = {
  value: React.ReactText;
  onClose?: () => void;
};

export const LabelValue: React.FC<LabelValueProps> = ({ value, onClose }) => (
  <Label className="label-field__value" variant="outline" onClose={onClose}>
    {value}
  </Label>
);

type LabelFieldProps = InputFieldProps & {
  // eslint-disable-next-line
  onChange?: (tags: any[]) => void;
};

export const LabelField: React.FC<LabelFieldProps> = ({
  label,
  labelIcon,
  helperText,
  isRequired,
  onChange,
  validate,
  idPostfix,
  ...props
}) => {
  const { t } = useTranslation();
  const [input, setInput] = React.useState('');
  const [field, { touched, error }, { setValue, setTouched }] = useField({
    name: props.name,
    validate,
  });
  const fieldId = getFieldId(props.name, 'input', idPostfix);
  const isValid = !(touched && error);
  const errorMessage = !isValid ? error : '';
  const fieldHelperText = <HelperText fieldId={fieldId}>{helperText}</HelperText>;

  return (
    <Stack>
      <StackItem>
        <FormGroup
          fieldId={fieldId}
          label={label}
          helperText={fieldHelperText}
          helperTextInvalid={fieldHelperText}
          validated={isValid ? 'default' : 'error'}
          isRequired={isRequired}
          labelIcon={labelIcon}
        >
          {t(
            "ai:Enter key=value and then press 'enter' or 'space' or use a ',' to input the label.",
          )}
          <div className="co-search-input pf-c-form-control">
            <TagsInput
              {...field}
              onChange={(tags) => {
                setValue(tags);
                setInput('');
                onChange && onChange(tags);
                !touched && setTouched(true);
              }}
              addKeys={[13, 32, 188]}
              renderTag={({ tag, key, onRemove, getTagDisplayValue }) => (
                <LabelValue
                  key={key as number}
                  onClose={() => onRemove(key as number)}
                  value={getTagDisplayValue(tag)}
                />
              )}
              addOnBlur
              inputProps={{
                autoFocus: false,
                className: 'label-field__input',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                placeholder: field.value?.length ? '' : 'app=frontend',
                spellCheck: 'false',
                id: 'tags-input',
                value: input,
                // eslint-disable-next-line
                onChange: (e: any) => setInput(e.target.value),
                ['data-test']: 'tags-input',
              }}
            />
          </div>
        </FormGroup>
      </StackItem>
      <StackItem>
        {errorMessage && (
          <HelperText fieldId={fieldId} isError>
            {errorMessage}
          </HelperText>
        )}
      </StackItem>
    </Stack>
  );
};
