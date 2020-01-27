import React, { useState } from 'react';

import { IConfigPostMethod, TConfigDisplayField, IConfigDisplayField, IConfigCustomAction } from '../../common/models/config.model';
import { dataHelpers } from '../../helpers/data.helpers';
import { FormPopup } from '../formPopup/formPopup.comp';
import { Button } from '../button/button.comp';
import HttpService from '../../services/http.service';

import './table.scss';

interface IProps {
  items: any[]
  callbacks: {
    delete: (item: any) => void
    put: (item: any) => void
    action: (item: any, action: IConfigCustomAction) => void
  }
  fields: IConfigDisplayField[]
  customActions?: IConfigCustomAction[]
  framePostConfig?: IConfigPostMethod[] | undefined
  httpService: HttpService
  pageHeaders: any
}


interface IPopupProps {
  type: 'add' | 'update' | 'action'
  title: string
  config: IConfigPostMethod
  submitCallback: (body: any, containFiles: boolean) => void
  rawData?: {},
}


export const Table = ({ pageHeaders, httpService, items, fields, callbacks, customActions, framePostConfig }: IProps) => {
  const [openedPopup, setOpenedPopup] = useState<null | IPopupProps>(null);
  const [postConfig, setPostConfig] = useState<null | IConfigPostMethod>(null);
  function closeFormPopup() {
    setOpenedPopup(null);
  }
  function renderTableCell(type: TConfigDisplayField, value: any) {
    if (value && typeof value === 'object') {
      return 'object';
    }

    switch (type) {
      case 'text':
        return <span>{value}</span>;
      case 'date':
        //kk-1042
        return <span>{value ? value.substr(0, 10) : value}</span>;
      case 'time':
        //kk-1042
        return <span>{value ? (value.substr(0, 16)).substr(11) : value}</span>;
      case 'datetime':
        //kk-1042
        return <span>{new Date(value).toLocaleString()}</span>;
      case 'boolean':
        return <div className={`bool ${value ? 'true' : 'false'}`}></div>;
      case 'image':
        return <img src={value} alt={value} />;
      case 'url':
        return <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
      case 'colorbox':
        return <div className="colorbox" style={{ backgroundColor: value }}></div>;
      default:
        return value;
    }
  }

  async function addItem(body: any, containFiles?: boolean) {

    // if (framePostConfig) {
    //   try {
    //     const { url, requestHeaders, actualMethod } = framePostConfig;
    //     return await httpService.fetch({
    //       method: actualMethod || 'post',
    //       origUrl: url,
    //       body: containFiles ? body : JSON.stringify(body),
    //       headers: {
    //         ...pageHeaders,
    //         ...(requestHeaders || {}),
    //         ...(containFiles ? {} : { 'content-type': 'application/json' })
    //       },
    //       responseType: 'boolean'
    //     });
    //   } catch (error) {
    //     console.error("framePostConfig ", error);
    //   }
    // }

    if (!postConfig) {
      throw new Error('Post method is not defined.');
    }

    const { url, requestHeaders, actualMethod } = postConfig;

    return await httpService.fetch({
      method: actualMethod || 'post',
      origUrl: url,
      body: containFiles ? body : JSON.stringify(body),
      headers: {
        ...pageHeaders,
        ...(requestHeaders || {}),
        ...(containFiles ? {} : { 'content-type': 'application/json' })
      },
      responseType: 'boolean'
    });
  }

  return (
    <div className="table-wrapper">
      <table className="pure-table">
        <thead>
          <tr>
            {
              fields.map((field) => {
                return <th key={`th_${field.name}`}>{field.label || field.name}</th>;
              })
            }
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {
            items.map((item, rowIdx) => {
              return (
                <tr key={`tr_${rowIdx}`}>
                  {
                    fields.map((field, fieldIdx) => {
                      const value = dataHelpers.extractDataByDataPath(item, field.dataPath, field.name);
                      return <td key={`td_${rowIdx}_${fieldIdx}`}>{renderTableCell(field.type, value)}</td>
                    })
                  }
                  <td>
                    <div className="actions-wrapper">
                      {
                        callbacks.put &&
                        <Button onClick={() => callbacks.put(item)} title="Edit">
                          <i className="fa fa-pencil-square-o" aria-hidden="true"></i>
                        </Button>
                      }
                      {
                        (customActions && customActions.length > 0) &&
                        customActions.map((action, idx) => (
                          <Button key={`action_${rowIdx}_${idx}`} onClick={() => callbacks.action(item, action)} title={action.name}>
                            <i className={`fa fa-${action.icon || 'cogs'}`} aria-hidden="true"></i>
                          </Button>
                        ))
                      }
                      {
                        callbacks.delete &&
                        <Button onClick={() => callbacks.delete(item)} title="Delete">
                          <i className="fa fa-times" aria-hidden="true"></i>
                        </Button>
                      }
                    </div>
                    <div className="actions-wrapper">
                      {
                        (framePostConfig && framePostConfig.length) &&
                        framePostConfig.map((actionPostConfig, idx) => (
                          <Button key={`actionPostConfig_${rowIdx}_${idx}`} onClick={() => {
                            // when we have foreign key, put it in as actionPostConfig.fields.push({name:"primary_key_name",type:"number", label:"primary_key_label"})
                            // NOTE: current table's primary key is foreign key for actionPostConfig table
                            setPostConfig(actionPostConfig);
                            if(postConfig) setOpenedPopup({ type: 'add', title: 'Add Item', config: postConfig, submitCallback: addItem})
                          }} title={"title"}>
                            <i className={`fa fa-${'cogs'}`} aria-hidden="true"></i>
                          </Button>
                        ))
                      }
                    </div>
                  </td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
      {
        openedPopup &&
        <FormPopup
          title={openedPopup.title}
          closeCallback={closeFormPopup}
          submitCallback={openedPopup.submitCallback}
          fields={openedPopup.config?.fields || []}
          rawData={openedPopup.rawData}
        />
      }
    </div>
  );
}