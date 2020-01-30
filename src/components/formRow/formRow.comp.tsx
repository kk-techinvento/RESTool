import React, { useState } from 'react';
import { orderBy } from 'natural-orderby';
import { toast } from 'react-toastify';

import { IConfigInputField, IConfigOptionSource } from '../../common/models/config.model';
import { Button } from '../button/button.comp';
import { withAppContext } from '../withContext/withContext.comp';
import { IAppContext } from '../app.context';
import { dataHelpers } from '../../helpers/data.helpers';

import './formRow.scss';

interface IProps {
  context: IAppContext
  field: IConfigInputField
  onChange: (fieldName: string, value: any, submitAfterChange?: boolean) => void
  showReset?: boolean
  direction?: 'row' | 'column'
}

export const FormRow = withAppContext(({ context, field, direction, showReset, onChange }: IProps) => {
  const [optionSources, setOptionSources] = useState<any>({});
  const { httpService, activePage } = context;
  const pageHeaders: any = activePage?.requestHeaders || {};

  async function loadOptionSourceFromRemote(fieldName: string, optionSource: IConfigOptionSource) {
    try {
      const { url, dataPath, actualMethod, requestHeaders } = optionSource;

      if (!url) {
        throw new Error(`URL option source (for field "${fieldName}") is empty.`);
      }

      const result = await httpService.fetch({
        method: actualMethod || 'get', 
        origUrl: url, 
        queryParams: [], 
        headers: Object.assign({}, pageHeaders,  requestHeaders || {}),
      });
      
      const extractedData = dataHelpers.extractDataByDataPath(result, dataPath);

      if (!extractedData || !extractedData.length) {
        throw new Error(`Option source data is empty (for field "${fieldName}")`);
      }

      // Map option source to fields
      const optionSourceData = extractedData.map((option: any, idx: number) => {
        const { valuePath, displayPath } = optionSource;

        if (typeof option === 'string') {
          return option;
        }

        return {
          display: displayPath && option[displayPath] ? option[displayPath] : `Option ${idx + 1}`,
          value: valuePath && option[valuePath] ? option[valuePath] : `${idx}`,
        };
      });

      setOptionSources({
        ...optionSources,
        [fieldName]: optionSourceData
      });
    } catch (e) {
      toast.error(e.message);
    }
  }

  function addItemToFieldArray(e: any, originalField: IConfigInputField) {
    e.preventDefault();

    onChange(field.name, [
      ...(originalField.value || []),
      ''
    ]);
  }

  function removeItemToFieldArray(originalField: IConfigInputField, idx: number) {
    const updatedArray = [
      ...(originalField.value || [])
    ];

    updatedArray.splice(idx, 1);

    onChange(field.name, updatedArray);
  }

  function renderArrayItems(originalField: IConfigInputField) {
    const array: any[] = originalField.value || [];

    return (
      <div className="array-form">
        {
          array.map((item, itemIdx) => {
            const inputField = renderFieldInput({
              value: item,
              name: `${originalField.name}.${itemIdx}`,
            } as IConfigInputField, (fieldName, value) => {
              const updatedArray = (originalField.value || []).map((localValue: any, idx: number) => {
                if (idx === itemIdx) {
                  return value;
                }
                return localValue;
              });
              
              onChange(originalField.name, updatedArray);
            });

            return (
              <div className="array-form-item" key={`array_form_${itemIdx}`}>
                {inputField}
                <i title="Clear" onClick={() => removeItemToFieldArray(originalField, itemIdx)} aria-label="Remove" className="clear-input fa fa-times"></i>
              </div>
            )
          })
        }
        <Button className="add-array-item" onClick={(e) => addItemToFieldArray(e, originalField)} title="Add Item">
          <i className="fa fa-plus" aria-hidden="true"></i>
        </Button>
      </div>
    );
  }

  function renderFieldInput(field: IConfigInputField, changeCallback: (fieldName: string, value: any, submitAfterChange?: boolean) => void) {
    const inputProps = (defaultPlaceholder: string = '') => {
      return {
        value: field.value,
        placeholder: field.placeholder || defaultPlaceholder,
        disabled: field.readonly, 
        required: field.required,
        onChange: (e: any) => changeCallback(field.name, e.target.value), 
      };
    };

    switch (field.type) {
      case 'date':
        //kk-1042
        return <input type="date" {...inputProps()} onChange={(e) => changeCallback(field.name, e.target.value+"T00:00:01.000Z")} value={field.value.substr(0, 10)}/>;
      case 'time':
        //kk-1042
        return <input type="time" {...inputProps()} onChange={(e) => changeCallback(field.name, "9999-12-31T"+e.target.value+":01.000Z")} value={(field.value.substr(0, 16)).substr(11)}/>;
      case 'datetime':
        //kk-1042
        return <input type="datetime-local" {...inputProps()} onChange={(e) => changeCallback(field.name, e.target.value+":01.000Z")} value={field.value.substr(0, 16)}/>;
      case 'boolean':
        return <input type="checkbox" {...inputProps()} checked={field.value} onChange={(e) => changeCallback(field.name, e.target.checked, true)} />;
      case 'select':
        {
          const { optionSource } = field;

          if (optionSource && !optionSources[field.name]) {
            loadOptionSourceFromRemote(field.name, optionSource);
            return <select><option>-- Loading Options... --</option></select>
          }

          const sortBy = field.optionSource?.sortBy;
          const finalOptions: { value: string, display: string }[] = optionSources[field.name] || field.options || [];
          const sortedOptions = orderBy(finalOptions, typeof sortBy === 'string' ? [sortBy] : (sortBy || []));

          return (
            <select {...inputProps()}>
              <option>-- Select --</option>
              {
                sortedOptions.map((option, idx) => {
                  const key = `option_${idx}_`;
                  if (typeof option !== 'object') {
                    return <option key={`${key}_${option}`} value={option}>{option}</option>  
                  }
                  return <option key={`${key}_${option.value}`} value={option.value}>{option.display || option.value}</option>
                })
              }
            </select>
          );
        };
      case 'object':
        return <textarea {...inputProps('Enter JSON...')}></textarea>;
      case 'array': {
        const { arrayType, value } = field;
        if (!value || !arrayType || arrayType === 'object') {
          return <textarea {...inputProps('Enter JSON array...')}></textarea>;
        }
        return renderArrayItems(field);
      }
      case 'long-text':
        return <textarea {...inputProps('Enter text...')}></textarea>;
      case 'number':
      case 'integer':
        if(field.foreignKey){
          field.value = field.foreignKeyValue;
          return <input type="number"  {...inputProps('0')} onChange={(e) => changeCallback(field.name, e.target.valueAsNumber)} value={field.value} disabled/>;
        }
        return <input type="number"  {...inputProps('0')} onChange={(e) => changeCallback(field.name, e.target.valueAsNumber)} />;
      case 'color':
        return <input type="color" {...inputProps('Enter color...')}/>;
      case 'email':
        return <input type="email" {...inputProps('Enter email...')}/>;
      case 'password':
        return <input type="password" {...inputProps('Enter password...')}/>;
      case 'hidden':
        return <input type="hidden" value={field.value} />;
      case 'file':
        return <input type="file" accept={field.accept || '*'} placeholder={field.placeholder || 'Select file...'} name={field.name || 'file'} disabled={field.readonly} required={field.required} />;
      case 'note':
        return <p className="note">{field.value}</p>;
      case 'text':
      default:
        return <input type="text" {...inputProps('Enter text...')}/>;
    }
  }
  
  return (
    <div className={`form-row ${direction || 'row'}`}>
      <label>{field.label || field.originalName}{field.required ? ' *' : ''}</label>
      {renderFieldInput(field, onChange)}
      {
        (showReset && !field.readonly && field.value && field.value.length > 0) &&
        <i title="Clear" onClick={() => onChange(field.name, '', true)} aria-label="Clear" className="clear-input fa fa-times"></i>
      }
    </div>
  );
});