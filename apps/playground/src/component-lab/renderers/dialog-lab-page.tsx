import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import type { RendererEnv } from '@nop-chaos/flux-core';

const basicDialog = {
  type: 'page',
  body: [
    { type: 'text', text: 'Click the button to open a simple informational dialog.' },
    {
      type: 'button',
      label: 'Open Dialog',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Example Dialog',
          body: [
            { type: 'text', text: 'This is the dialog body content.' },
            { type: 'text', text: 'Dialogs support body and actions regions.' },
          ],
          actions: [{ type: 'button', label: 'Close', onClick: { action: 'closeSurface' } }],
        },
      },
    },
  ],
};

const formDialog = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Edit Contact',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Edit Contact',
          body: [
            {
              type: 'form',
              body: [
                { type: 'input-text', name: 'name', label: 'Full Name' },
                { type: 'input-email', name: 'email', label: 'Email' },
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Confirm',
                  onClick: { action: 'closeSurface' },
                },
                {
                  type: 'button',
                  label: 'Cancel',
                  variant: 'outline',
                  onClick: { action: 'closeSurface' },
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

/**
 * Real-browser regression scenario for dialog form edit. Mirrors the nop-entropy
 * edit-user chain: loadAction loads original values → user edits a field →
 * submitAction.args.data uses an explicit `${field}` template → the submitted
 * payload must carry the EDITED value, not the loaded one.
 *
 * The probe fetcher records the submitted payload to `window.__editSubmitProbe`
 * so the e2e can assert on it. jsdom unit tests cannot reproduce this
 * (see docs/bugs/73-...); only a real browser can.
 */
const editSubmitProbeFetcher = (async (api: { url?: string; data?: unknown }) => {
  const url = api.url ?? '';
  if (url.includes('Record__get')) {
    return {
      ok: true,
      status: 200,
      data: { userName: 'RowUser', status: 1, nickName: 'Original', email: 'old@x.com', phone: '111', remark: 'orig remark' },
    };
  }
  if (url.includes('Record__update')) {
    (window as unknown as { __editSubmitProbe?: unknown }).__editSubmitProbe = api.data;
    return { ok: true, status: 200, data: api.data };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];

// 异步 dict 加载（模拟真实后端 DictProvider 延迟）
const editSubmitProbeLoadDict = (async (_name: string) => {
  await new Promise((r) => setTimeout(r, 500));
  return {
    name: 'obj/TestStatus',
    options: [
      { label: '1-正常', value: 1 },
      { label: '2-停用', value: 2 },
    ],
  };
}) as unknown as RendererEnv['loadDict'];

const editSubmitDialog = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Edit Record',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Edit Record',
          body: {
            type: 'form',
            name: 'edit',
            mode: 'horizontal',
            submitScope: 'surface',
            loadAction: {
              action: 'ajax',
              args: { url: '/r/Record__get', method: 'post', includeScope: '*' },
            },
            submitAction: {
              action: 'ajax',
              args: {
                url: '/r/Record__update',
                method: 'post',
                data: {
                  userName: '${userName}',
                  status: '${status}',
                  nickName: '${nickName}',
                  email: '${email}',
                  phone: '${phone}',
                  remark: '${remark}',
                },
              },
            },
            onSubmitSuccess: [{ action: 'closeSurface' }],
            body: [
              {
                type: 'scope-debug',
                title: 'Edit Form Scope',
                defaultExpand: true,
                testid: 'edit-form-scope',
              },
              {
                type: 'tabs',
                id: 'edit-tabs',
                items: [
                  {
                    title: '基本信息',
                    body: [
                      { type: 'input-text', name: 'userName', label: 'User Name' },
                      {
                        type: 'select',
                        name: 'status',
                        label: 'Status',
                        dict: 'obj/TestStatus',
                      },
                      { type: 'input-text', name: 'nickName', label: 'Nick Name' },
                      { type: 'input-text', name: 'email', label: 'Email' },
                      { type: 'input-text', name: 'phone', label: 'Phone' },
                    ],
                  },
                  {
                    title: '扩展信息',
                    body: [{ type: 'textarea', name: 'remark', label: 'Remark' }],
                  },
                ],
              },
            ],
            actions: [
              {
                type: 'button',
                label: 'OK',
                level: 'primary',
                onClick: { action: 'submitForm', then: { action: 'closeSurface' } },
              },
            ],
          },
        },
      },
    },
  ],
};


const realSchemaDialog = {"type": "button", "label": "Edit (real schema)", "level": "primary", "onClick": {"action": "openDialog", "args": {"title": "Edit (real schema)", "body": {"type": "form", "name": "edit", "id": "edit", "mode": "horizontal", "submitScope": "surface", "loadAction": {"action": "ajax", "args": {"url": "/r/Record__get", "method": "post", "includeScope": "*", "selection": "id,userId,userName,status,status_label,nickName,dept{deptName},deptId,avatar,avatarComponentFileStatus{externalPath,fileId,fileSize,lastModified,name,permissions,previewPath,size},userType,userType_label,gender,gender_label,email,phone,expireAt,changePwdAtLogin,idType,idNbr,birthday,workNo,position{name},positionId,telephone,remark"}}, "api": {"data": {"userName": "${userName}", "status": "${status}", "nickName": "${nickName}", "deptId": "${deptId}", "avatar": "${avatar}", "userType": "${userType}", "gender": "${gender}", "email": "${email}", "phone": "${phone}", "expireAt": "${expireAt}", "changePwdAtLogin": "${changePwdAtLogin}", "idType": "${idType}", "idNbr": "${idNbr}", "birthday": "${birthday}", "workNo": "${workNo}", "positionId": "${positionId}", "telephone": "${telephone}", "remark": "${remark}"}, "url": "/r/Record__update", "withFormData": true}, "submitAction": {"action": "ajax", "args": {"url": "/r/Record__update", "method": "post", "data": {"userName": "${userName}", "status": "${status}", "nickName": "${nickName}", "deptId": "${deptId}", "avatar": "${avatar}", "userType": "${userType}", "gender": "${gender}", "email": "${email}", "phone": "${phone}", "expireAt": "${expireAt}", "changePwdAtLogin": "${changePwdAtLogin}", "idType": "${idType}", "idNbr": "${idNbr}", "birthday": "${birthday}", "workNo": "${workNo}", "positionId": "${positionId}", "telephone": "${telephone}", "remark": "${remark}"}}}, "onSubmitSuccess": [{"type": "action", "action": "refreshNearest"}], "body": [{"type": "tabs", "id": "edit-tabs", "items": [{"title": "基本信息", "name": "baseInfo", "key": "baseInfo", "body": [{"type": "flex", "id": "row-userName-status", "body": [{"name": "userName", "label": "用户名", "required": true, "readOnly": true, "type": "text"}, {"name": "status", "label": "用户状态", "required": true, "type": "select", "searchable": true, "clearable": true, "multiple": false, "dict": "auth/user-status"}]}, {"type": "flex", "id": "row-nickName-deptId", "body": [{"name": "nickName", "label": "昵称", "required": true, "type": "input-text", "clearable": true, "validations": {"maxLength": 50}}, {"name": "deptId", "label": "所属部门", "type": "tree-select", "clearable": true, "source": {"url": "@query:NopAuthDept__findList/value:id,label:deptName,%0A%20children%20@TreeChildren(max:5)?filter_parentId=__null"}}]}, {"type": "flex", "id": "row-avatar", "body": {"name": "avatar", "label": "头像", "type": "input-file", "accept": "image/*", "receiver": "/f/upload?bizObjName=NopAuthUser&fieldName=avatar", "useChunk": false}}, {"type": "flex", "id": "row-userType-gender", "body": [{"name": "userType", "label": "用户类型", "required": true, "type": "select", "searchable": true, "clearable": true, "multiple": false, "dict": "auth/user-type"}, {"name": "gender", "label": "性别", "required": true, "type": "select", "searchable": true, "clearable": true, "multiple": false, "dict": "auth/gender"}]}, {"type": "flex", "id": "row-email-phone", "body": [{"name": "email", "label": "邮件", "type": "input-text", "clearable": true, "validations": {"isEmail": true, "maxLength": 100}}, {"name": "phone", "label": "电话", "type": "input-text", "clearable": true, "validations": {"isPhoneNumber": true, "maxLength": 50}}]}, {"type": "flex", "id": "row-expireAt-changePwdAtLogin", "body": [{"name": "expireAt", "label": "用户过期时间", "type": "input-datetime", "format": "YYYY-MM-DD HH:mm:ss"}, {"name": "changePwdAtLogin", "label": "登陆后立刻修改密码", "type": "switch", "trueValue": 1, "falseValue": 0}]}]}, {"title": "扩展信息", "name": "extInfo", "key": "extInfo", "body": [{"type": "flex", "id": "row-idType-idNbr", "body": [{"name": "idType", "label": "证件类型", "type": "input-text", "clearable": true, "validations": {"maxLength": 10}}, {"name": "idNbr", "label": "证件号", "type": "input-text", "clearable": true, "validations": {"maxLength": 100}}]}, {"type": "flex", "id": "row-birthday-workNo", "body": [{"name": "birthday", "label": "生日", "type": "input-date", "format": "YYYY-MM-DD"}, {"name": "workNo", "label": "工号", "type": "input-text", "clearable": true, "validations": {"maxLength": 100}}]}, {"type": "flex", "id": "row-positionId-telephone", "body": [{"type": "picker", "valueField": "positionId", "labelField": "name", "size": "lg", "modalSize": "lg", "source": {"valueField": "positionId", "labelField": "name", "includeScope": "*", "url": "@query:NopAuthPosition__findPage", "gql:selection": "{@pageSelection}", "selection": "total,page,items{ id,positionId,name,createdBy,remark }"}, "pickerSchema": {"name": "crud-grid", "id": "crud-grid", "toolbar": [], "footerToolbar": [{"type": "statistics"}, {"type": "pagination"}], "loadAction": {"action": "ajax", "args": {"includeScope": "*", "url": "@query:NopAuthPosition__findPage", "gql:selection": "{@pageSelection}", "selection": "total,page,items{ id,positionId,name,createdBy,remark }"}}, "columns": [{"name": "name", "label": "名称", "sortable": true, "toggled": true, "fixed": "left", "type": "text"}, {"name": "createdBy", "label": "创建人", "sortable": true, "toggled": true, "type": "text"}, {"name": "remark", "label": "备注", "sortable": true, "toggled": true, "type": "text"}]}, "name": "positionId", "label": "职务", "joinValues": false, "extractValue": true, "multiple": false}, {"name": "telephone", "label": "座机", "type": "input-text", "clearable": true, "validations": {"maxLength": 50}}]}, {"type": "flex", "id": "row-remark", "body": {"name": "remark", "label": "备注", "type": "textarea", "minRows": 3}}]}]}]}, "actions": [{"type": "button", "id": "_default_cancel", "label": "取消", "onClick": {"action": "closeSurface"}}, {"type": "button", "id": "_default_submit", "label": "确定", "level": "primary", "onClick": {"action": "submitForm", "then": {"action": "closeSurface"}}}]}}};

const realSchemaFetcher = (async (api: { url?: string; data?: unknown }) => {
  const url = api.url ?? '';
  // 模拟异步数据源成功加载（tree-select / picker），触发 form 重渲染
  if (url.includes('NopAuthDept__findList')) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, status: 200, data: { items: [{ id: 'D1', deptName: 'Dev' }] } };
  }
  if (url.includes('NopAuthPosition__findPage')) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, status: 200, data: { total: 1, items: [{ id: 'P1', positionId: 'P1', name: 'Engineer' }] } };
  }
  if (url.includes('Record__get')) {
    return { ok: true, status: 200, data: {
      id: '1', userId: '1', userName: 'RowUser', status: 1, status_label: '1-正常',
      nickName: 'Original', deptId: null, dept: { deptName: 'Dev' }, avatar: null,
      userType: 1, userType_label: '1-普通用户', gender: 1, gender_label: '1-男',
      email: 'old@x.com', phone: '111', expireAt: null, changePwdAtLogin: 0,
      idType: null, idNbr: null, birthday: null, workNo: null, positionId: null,
      position: { name: 'Engineer' }, telephone: null, remark: 'orig',
    } };
  }
  if (url.includes('Record__update')) {
    (window as unknown as { __editSubmitProbe?: unknown }).__editSubmitProbe = api.data;
    return { ok: true, status: 200, data: api.data };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];


const crudRowEditFetcher = (async (api: { url?: string; data?: unknown }) => {
  const url = api.url ?? '';
  if (url.includes('__get')) {
    return { ok: true, status: 200, data: {
      id: '1', userId: '1', userName: 'RowUser', status: 1, status_label: '1-正常',
      nickName: 'Original', deptId: null, dept: { deptName: 'Dev' }, avatar: null,
      userType: 1, userType_label: '1-普通用户', gender: 1, gender_label: '1-男',
      email: 'old@x.com', phone: '111', expireAt: null, changePwdAtLogin: 0,
      idType: null, idNbr: null, birthday: null, workNo: null, positionId: null,
      position: { name: 'Engineer' }, telephone: null, remark: 'orig',
    } };
  }
  if (url.includes('__update')) {
    (window as unknown as { __crudRowEditProbe?: unknown }).__crudRowEditProbe = api.data;
    return { ok: true, status: 200, data: api.data };
  }
  if (url.includes('__findPage') || url.includes('__findList')) {
    return { ok: true, status: 200, data: { total: 1, items: [{ id: '1' }] } };
  }
  return { ok: true, status: 200, data: null };
}) as unknown as RendererEnv['fetcher'];

const crudRowEditDialog = {
  type: 'page',
  body: [
    {
      type: 'crud',
      id: 'row-edit-crud',
      name: 'rowEditCrud',
      rowKey: 'id',
      // 行数据 7 列（模拟 CRUD 列表 selection）
      source: [
        { id: '1', userName: 'RowUser', status: 1, nickName: 'RowNick', deptId: null, userType: 1, gender: 1, phone: '999' },
      ],
      columns: [
        { name: 'userName', label: 'User Name' },
        { name: 'nickName', label: 'Nick' },
        { type: 'operation', label: 'Actions', buttons: [
          {
            type: 'dropdown-button',
            label: 'More',
            items: [
              {
                id: 'row-update-button',
                label: 'Edit Row',
                onClick: {
                  action: 'openDialog',
                  args: {
                    title: 'Edit Row',
                    body: {
                      type: 'form',
                      id: 'row-edit-form',
                      name: 'edit',
                      submitScope: 'surface',
                      loadAction: {
                        action: 'ajax',
                        args: { url: '/r/User__get?id=${$slot.record.id}', method: 'post', includeScope: '*' },
                      },
                      submitAction: {
                        action: 'ajax',
                        args: {
                          url: '/r/User__update?id=${$slot.record.id}',
                          method: 'post',
                          data: {
                            userName: '${userName}',
                            status: '${status}',
                            nickName: '${nickName}',
                            email: '${email}',
                            phone: '${phone}',
                          },
                        },
                      },
                      onSubmitSuccess: [{ action: 'closeSurface' }],
                      body: [{ type: 'input-text', name: 'nickName', label: 'Nick' }],
                      actions: [
                        { type: 'button', label: 'OK', level: 'primary', onClick: { action: 'submitForm', then: { action: 'closeSurface' } } },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ] },
      ],
    },
  ],
};
export function DialogLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Modal dialog with body and actions regions. Triggered via the dialog action from any onClick handler."
      scenarios={[
        {
          title: 'Informational dialog',
          description:
            'Click "Open Dialog" to see a basic dialog with text body and a close button.',
          schema: basicDialog,
        },
        {
          title: 'Dialog with form fields and writeback',
          description:
            'Click "Edit Contact" to open a dialog with a form. Confirm/Cancel close the dialog surface.',
          schema: formDialog,
        },
        {
          title: 'Edit dialog submits edited field value',
          description:
            'Real-browser regression for dialog form edit: loadAction loads original, user edits, submitAction.args.data uses ${field} template. Verifies the EDITED value (not the loaded one) is submitted. Mirrors nop-entropy edit-user e2e.',
          schema: editSubmitDialog,
          data: {
            // 模拟 CRUD 行数据上下文（列表列 7 个字段）
            id: '1',
            userName: 'RowUser',
            status: 1,
            nickName: 'RowNick',
            deptId: null,
            userType: 1,
            gender: 1,
            phone: '999',
          },
          env: { fetcher: editSubmitProbeFetcher, loadDict: editSubmitProbeLoadDict },
        },
        {
          title: 'Edit dialog real schema submits edited value',
          description: 'Real nop-entropy edit-user schema loaded verbatim (tabs + dict + 18 fields).',
          schema: realSchemaDialog,
          env: { fetcher: realSchemaFetcher, loadDict: editSubmitProbeLoadDict },
        },
        {
          title: 'CRUD row edit submits edited value',
          description: 'Real CRUD row-action structure: row data (7 cols) + openDialog + loadAction + ${field} submitAction.',
          schema: crudRowEditDialog,
          env: { fetcher: crudRowEditFetcher },
        },
      ]}
    />
  );
}
