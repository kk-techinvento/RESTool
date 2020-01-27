import React, { useState } from 'react';

import { TConfigDisplayField, IConfigDisplayField, IConfigCustomAction, IConfigPostMethod } from '../../common/models/config.model';
import { dataHelpers } from '../../helpers/data.helpers';
import { FormPopup } from '../formPopup/formPopup.comp';
import { Button } from '../button/button.comp';
import HttpService from '../../services/http.service';

import './cards.scss';

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

export const Cards = ({ items, fields, callbacks, customActions , framePostConfig, httpService, pageHeaders}: IProps) => {
  const [openedPopup, setOpenedPopup] = useState<null | IPopupProps>(null);
  const [postConfig, setPostConfig] = useState<null | IConfigPostMethod>(null);
  function closeFormPopup() {
    setOpenedPopup(null);
  }
  function renderRow(type: TConfigDisplayField, value: any) {
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
    <div className="cards-wrapper">
      {
        items.map((item, cardIdx) => {
          return (
            /* kk-1042 */
            <div className="card card-col-3" key={`card_${cardIdx}`}>
              {
                fields.map((field, fieldIdx) => {
                  const value = dataHelpers.extractDataByDataPath(item, field.dataPath, field.name);
                  return (
                    <div className={`card-row ${field.type}`} key={`card_${cardIdx}_${fieldIdx}`}>
                      {
                        field.type !== 'image' &&
                        <label>{field.label || field.name}: </label>
                      }
                      {renderRow(field.type, value)}
                    </div>
                  );
                })
              }
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
                    <Button key={`action_${cardIdx}_${idx}`} onClick={() => callbacks.action(item, action)} title={action.name}>
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
                    <Button key={`actionPostConfig_${cardIdx}_${idx}`} onClick={() => {
                      // when we have foreign key, put it in as actionPostConfig.fields.push({name:"primary_key_name",type:"number", label:"primary_key_label"})
                      // NOTE: current table's primary key is foreign key for actionPostConfig table
                      setPostConfig(actionPostConfig);
                      if (postConfig) setOpenedPopup({ type: 'add', title: 'Add Item', config: postConfig, submitCallback: addItem })
                    }} title={"title"}>
                      <i className={`fa fa-${'cogs'}`} aria-hidden="true"></i>
                    </Button>
                  ))
                }
              </div>
            </div>
          );
        })
      }
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